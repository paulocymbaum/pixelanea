#include "export/sha256.hpp"

#include <array>
#include <fstream>
#include <iomanip>
#include <sstream>
#include <vector>

namespace pixelanea::bundle {

namespace {

constexpr std::array<uint32_t, 64> kRoundConstants = {
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf5, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2};

uint32_t rotr(uint32_t value, int bits) {
  return (value >> bits) | (value << (32 - bits));
}

void process_block(const uint8_t block[64], std::array<uint32_t, 8>& state) {
  std::array<uint32_t, 64> words{};
  for (int i = 0; i < 16; ++i) {
    words[i] = (static_cast<uint32_t>(block[i * 4]) << 24) |
               (static_cast<uint32_t>(block[i * 4 + 1]) << 16) |
               (static_cast<uint32_t>(block[i * 4 + 2]) << 8) |
               static_cast<uint32_t>(block[i * 4 + 3]);
  }
  for (int i = 16; i < 64; ++i) {
    const uint32_t s0 = rotr(words[i - 15], 7) ^ rotr(words[i - 15], 18) ^ (words[i - 15] >> 3);
    const uint32_t s1 = rotr(words[i - 2], 17) ^ rotr(words[i - 2], 19) ^ (words[i - 2] >> 10);
    words[i] = words[i - 16] + s0 + words[i - 7] + s1;
  }

  uint32_t a = state[0];
  uint32_t b = state[1];
  uint32_t c = state[2];
  uint32_t d = state[3];
  uint32_t e = state[4];
  uint32_t f = state[5];
  uint32_t g = state[6];
  uint32_t h = state[7];

  for (int i = 0; i < 64; ++i) {
    const uint32_t s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
    const uint32_t ch = (e & f) ^ ((~e) & g);
    const uint32_t temp1 = h + s1 + ch + kRoundConstants[i] + words[i];
    const uint32_t s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
    const uint32_t maj = (a & b) ^ (a & c) ^ (b & c);
    const uint32_t temp2 = s0 + maj;

    h = g;
    g = f;
    f = e;
    e = d + temp1;
    d = c;
    c = b;
    b = a;
    a = temp1 + temp2;
  }

  state[0] += a;
  state[1] += b;
  state[2] += c;
  state[3] += d;
  state[4] += e;
  state[5] += f;
  state[6] += g;
  state[7] += h;
}

std::array<uint8_t, 32> sha256_digest(const uint8_t* data, std::size_t size) {
  std::array<uint32_t, 8> state = {0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
                                    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19};

  const std::size_t full_blocks = size / 64;
  for (std::size_t block_index = 0; block_index < full_blocks; ++block_index) {
    process_block(data + block_index * 64, state);
  }

  std::array<uint8_t, 64> tail{};
  const std::size_t remainder = size % 64;
  if (remainder > 0) {
    std::copy(data + full_blocks * 64, data + full_blocks * 64 + remainder, tail.begin());
  }
  tail[remainder] = 0x80;

  if (remainder >= 56) {
    process_block(tail.data(), state);
    tail.fill(0);
  }

  const uint64_t bit_length = static_cast<uint64_t>(size) * 8;
  for (int i = 0; i < 8; ++i) {
    tail[63 - i] = static_cast<uint8_t>((bit_length >> (i * 8)) & 0xFF);
  }
  process_block(tail.data(), state);

  std::array<uint8_t, 32> digest{};
  for (int i = 0; i < 8; ++i) {
    digest[i * 4] = static_cast<uint8_t>((state[i] >> 24) & 0xFF);
    digest[i * 4 + 1] = static_cast<uint8_t>((state[i] >> 16) & 0xFF);
    digest[i * 4 + 2] = static_cast<uint8_t>((state[i] >> 8) & 0xFF);
    digest[i * 4 + 3] = static_cast<uint8_t>(state[i] & 0xFF);
  }
  return digest;
}

std::string digest_to_hex(const std::array<uint8_t, 32>& digest) {
  std::ostringstream out;
  out << std::hex << std::setfill('0');
  for (const uint8_t byte : digest) {
    out << std::setw(2) << static_cast<int>(byte);
  }
  return out.str();
}

}  // namespace

std::string sha256_hex(const uint8_t* data, std::size_t size) {
  return digest_to_hex(sha256_digest(data, size));
}

std::string sha256_hex_file(const std::filesystem::path& path) {
  std::ifstream input(path, std::ios::binary);
  if (!input) {
    return {};
  }
  const std::vector<uint8_t> bytes((std::istreambuf_iterator<char>(input)),
                                   std::istreambuf_iterator<char>());
  return digest_to_hex(sha256_digest(bytes.data(), bytes.size()));
}

}  // namespace pixelanea::bundle
