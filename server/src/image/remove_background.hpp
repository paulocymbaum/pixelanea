#pragma once

#include "image/color_utils.hpp"
#include "image/rgba_buffer.hpp"

namespace pixelanea::image {

/** Sample border pixels and return the dominant opaque RGB color. */
Rgb8 detect_background_color(const RgbaBuffer& image, int tolerance = 16);

/** Mark pixels matching the background color (within tolerance) as transparent. */
void apply_background_removal(RgbaBuffer& image, const Rgb8& background, int tolerance = 16);

}  // namespace pixelanea::image
