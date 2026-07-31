#pragma once

#include "image/rgba_buffer.hpp"

namespace pixelanea::image {

RgbaBuffer downscale_box(const RgbaBuffer& source, int target_width, int target_height);

}  // namespace pixelanea::image
