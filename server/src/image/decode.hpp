#pragma once

#include "domain/result.hpp"
#include "image/rgba_buffer.hpp"

#include <cstdint>
#include <vector>

namespace pixelanea::image {

domain::Result<RgbaBuffer> decode_image(const uint8_t* data, std::size_t size);

}  // namespace pixelanea::image
