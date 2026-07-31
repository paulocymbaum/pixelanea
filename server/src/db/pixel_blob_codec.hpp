#pragma once

#include <cstdint>
#include <vector>

namespace pixelanea::db {

// RLE codec for palette-index grids (1 byte per cell).
class PixelBlobCodec {
 public:
  static std::vector<uint8_t> encode(const std::vector<uint8_t>& indices);
  static std::vector<uint8_t> decode(const std::vector<uint8_t>& blob, std::size_t expected_size);
};

}  // namespace pixelanea::db
