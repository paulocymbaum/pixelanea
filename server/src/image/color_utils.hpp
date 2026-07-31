#pragma once

#include "domain/types.hpp"

#include <array>
#include <cstdint>
#include <string>

namespace pixelanea::image {

struct Rgb8 {
  uint8_t r = 0;
  uint8_t g = 0;
  uint8_t b = 0;
};

bool parse_hex_color(const std::string& hex, Rgb8& out);

std::array<Rgb8, 256> palette_to_rgb(const domain::Palette& palette);

int nearest_palette_index(uint8_t r, uint8_t g, uint8_t b, const domain::Palette& palette);

std::string rgb_to_hex(uint8_t r, uint8_t g, uint8_t b);

}  // namespace pixelanea::image
