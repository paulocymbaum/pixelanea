#include "image/flatten_alpha.hpp"

namespace pixelanea::image {

void flatten_alpha(RgbaBuffer& image, uint8_t bg_r, uint8_t bg_g, uint8_t bg_b) {
  for (std::size_t index = 0; index < image.pixel_count(); ++index) {
    const std::size_t offset = index * 4;
    const uint8_t alpha = image.pixels[offset + 3];
    if (alpha == 255) {
      continue;
    }
    if (alpha == 0) {
      image.pixels[offset] = bg_r;
      image.pixels[offset + 1] = bg_g;
      image.pixels[offset + 2] = bg_b;
      image.pixels[offset + 3] = 255;
      continue;
    }

    const int a = static_cast<int>(alpha);
    const int inv = 255 - a;
    image.pixels[offset] =
        static_cast<uint8_t>((image.pixels[offset] * a + bg_r * inv + 127) / 255);
    image.pixels[offset + 1] =
        static_cast<uint8_t>((image.pixels[offset + 1] * a + bg_g * inv + 127) / 255);
    image.pixels[offset + 2] =
        static_cast<uint8_t>((image.pixels[offset + 2] * a + bg_b * inv + 127) / 255);
    image.pixels[offset + 3] = 255;
  }
}

}  // namespace pixelanea::image
