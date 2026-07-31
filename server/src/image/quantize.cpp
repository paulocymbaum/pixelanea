#include "image/quantize.hpp"

#include "image/color_utils.hpp"

#include <algorithm>
#include <array>
#include <cmath>
#include <unordered_map>
#include <vector>

namespace pixelanea::image {

namespace {

struct ColorBox {
  int r_min = 255;
  int r_max = 0;
  int g_min = 255;
  int g_max = 0;
  int b_min = 255;
  int b_max = 0;
  std::vector<std::size_t> indices;
};

int channel_range(const ColorBox& box, int channel) {
  switch (channel) {
    case 0:
      return box.r_max - box.r_min;
    case 1:
      return box.g_max - box.g_min;
    default:
      return box.b_max - box.b_min;
  }
}

void add_pixel(ColorBox& box, uint8_t r, uint8_t g, uint8_t b, std::size_t index) {
  box.r_min = std::min(box.r_min, static_cast<int>(r));
  box.r_max = std::max(box.r_max, static_cast<int>(r));
  box.g_min = std::min(box.g_min, static_cast<int>(g));
  box.g_max = std::max(box.g_max, static_cast<int>(g));
  box.b_min = std::min(box.b_min, static_cast<int>(b));
  box.b_max = std::max(box.b_max, static_cast<int>(b));
  box.indices.push_back(index);
}

Rgb8 average_color(const RgbaBuffer& image, const std::vector<std::size_t>& indices) {
  if (indices.empty()) {
    return {};
  }
  long r_sum = 0;
  long g_sum = 0;
  long b_sum = 0;
  for (const std::size_t index : indices) {
    const std::size_t offset = index * 4;
    r_sum += image.pixels[offset];
    g_sum += image.pixels[offset + 1];
    b_sum += image.pixels[offset + 2];
  }
  const auto count = static_cast<long>(indices.size());
  return Rgb8{static_cast<uint8_t>(r_sum / count), static_cast<uint8_t>(g_sum / count),
              static_cast<uint8_t>(b_sum / count)};
}

void split_box(const RgbaBuffer& image, ColorBox box, int channel, ColorBox& left, ColorBox& right) {
  std::sort(box.indices.begin(), box.indices.end(), [&](std::size_t a, std::size_t b) {
    const std::size_t offset_a = a * 4;
    const std::size_t offset_b = b * 4;
    switch (channel) {
      case 0:
        return image.pixels[offset_a] < image.pixels[offset_b];
      case 1:
        return image.pixels[offset_a + 1] < image.pixels[offset_b + 1];
      default:
        return image.pixels[offset_a + 2] < image.pixels[offset_b + 2];
    }
  });

  const std::size_t mid = box.indices.size() / 2;
  std::vector<std::size_t> left_indices(box.indices.begin(),
                                        box.indices.begin() + static_cast<long>(mid));
  std::vector<std::size_t> right_indices(box.indices.begin() + static_cast<long>(mid),
                                         box.indices.end());

  left = ColorBox{};
  right = ColorBox{};
  for (const std::size_t index : left_indices) {
    const std::size_t offset = index * 4;
    add_pixel(left, image.pixels[offset], image.pixels[offset + 1], image.pixels[offset + 2],
              index);
  }
  for (const std::size_t index : right_indices) {
    const std::size_t offset = index * 4;
    add_pixel(right, image.pixels[offset], image.pixels[offset + 1], image.pixels[offset + 2],
              index);
  }
}

}  // namespace

domain::Result<domain::Palette> extract_palette(const RgbaBuffer& image, int max_colors) {
  if (max_colors < 2 || max_colors > 256) {
    return domain::Result<domain::Palette>::fail("maxColors must be between 2 and 256");
  }
  if (image.empty()) {
    return domain::Result<domain::Palette>::fail("cannot extract palette from empty image");
  }

  ColorBox root;
  for (std::size_t index = 0; index < image.pixel_count(); ++index) {
    const std::size_t offset = index * 4;
    if (image.pixels[offset + 3] == 0) {
      continue;
    }
    add_pixel(root, image.pixels[offset], image.pixels[offset + 1], image.pixels[offset + 2],
              index);
  }

  if (root.indices.empty()) {
    return domain::Result<domain::Palette>::fail("image has no opaque pixels");
  }

  std::vector<ColorBox> boxes;
  boxes.push_back(std::move(root));

  while (static_cast<int>(boxes.size()) < max_colors) {
    auto split_at = boxes.begin();
    int best_range = -1;
    for (auto it = boxes.begin(); it != boxes.end(); ++it) {
      if (it->indices.size() < 2) {
        continue;
      }
      const int range_r = channel_range(*it, 0);
      const int range_g = channel_range(*it, 1);
      const int range_b = channel_range(*it, 2);
      const int longest = std::max({range_r, range_g, range_b});
      if (longest > best_range) {
        best_range = longest;
        split_at = it;
      }
    }
    if (best_range <= 0) {
      break;
    }

    const int channel = [&]() {
      const int range_r = channel_range(*split_at, 0);
      const int range_g = channel_range(*split_at, 1);
      const int range_b = channel_range(*split_at, 2);
      if (range_r >= range_g && range_r >= range_b) {
        return 0;
      }
      if (range_g >= range_b) {
        return 1;
      }
      return 2;
    }();

    ColorBox left;
    ColorBox right;
    split_box(image, *split_at, channel, left, right);
    if (left.indices.empty() || right.indices.empty()) {
      break;
    }
    *split_at = std::move(left);
    boxes.push_back(std::move(right));
  }

  domain::Palette palette;
  palette.name = "Imported";
  // Slot 0 is reserved for transparent pixels in the pixel grid.
  int slot = 1;
  for (const auto& box : boxes) {
    if (box.indices.empty()) {
      continue;
    }
    const Rgb8 rgb = average_color(image, box.indices);
    domain::Color color;
    color.slot = slot++;
    color.hex = rgb_to_hex(rgb.r, rgb.g, rgb.b);
    palette.colors.push_back(std::move(color));
  }

  if (palette.colors.empty()) {
    return domain::Result<domain::Palette>::fail("failed to extract palette");
  }

  return domain::Result<domain::Palette>::ok(std::move(palette));
}

domain::Result<domain::PixelGrid> quantize_to_palette(const RgbaBuffer& image,
                                                        const domain::Palette& palette) {
  if (palette.colors.empty()) {
    return domain::Result<domain::PixelGrid>::fail("palette is empty");
  }
  if (image.empty()) {
    return domain::Result<domain::PixelGrid>::fail("image is empty");
  }

  domain::PixelGrid grid;
  grid.width = image.width;
  grid.height = image.height;
  grid.indices.resize(image.pixel_count());

  for (std::size_t index = 0; index < image.pixel_count(); ++index) {
    const std::size_t offset = index * 4;
    const uint8_t alpha = image.pixels[offset + 3];
    if (alpha == 0) {
      grid.indices[index] = domain::kTransparentPixelIndex;
      continue;
    }
    grid.indices[index] = static_cast<uint8_t>(nearest_palette_index(
        image.pixels[offset], image.pixels[offset + 1], image.pixels[offset + 2], palette));
  }

  return domain::Result<domain::PixelGrid>::ok(std::move(grid));
}

}  // namespace pixelanea::image
