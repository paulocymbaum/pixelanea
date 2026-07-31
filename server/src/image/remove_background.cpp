#include "image/remove_background.hpp"

#include <algorithm>
#include <cmath>
#include <vector>

namespace pixelanea::image {

namespace {

bool colors_match(uint8_t r, uint8_t g, uint8_t b, const Rgb8& background, int tolerance) {
  return std::abs(static_cast<int>(r) - static_cast<int>(background.r)) <= tolerance &&
         std::abs(static_cast<int>(g) - static_cast<int>(background.g)) <= tolerance &&
         std::abs(static_cast<int>(b) - static_cast<int>(background.b)) <= tolerance;
}

void collect_border_samples(const RgbaBuffer& image, std::vector<Rgb8>& samples) {
  if (image.width <= 0 || image.height <= 0) {
    return;
  }

  const int width = image.width;
  const int height = image.height;

  for (int x = 0; x < width; ++x) {
    for (int y : {0, height - 1}) {
      const std::size_t offset = static_cast<std::size_t>(y * width + x) * 4;
      if (image.pixels[offset + 3] == 0) {
        continue;
      }
      samples.push_back(
          Rgb8{image.pixels[offset], image.pixels[offset + 1], image.pixels[offset + 2]});
    }
  }

  for (int y = 1; y < height - 1; ++y) {
    for (int x : {0, width - 1}) {
      const std::size_t offset = static_cast<std::size_t>(y * width + x) * 4;
      if (image.pixels[offset + 3] == 0) {
        continue;
      }
      samples.push_back(
          Rgb8{image.pixels[offset], image.pixels[offset + 1], image.pixels[offset + 2]});
    }
  }
}

}  // namespace

Rgb8 detect_background_color(const RgbaBuffer& image, int tolerance) {
  std::vector<Rgb8> samples;
  collect_border_samples(image, samples);

  if (samples.empty()) {
    return Rgb8{255, 255, 255};
  }

  struct Bucket {
    Rgb8 color;
    int count = 0;
  };

  std::vector<Bucket> buckets;
  for (const Rgb8& sample : samples) {
    auto match = std::find_if(buckets.begin(), buckets.end(),
                              [&](const Bucket& bucket) {
                                return colors_match(sample.r, sample.g, sample.b, bucket.color,
                                                    tolerance);
                              });
    if (match != buckets.end()) {
      match->count += 1;
    } else {
      buckets.push_back(Bucket{sample, 1});
    }
  }

  const auto best = std::max_element(
      buckets.begin(), buckets.end(),
      [](const Bucket& a, const Bucket& b) { return a.count < b.count; });
  return best->color;
}

void apply_background_removal(RgbaBuffer& image, const Rgb8& background, int tolerance) {
  for (std::size_t index = 0; index < image.pixel_count(); ++index) {
    const std::size_t offset = index * 4;
    const uint8_t alpha = image.pixels[offset + 3];
    if (alpha == 0) {
      continue;
    }
    if (colors_match(image.pixels[offset], image.pixels[offset + 1], image.pixels[offset + 2],
                     background, tolerance)) {
      image.pixels[offset + 3] = 0;
    }
  }
}

}  // namespace pixelanea::image
