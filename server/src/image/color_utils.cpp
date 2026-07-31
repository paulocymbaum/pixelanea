#include "image/color_utils.hpp"

#include <algorithm>
#include <climits>
#include <cstdlib>

namespace pixelanea::image {

namespace {

int hex_nibble(char c) {
  if (c >= '0' && c <= '9') {
    return c - '0';
  }
  if (c >= 'a' && c <= 'f') {
    return 10 + (c - 'a');
  }
  if (c >= 'A' && c <= 'F') {
    return 10 + (c - 'A');
  }
  return -1;
}

}  // namespace

bool parse_hex_color(const std::string& hex, Rgb8& out) {
  if (hex.size() != 7 || hex[0] != '#') {
    return false;
  }
  const int r_hi = hex_nibble(hex[1]);
  const int r_lo = hex_nibble(hex[2]);
  const int g_hi = hex_nibble(hex[3]);
  const int g_lo = hex_nibble(hex[4]);
  const int b_hi = hex_nibble(hex[5]);
  const int b_lo = hex_nibble(hex[6]);
  if (r_hi < 0 || r_lo < 0 || g_hi < 0 || g_lo < 0 || b_hi < 0 || b_lo < 0) {
    return false;
  }
  out.r = static_cast<uint8_t>((r_hi << 4) | r_lo);
  out.g = static_cast<uint8_t>((g_hi << 4) | g_lo);
  out.b = static_cast<uint8_t>((b_hi << 4) | b_lo);
  return true;
}

std::array<Rgb8, 256> palette_to_rgb(const domain::Palette& palette) {
  std::array<Rgb8, 256> rgb{};
  for (const auto& color : palette.colors) {
    if (color.slot < 0 || color.slot > 255) {
      continue;
    }
    parse_hex_color(color.hex, rgb[static_cast<std::size_t>(color.slot)]);
  }
  return rgb;
}

int nearest_palette_index(uint8_t r, uint8_t g, uint8_t b, const domain::Palette& palette) {
  if (palette.colors.empty()) {
    return 0;
  }

  const auto rgb = palette_to_rgb(palette);
  int best_slot = palette.colors.front().slot;
  int best_distance = INT_MAX;

  for (const auto& color : palette.colors) {
    const auto& candidate = rgb[static_cast<std::size_t>(color.slot)];
    const int dr = static_cast<int>(r) - static_cast<int>(candidate.r);
    const int dg = static_cast<int>(g) - static_cast<int>(candidate.g);
    const int db = static_cast<int>(b) - static_cast<int>(candidate.b);
    const int distance = dr * dr + dg * dg + db * db;
    if (distance < best_distance) {
      best_distance = distance;
      best_slot = color.slot;
    }
  }
  return best_slot;
}

std::string rgb_to_hex(uint8_t r, uint8_t g, uint8_t b) {
  char buffer[8];
  std::snprintf(buffer, sizeof(buffer), "#%02X%02X%02X", r, g, b);
  return std::string(buffer);
}

}  // namespace pixelanea::image
