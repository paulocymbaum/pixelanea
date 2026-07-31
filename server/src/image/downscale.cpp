#include "image/downscale.hpp"

#include <algorithm>

namespace pixelanea::image {

namespace {

uint8_t average_channel(int sum, int count) {
  return static_cast<uint8_t>(sum / std::max(count, 1));
}

}  // namespace

RgbaBuffer downscale_box(const RgbaBuffer& source, int target_width, int target_height) {
  RgbaBuffer out;
  out.width = target_width;
  out.height = target_height;
  out.pixels.resize(out.pixel_count() * 4);

  if (source.empty() || target_width <= 0 || target_height <= 0) {
    return out;
  }

  for (int y = 0; y < target_height; ++y) {
    const int src_y0 = (y * source.height) / target_height;
    const int src_y1 =
        std::min(std::max(src_y0 + 1, ((y + 1) * source.height) / target_height), source.height);
    for (int x = 0; x < target_width; ++x) {
      const int src_x0 = (x * source.width) / target_width;
      const int src_x1 =
          std::min(std::max(src_x0 + 1, ((x + 1) * source.width) / target_width), source.width);

      int r_sum = 0;
      int g_sum = 0;
      int b_sum = 0;
      int a_sum = 0;
      int count = 0;

      for (int sy = src_y0; sy < src_y1; ++sy) {
        for (int sx = src_x0; sx < src_x1; ++sx) {
          const std::size_t offset =
              (static_cast<std::size_t>(sy) * static_cast<std::size_t>(source.width) +
               static_cast<std::size_t>(sx)) *
              4;
          r_sum += source.pixels[offset];
          g_sum += source.pixels[offset + 1];
          b_sum += source.pixels[offset + 2];
          a_sum += source.pixels[offset + 3];
          ++count;
        }
      }

      const std::size_t dst_offset =
          (static_cast<std::size_t>(y) * static_cast<std::size_t>(target_width) +
           static_cast<std::size_t>(x)) *
          4;
      out.pixels[dst_offset] = average_channel(r_sum, count);
      out.pixels[dst_offset + 1] = average_channel(g_sum, count);
      out.pixels[dst_offset + 2] = average_channel(b_sum, count);
      out.pixels[dst_offset + 3] = average_channel(a_sum, count);
    }
  }

  return out;
}

}  // namespace pixelanea::image
