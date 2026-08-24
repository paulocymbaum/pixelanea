#include "export/png_encoder.hpp"

#include "image/color_utils.hpp"

#define STB_IMAGE_WRITE_IMPLEMENTATION
#include "stb_image_write.h"

#include <fstream>

namespace pixelanea::export_cli {

namespace {

std::vector<uint8_t> frame_to_rgba(const PngEncodeParams& params) {
  const int width = params.width;
  const int height = params.height;
  const auto& pixels = *params.pixels;
  const auto rgb = image::palette_to_rgb(*params.palette);

  std::vector<uint8_t> rgba(static_cast<std::size_t>(width) * static_cast<std::size_t>(height) * 4,
                            0);
  for (int y = 0; y < height; ++y) {
    for (int x = 0; x < width; ++x) {
      const std::size_t cell = static_cast<std::size_t>(y * width + x);
      const uint8_t index = cell < pixels.size() ? pixels[cell] : domain::kTransparentPixelIndex;
      const std::size_t offset = cell * 4;
      if (index == domain::kTransparentPixelIndex) {
        rgba[offset + 3] = 0;
        continue;
      }
      const auto& color = rgb[index];
      rgba[offset] = color.r;
      rgba[offset + 1] = color.g;
      rgba[offset + 2] = color.b;
      rgba[offset + 3] = 255;
    }
  }
  return rgba;
}

}  // namespace

domain::Result<std::vector<uint8_t>> encode_frame_png(const PngEncodeParams& params) {
  if (params.width <= 0 || params.height <= 0) {
    return domain::Result<std::vector<uint8_t>>::fail("invalid frame dimensions");
  }
  if (!params.pixels || !params.palette) {
    return domain::Result<std::vector<uint8_t>>::fail("missing frame or palette");
  }
  const std::size_t expected =
      static_cast<std::size_t>(params.width) * static_cast<std::size_t>(params.height);
  if (params.pixels->size() < expected) {
    return domain::Result<std::vector<uint8_t>>::fail("pixel buffer too small for frame");
  }

  const auto rgba = frame_to_rgba(params);
  std::vector<uint8_t> png_bytes;
  const auto write_callback = [](void* context, void* data, int size) {
    auto* out = static_cast<std::vector<uint8_t>*>(context);
    const auto* bytes = static_cast<const uint8_t*>(data);
    out->insert(out->end(), bytes, bytes + size);
  };

  if (stbi_write_png_to_func(write_callback, &png_bytes, params.width, params.height, 4,
                             rgba.data(), params.width * 4) == 0) {
    return domain::Result<std::vector<uint8_t>>::fail("PNG encode failed");
  }

  return domain::Result<std::vector<uint8_t>>::ok(std::move(png_bytes));
}

domain::VoidResult write_png_file(const std::filesystem::path& path,
                                  const std::vector<uint8_t>& png_bytes) {
  std::ofstream output(path, std::ios::binary);
  if (!output) {
    return domain::VoidResult::fail("could not open output path: " + path.string());
  }
  output.write(reinterpret_cast<const char*>(png_bytes.data()),
                 static_cast<std::streamsize>(png_bytes.size()));
  if (!output) {
    return domain::VoidResult::fail("could not write PNG: " + path.string());
  }
  return domain::VoidResult::ok();
}

}  // namespace pixelanea::export_cli
