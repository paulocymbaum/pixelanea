#pragma once

#include "domain/result.hpp"
#include "domain/types.hpp"

#include <cstdint>
#include <vector>

namespace pixelanea::image {

struct PixelateParams {
  const uint8_t* image_data = nullptr;
  std::size_t image_size = 0;
  int target_width = 0;
  int target_height = 0;
  int max_colors = 0;
  bool remove_background = true;
  domain::Palette palette;
};

struct PixelateResult {
  domain::PixelGrid grid;
  domain::Palette palette;
  bool palette_updated = false;
};

domain::Result<PixelateResult> pixelate(PixelateParams params);

}  // namespace pixelanea::image
