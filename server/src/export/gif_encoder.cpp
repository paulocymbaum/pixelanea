#include "export/gif_encoder.hpp"

#include "image/color_utils.hpp"

extern "C" {
#include "gifenc.h"
}

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <vector>

namespace pixelanea::gif {

namespace {

constexpr int kGifColorDepth = 8;
constexpr int kGifPaletteBytes = 3 << kGifColorDepth;

std::vector<uint8_t> build_gif_palette(const domain::Palette& palette) {
  std::vector<uint8_t> gif_palette(kGifPaletteBytes, 0);
  const auto rgb = image::palette_to_rgb(palette);
  for (std::size_t slot = 0; slot < rgb.size(); ++slot) {
    const auto& color = rgb[slot];
    const std::size_t offset = slot * 3;
    gif_palette[offset] = color.r;
    gif_palette[offset + 1] = color.g;
    gif_palette[offset + 2] = color.b;
  }
  return gif_palette;
}

std::filesystem::path make_temp_gif_path() {
  const auto dir = std::filesystem::temp_directory_path() / "pixelanea-gif-export";
  std::error_code ec;
  std::filesystem::create_directories(dir, ec);
  return dir / ("frame-" + std::to_string(std::rand()) + ".gif");
}

domain::Result<std::vector<uint8_t>> read_file_bytes(const std::filesystem::path& path) {
  std::ifstream input(path, std::ios::binary);
  if (!input) {
    return domain::Result<std::vector<uint8_t>>::fail("could not read encoded GIF");
  }
  input.seekg(0, std::ios::end);
  const auto size = input.tellg();
  if (size < 0) {
    return domain::Result<std::vector<uint8_t>>::fail("could not read encoded GIF");
  }
  std::vector<uint8_t> bytes(static_cast<std::size_t>(size));
  input.seekg(0, std::ios::beg);
  input.read(reinterpret_cast<char*>(bytes.data()), size);
  if (!input) {
    return domain::Result<std::vector<uint8_t>>::fail("could not read encoded GIF");
  }
  return domain::Result<std::vector<uint8_t>>::ok(std::move(bytes));
}

}  // namespace

uint16_t fps_to_frame_delay(double fps) {
  if (fps <= 0.0) {
    return 12;
  }
  const int delay = static_cast<int>(std::lround(100.0 / fps));
  return static_cast<uint16_t>(std::clamp(delay, 6, 600));
}

domain::Result<std::vector<uint8_t>> encode_gif(const GifEncodeParams& params) {
  if (params.width <= 0 || params.height <= 0) {
    return domain::Result<std::vector<uint8_t>>::fail("invalid frame dimensions");
  }
  if (params.width > 0xFFFF || params.height > 0xFFFF) {
    return domain::Result<std::vector<uint8_t>>::fail("frame dimensions exceed GIF limits");
  }
  if (params.frames.empty()) {
    return domain::Result<std::vector<uint8_t>>::fail("at least one frame is required");
  }

  const std::size_t expected_pixels =
      static_cast<std::size_t>(params.width) * static_cast<std::size_t>(params.height);
  for (const auto& frame : params.frames) {
    if (frame.size() != expected_pixels) {
      return domain::Result<std::vector<uint8_t>>::fail("frame pixel size mismatch");
    }
  }

  auto gif_palette = build_gif_palette(params.palette);
  const auto temp_path = make_temp_gif_path();
  const int loop = params.loop ? 0 : -1;
  const uint16_t delay = fps_to_frame_delay(params.fps);

  ge_GIF* gif = ge_new_gif(temp_path.string().c_str(),
                           static_cast<uint16_t>(params.width),
                           static_cast<uint16_t>(params.height), gif_palette.data(),
                           kGifColorDepth, static_cast<int>(domain::kTransparentPixelIndex), loop);
  if (!gif) {
    return domain::Result<std::vector<uint8_t>>::fail("GIF encoder initialization failed");
  }

  for (const auto& frame : params.frames) {
    std::memcpy(gif->frame, frame.data(), expected_pixels);
    ge_add_frame(gif, delay);
  }
  ge_close_gif(gif);

  auto bytes = read_file_bytes(temp_path);
  std::error_code ec;
  std::filesystem::remove(temp_path, ec);
  return bytes;
}

}  // namespace pixelanea::gif
