#pragma once

#include <cstdint>
#include <vector>

namespace pixelanea::image {

struct RgbaBuffer {
  int width = 0;
  int height = 0;
  std::vector<uint8_t> pixels;  // RGBA row-major, 4 bytes per pixel

  std::size_t pixel_count() const {
    return static_cast<std::size_t>(width) * static_cast<std::size_t>(height);
  }

  bool empty() const { return pixels.empty(); }
};

}  // namespace pixelanea::image
