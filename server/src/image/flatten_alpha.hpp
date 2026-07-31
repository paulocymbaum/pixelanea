#pragma once

#include "image/rgba_buffer.hpp"

namespace pixelanea::image {

/** Composite semi-transparent pixels onto an opaque background (default white). */
void flatten_alpha(RgbaBuffer& image, uint8_t bg_r = 255, uint8_t bg_g = 255, uint8_t bg_b = 255);

}  // namespace pixelanea::image
