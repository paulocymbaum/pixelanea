#include "image/pixelate.hpp"

#include "image/decode.hpp"
#include "image/downscale.hpp"
#include "image/flatten_alpha.hpp"
#include "image/quantize.hpp"
#include "image/remove_background.hpp"

namespace pixelanea::image {

domain::Result<PixelateResult> pixelate(PixelateParams params) {
  if (params.target_width <= 0 || params.target_height <= 0) {
    return domain::Result<PixelateResult>::fail("target dimensions must be positive");
  }

  auto decoded = decode_image(params.image_data, params.image_size);
  if (!decoded.has_value()) {
    return domain::Result<PixelateResult>::fail(decoded.error());
  }

  RgbaBuffer downscaled =
      downscale_box(decoded.value(), params.target_width, params.target_height);
  if (params.remove_background) {
    const Rgb8 background = detect_background_color(downscaled);
    apply_background_removal(downscaled, background);
  } else {
    flatten_alpha(downscaled);
  }

  domain::Palette palette = params.palette;
  bool palette_updated = false;

  if (params.max_colors > 0) {
    auto extracted = extract_palette(downscaled, params.max_colors);
    if (!extracted.has_value()) {
      return domain::Result<PixelateResult>::fail(extracted.error());
    }
    palette = std::move(extracted.value());
    palette_updated = true;
  } else if (palette.colors.empty()) {
    return domain::Result<PixelateResult>::fail("palette is required when maxColors is not set");
  }

  auto grid = quantize_to_palette(downscaled, palette);
  if (!grid.has_value()) {
    return domain::Result<PixelateResult>::fail(grid.error());
  }

  PixelateResult result;
  result.grid = std::move(grid.value());
  result.palette = std::move(palette);
  result.palette_updated = palette_updated;
  return domain::Result<PixelateResult>::ok(std::move(result));
}

}  // namespace pixelanea::image
