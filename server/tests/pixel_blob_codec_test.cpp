#include <catch2/catch_test_macros.hpp>

#include "db/pixel_blob_codec.hpp"

#include <stdexcept>

using pixelanea::db::PixelBlobCodec;

TEST_CASE("PixelBlobCodec round-trips empty grid", "[codec]") {
  const std::vector<uint8_t> empty;
  const auto encoded = PixelBlobCodec::encode(empty);
  const auto decoded = PixelBlobCodec::decode(encoded, 0);
  REQUIRE(decoded.empty());
}

TEST_CASE("PixelBlobCodec round-trips short runs as literals", "[codec]") {
  const std::vector<uint8_t> indices{1, 1};
  const auto encoded = PixelBlobCodec::encode(indices);
  REQUIRE(encoded == indices);
  REQUIRE(PixelBlobCodec::decode(encoded, indices.size()) == indices);
}

TEST_CASE("PixelBlobCodec compresses long runs", "[codec]") {
  const std::vector<uint8_t> indices(10, 3);
  const auto encoded = PixelBlobCodec::encode(indices);
  REQUIRE(encoded.size() == 3);
  REQUIRE(encoded[0] == 0xFF);
  REQUIRE(encoded[1] == 10);
  REQUIRE(encoded[2] == 3);
  REQUIRE(PixelBlobCodec::decode(encoded, indices.size()) == indices);
}

TEST_CASE("PixelBlobCodec encodes 0xFF marker value with RLE", "[codec]") {
  const std::vector<uint8_t> indices{0xFF};
  const auto encoded = PixelBlobCodec::encode(indices);
  REQUIRE(encoded.size() == 3);
  REQUIRE(PixelBlobCodec::decode(encoded, 1) == indices);
}

TEST_CASE("PixelBlobCodec round-trips mixed pattern", "[codec]") {
  std::vector<uint8_t> indices;
  indices.reserve(16);
  for (int i = 0; i < 4; ++i) {
    indices.push_back(static_cast<uint8_t>(i));
  }
  indices.insert(indices.end(), 8, 5);
  indices.insert(indices.end(), {2, 2, 7});

  const auto encoded = PixelBlobCodec::encode(indices);
  REQUIRE(PixelBlobCodec::decode(encoded, indices.size()) == indices);
}

TEST_CASE("PixelBlobCodec rejects truncated RLE sequence", "[codec]") {
  const std::vector<uint8_t> blob{0xFF, 2};
  REQUIRE_THROWS_AS(PixelBlobCodec::decode(blob, 2), std::runtime_error);
}

TEST_CASE("PixelBlobCodec rejects size mismatch", "[codec]") {
  const std::vector<uint8_t> blob{1, 2, 3};
  REQUIRE_THROWS_AS(PixelBlobCodec::decode(blob, 2), std::runtime_error);
}

TEST_CASE("PixelBlobCodec 64x64 grids fit autosave budget for 32 frames", "[codec][perf]") {
  std::vector<uint8_t> indices(64 * 64);
  for (std::size_t i = 0; i < indices.size(); ++i) {
    indices[i] = static_cast<uint8_t>((i / 8) % 16 + 1);
  }

  const auto encoded = PixelBlobCodec::encode(indices);
  REQUIRE(encoded.size() <= indices.size());

  std::size_t total_bytes = 0;
  for (int frame = 0; frame < 32; ++frame) {
    total_bytes += PixelBlobCodec::encode(indices).size();
  }
  REQUIRE(total_bytes < 1024 * 1024);
}
