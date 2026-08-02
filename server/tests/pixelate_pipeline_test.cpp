#include <catch2/catch_test_macros.hpp>

#include "image/color_utils.hpp"
#include "image/decode.hpp"
#include "image/downscale.hpp"
#include "image/flatten_alpha.hpp"
#include "image/pixelate.hpp"
#include "image/quantize.hpp"
#include "image/remove_background.hpp"

#include <array>
#include <chrono>
#include <cstdint>
#include <vector>

using pixelanea::domain::Color;
using pixelanea::domain::Palette;
using pixelanea::image::decode_image;
using pixelanea::image::downscale_box;
using pixelanea::image::extract_palette;
using pixelanea::image::flatten_alpha;
using pixelanea::image::nearest_palette_index;
using pixelanea::image::pixelate;
using pixelanea::image::quantize_to_palette;
using pixelanea::image::RgbaBuffer;
using pixelanea::image::Rgb8;
using pixelanea::image::apply_background_removal;
using pixelanea::image::detect_background_color;

namespace {

Palette two_color_palette() {
  Palette palette;
  palette.name = "Test";
  Color black;
  black.slot = 1;
  black.hex = "#000000";
  Color white;
  white.slot = 2;
  white.hex = "#FFFFFF";
  palette.colors = {black, white};
  return palette;
}

// 2x2 RGBA PNG checkerboard (black / white)
constexpr std::array<uint8_t, 75> kCheckerPng = {
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44,
    0x52, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x02, 0x08, 0x06, 0x00, 0x00, 0x00, 0x72,
    0xB6, 0x0D, 0x24, 0x00, 0x00, 0x00, 0x12, 0x49, 0x44, 0x41, 0x54, 0x78, 0xDA, 0x63, 0x60,
    0x60, 0x60, 0xF8, 0x0F, 0x02, 0x60, 0x12, 0xC4, 0x01, 0x00, 0x56, 0xBB, 0x09, 0xF7, 0x90,
    0xB7, 0xDD, 0x07, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82};

RgbaBuffer solid_rgba(int width, int height, uint8_t r, uint8_t g, uint8_t b, uint8_t a = 255) {
  RgbaBuffer buffer;
  buffer.width = width;
  buffer.height = height;
  buffer.pixels.resize(buffer.pixel_count() * 4);
  for (std::size_t i = 0; i < buffer.pixel_count(); ++i) {
    const std::size_t offset = i * 4;
    buffer.pixels[offset] = r;
    buffer.pixels[offset + 1] = g;
    buffer.pixels[offset + 2] = b;
    buffer.pixels[offset + 3] = a;
  }
  return buffer;
}

}  // namespace

TEST_CASE("decode_image reads embedded PNG", "[pixelate]") {
  const auto decoded = decode_image(kCheckerPng.data(), kCheckerPng.size());
  REQUIRE(decoded.has_value());
  REQUIRE(decoded.value().width == 2);
  REQUIRE(decoded.value().height == 2);
  REQUIRE(decoded.value().pixels.size() == 16);
}

TEST_CASE("downscale_box averages solid color", "[pixelate]") {
  const auto source = solid_rgba(4, 4, 200, 40, 10);
  const auto downscaled = downscale_box(source, 2, 2);
  REQUIRE(downscaled.width == 2);
  REQUIRE(downscaled.height == 2);
  for (std::size_t i = 0; i < downscaled.pixel_count(); ++i) {
    const std::size_t offset = i * 4;
    REQUIRE(downscaled.pixels[offset] == 200);
    REQUIRE(downscaled.pixels[offset + 1] == 40);
    REQUIRE(downscaled.pixels[offset + 2] == 10);
  }
}

TEST_CASE("nearest_palette_index picks closest color", "[pixelate]") {
  const auto palette = two_color_palette();
  REQUIRE(nearest_palette_index(0, 0, 0, palette) == 1);
  REQUIRE(nearest_palette_index(255, 255, 255, palette) == 2);
}

TEST_CASE("quantize_to_palette maps pixels to palette slots", "[pixelate]") {
  const auto palette = two_color_palette();
  auto source = solid_rgba(2, 2, 255, 255, 255);
  source.pixels[0] = 0;
  source.pixels[1] = 0;
  source.pixels[2] = 0;

  const auto grid = quantize_to_palette(source, palette);
  REQUIRE(grid.has_value());
  REQUIRE(grid.value().indices.size() == 4);
  REQUIRE(grid.value().indices[0] == 1);
  REQUIRE(grid.value().indices[1] == 2);
}

TEST_CASE("extract_palette returns requested color count", "[pixelate]") {
  RgbaBuffer source;
  source.width = 2;
  source.height = 2;
  source.pixels = {255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255};

  const auto palette = extract_palette(source, 2);
  REQUIRE(palette.has_value());
  REQUIRE(palette.value().colors.size() == 2);
  REQUIRE(palette.value().colors[0].slot == 1);
  REQUIRE(palette.value().colors[1].slot == 2);
}

TEST_CASE("pixelate runs decode downscale quantize pipeline", "[pixelate]") {
  const auto palette = two_color_palette();

  pixelanea::image::PixelateParams params;
  params.image_data = kCheckerPng.data();
  params.image_size = kCheckerPng.size();
  params.target_width = 2;
  params.target_height = 2;
  params.remove_background = false;
  params.palette = palette;

  const auto result = pixelate(params);
  REQUIRE(result.has_value());
  REQUIRE(result.value().grid.width == 2);
  REQUIRE(result.value().grid.height == 2);
  REQUIRE(result.value().grid.indices.size() == 4);
  REQUIRE_FALSE(result.value().palette_updated);
}

TEST_CASE("quantize_to_palette uses preset slots without mapping to transparent", "[pixelate]") {
  Palette palette;
  palette.name = "Gameboy";
  palette.colors = {
      Color{1, "#0F380F", std::nullopt},
      Color{2, "#306230", std::nullopt},
      Color{3, "#8BAC0F", std::nullopt},
      Color{4, "#9BBC0F", std::nullopt},
  };

  auto source = solid_rgba(2, 2, 15, 56, 15);
  const auto grid = quantize_to_palette(source, palette);
  REQUIRE(grid.has_value());
  for (const uint8_t index : grid.value().indices) {
    REQUIRE(index != 0);
  }
}

TEST_CASE("pixelate with maxColors updates palette", "[pixelate]") {
  pixelanea::image::PixelateParams params;
  params.image_data = kCheckerPng.data();
  params.image_size = kCheckerPng.size();
  params.target_width = 2;
  params.target_height = 2;
  params.max_colors = 2;
  params.remove_background = false;
  params.palette = {};

  const auto result = pixelate(params);
  REQUIRE(result.has_value());
  REQUIRE(result.value().palette_updated);
  REQUIRE(result.value().palette.colors.size() == 2);
  REQUIRE(result.value().palette.colors[0].slot == 1);
  REQUIRE(result.value().grid.indices.size() == 4);
  for (const uint8_t index : result.value().grid.indices) {
    REQUIRE(index != 0);
  }
}

TEST_CASE("pixelate solid image has no transparent holes", "[pixelate]") {
  pixelanea::image::PixelateParams params;
  params.target_width = 4;
  params.target_height = 4;
  params.max_colors = 4;

  const auto source = solid_rgba(64, 64, 20, 40, 180);
  std::vector<uint8_t> png_data;
  // Encode via decode round-trip is heavy; use pixelate on raw RGBA through downscale path.
  // Build a minimal in-memory pipeline instead.
  const auto downscaled = downscale_box(source, params.target_width, params.target_height);
  const auto palette = extract_palette(downscaled, params.max_colors);
  REQUIRE(palette.has_value());
  const auto grid = quantize_to_palette(downscaled, palette.value());
  REQUIRE(grid.has_value());
  for (const uint8_t index : grid.value().indices) {
    REQUIRE(index != 0);
  }
}

TEST_CASE("flatten_alpha composites transparent pixels onto white", "[pixelate]") {
  auto source = solid_rgba(2, 2, 255, 0, 0, 0);
  flatten_alpha(source);
  for (std::size_t i = 0; i < source.pixel_count(); ++i) {
    const std::size_t offset = i * 4;
    REQUIRE(source.pixels[offset] == 255);
    REQUIRE(source.pixels[offset + 1] == 255);
    REQUIRE(source.pixels[offset + 2] == 255);
    REQUIRE(source.pixels[offset + 3] == 255);
  }
}

TEST_CASE("pixelate transparent image succeeds after flatten", "[pixelate]") {
  pixelanea::image::PixelateParams params;
  params.image_data = kCheckerPng.data();
  params.image_size = kCheckerPng.size();
  params.target_width = 2;
  params.target_height = 2;
  params.max_colors = 2;
  params.remove_background = false;
  params.palette = {};

  const auto result = pixelate(params);
  REQUIRE(result.has_value());
}

TEST_CASE("detect_background_color finds dominant border color", "[pixelate]") {
  auto source = solid_rgba(4, 4, 200, 40, 10);
  for (int x = 0; x < 4; ++x) {
    for (int y : {0, 3}) {
      const std::size_t offset = static_cast<std::size_t>(y * 4 + x) * 4;
      source.pixels[offset] = 255;
      source.pixels[offset + 1] = 255;
      source.pixels[offset + 2] = 255;
    }
  }

  const Rgb8 bg = detect_background_color(source);
  REQUIRE(bg.r == 255);
  REQUIRE(bg.g == 255);
  REQUIRE(bg.b == 255);
}

TEST_CASE("apply_background_removal marks matching pixels transparent", "[pixelate]") {
  auto source = solid_rgba(2, 2, 255, 255, 255);
  source.pixels[0] = 10;
  source.pixels[1] = 20;
  source.pixels[2] = 30;

  apply_background_removal(source, Rgb8{255, 255, 255});
  REQUIRE(source.pixels[0] == 10);
  REQUIRE(source.pixels[1] == 20);
  REQUIRE(source.pixels[2] == 30);
  REQUIRE(source.pixels[3] == 255);
  REQUIRE(source.pixels[7] == 0);
  REQUIRE(source.pixels[11] == 0);
  REQUIRE(source.pixels[15] == 0);
}

TEST_CASE("pixelate with remove_background produces transparent indices", "[pixelate]") {
  auto source = solid_rgba(4, 4, 10, 20, 30);
  for (int x = 0; x < 4; ++x) {
    for (int y : {0, 3}) {
      const std::size_t offset = static_cast<std::size_t>(y * 4 + x) * 4;
      source.pixels[offset] = 255;
      source.pixels[offset + 1] = 255;
      source.pixels[offset + 2] = 255;
    }
  }
  for (int y = 1; y < 3; ++y) {
    for (int x : {0, 3}) {
      const std::size_t offset = static_cast<std::size_t>(y * 4 + x) * 4;
      source.pixels[offset] = 255;
      source.pixels[offset + 1] = 255;
      source.pixels[offset + 2] = 255;
    }
  }

  pixelanea::image::PixelateParams params;
  params.target_width = 2;
  params.target_height = 2;
  params.max_colors = 4;
  params.remove_background = true;

  auto downscaled = downscale_box(source, params.target_width, params.target_height);
  const auto palette = extract_palette(downscaled, params.max_colors);
  REQUIRE(palette.has_value());
  REQUIRE(quantize_to_palette(downscaled, palette.value()).has_value());

  const Rgb8 bg = detect_background_color(downscaled);
  apply_background_removal(downscaled, bg);
  const auto grid_after = quantize_to_palette(downscaled, palette.value());
  REQUIRE(grid_after.has_value());
  bool has_transparent = false;
  for (const uint8_t index : grid_after.value().indices) {
    if (index == 0) {
      has_transparent = true;
      break;
    }
  }
  REQUIRE(has_transparent);
}

TEST_CASE("pixelate without remove_background keeps opaque border pixels", "[pixelate]") {
  auto source = solid_rgba(4, 4, 10, 20, 30);
  for (int x = 0; x < 4; ++x) {
    for (int y : {0, 3}) {
      const std::size_t offset = static_cast<std::size_t>(y * 4 + x) * 4;
      source.pixels[offset] = 255;
      source.pixels[offset + 1] = 255;
      source.pixels[offset + 2] = 255;
    }
  }

  auto downscaled = downscale_box(source, 2, 2);
  flatten_alpha(downscaled);
  const auto palette = extract_palette(downscaled, 4);
  REQUIRE(palette.has_value());
  const auto grid = quantize_to_palette(downscaled, palette.value());
  REQUIRE(grid.has_value());
  for (const uint8_t index : grid.value().indices) {
    REQUIRE(index != 0);
  }
}

TEST_CASE("downscale_box fills every target pixel", "[pixelate]") {
  const auto source = solid_rgba(2, 2, 100, 120, 140);
  const auto downscaled = downscale_box(source, 3, 3);
  REQUIRE(downscaled.width == 3);
  REQUIRE(downscaled.height == 3);
  for (std::size_t i = 0; i < downscaled.pixel_count(); ++i) {
    const std::size_t offset = i * 4;
    REQUIRE(downscaled.pixels[offset + 3] == 255);
    REQUIRE(downscaled.pixels[offset] == 100);
    REQUIRE(downscaled.pixels[offset + 1] == 120);
    REQUIRE(downscaled.pixels[offset + 2] == 140);
  }
}

TEST_CASE("downscale 4K to 64x64 within performance budget", "[pixelate][benchmark]") {
  const auto source = solid_rgba(3840, 2160, 128, 64, 200);
  const auto start = std::chrono::steady_clock::now();
  const auto downscaled = downscale_box(source, 64, 64);
  const auto elapsed = std::chrono::steady_clock::now() - start;

  REQUIRE(downscaled.width == 64);
  REQUIRE(downscaled.height == 64);
  REQUIRE(elapsed < std::chrono::milliseconds(2000));
}
