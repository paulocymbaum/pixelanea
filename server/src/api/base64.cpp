#include "api/base64.hpp"

namespace pixelanea::api {

namespace {

int decode_base64_char(char c) {
  if (c >= 'A' && c <= 'Z') {
    return c - 'A';
  }
  if (c >= 'a' && c <= 'z') {
    return c - 'a' + 26;
  }
  if (c >= '0' && c <= '9') {
    return c - '0' + 52;
  }
  if (c == '+') {
    return 62;
  }
  if (c == '/') {
    return 63;
  }
  return -1;
}

}  // namespace

std::vector<uint8_t> decode_base64(const std::string& input, std::string& error) {
  std::vector<uint8_t> output;
  output.reserve(input.size() * 3 / 4);

  int buffer = 0;
  int bits = 0;
  for (char c : input) {
    if (c == '=' || c == '\n' || c == '\r' || c == ' ') {
      continue;
    }
    const int value = decode_base64_char(c);
    if (value < 0) {
      error = "invalid base64 character";
      return {};
    }
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output.push_back(static_cast<uint8_t>((buffer >> bits) & 0xFF));
    }
  }

  if (output.empty() && !input.empty()) {
    error = "decoded image data is empty";
  }
  return output;
}

}  // namespace pixelanea::api
