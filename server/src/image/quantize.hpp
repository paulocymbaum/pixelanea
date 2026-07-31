#pragma once

#include "domain/result.hpp"
#include "domain/types.hpp"
#include "image/rgba_buffer.hpp"

namespace pixelanea::image {

domain::Result<domain::Palette> extract_palette(const RgbaBuffer& image, int max_colors);

domain::Result<domain::PixelGrid> quantize_to_palette(const RgbaBuffer& image,
                                                        const domain::Palette& palette);

}  // namespace pixelanea::image
