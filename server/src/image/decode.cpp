#define STB_IMAGE_IMPLEMENTATION
#include <stb_image.h>

#include "image/decode.hpp"

namespace pixelanea::image {

domain::Result<RgbaBuffer> decode_image(const uint8_t* data, std::size_t size) {
  if (data == nullptr || size == 0) {
    return domain::Result<RgbaBuffer>::fail("image data is empty");
  }

  int width = 0;
  int height = 0;
  int channels = 0;
  unsigned char* decoded = stbi_load_from_memory(data, static_cast<int>(size), &width, &height,
                                                 &channels, STBI_rgb_alpha);
  if (decoded == nullptr) {
    return domain::Result<RgbaBuffer>::fail("failed to decode image");
  }

  RgbaBuffer buffer;
  buffer.width = width;
  buffer.height = height;
  const std::size_t byte_count =
      static_cast<std::size_t>(width) * static_cast<std::size_t>(height) * 4;
  buffer.pixels.assign(decoded, decoded + byte_count);
  stbi_image_free(decoded);

  if (buffer.width <= 0 || buffer.height <= 0) {
    return domain::Result<RgbaBuffer>::fail("decoded image has invalid dimensions");
  }

  return domain::Result<RgbaBuffer>::ok(std::move(buffer));
}

}  // namespace pixelanea::image
