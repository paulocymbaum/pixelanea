#pragma once

#include "domain/result.hpp"
#include "domain/types.hpp"

#include <cstdint>
#include <filesystem>
#include <vector>

namespace pixelanea::export_cli {

struct PngEncodeParams {
  int width = 0;
  int height = 0;
  const std::vector<uint8_t>* pixels = nullptr;
  const domain::Palette* palette = nullptr;
};

/** Encode one frame grid to PNG bytes (RGBA, transparent index = 0). */
domain::Result<std::vector<uint8_t>> encode_frame_png(const PngEncodeParams& params);

/** Write PNG bytes to disk. */
domain::VoidResult write_png_file(const std::filesystem::path& path,
                                  const std::vector<uint8_t>& png_bytes);

}  // namespace pixelanea::export_cli
