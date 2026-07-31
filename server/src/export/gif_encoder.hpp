#pragma once

#include "domain/result.hpp"
#include "domain/types.hpp"

#include <cstdint>
#include <vector>

namespace pixelanea::gif {

struct GifEncodeParams {
  int width = 0;
  int height = 0;
  double fps = 8.0;
  bool loop = true;
  domain::Palette palette;
  std::vector<std::vector<uint8_t>> frames;
};

/** Encode palette-indexed animation frames to GIF89a bytes. */
domain::Result<std::vector<uint8_t>> encode_gif(const GifEncodeParams& params);

/** Frame delay in hundredths of a second (gifenc minimum 6). */
uint16_t fps_to_frame_delay(double fps);

}  // namespace pixelanea::gif
