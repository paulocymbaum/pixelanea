#include <catch2/catch_test_macros.hpp>

#include "export/gif_encoder.hpp"

#include <string>

using pixelanea::domain::Color;
using pixelanea::domain::Palette;
using pixelanea::gif::encode_gif;
using pixelanea::gif::fps_to_frame_delay;
using pixelanea::gif::GifEncodeParams;

namespace {

Palette make_palette() {
  Palette palette;
  palette.id = "test";
  palette.name = "Test";
  palette.colors = {
      Color{.slot = 1, .hex = "#ff0000"},
      Color{.slot = 2, .hex = "#00ff00"},
  };
  return palette;
}

}  // namespace

TEST_CASE("fps_to_frame_delay converts fps to hundredths", "[gif]") {
  REQUIRE(fps_to_frame_delay(8.0) == 13);
  REQUIRE(fps_to_frame_delay(10.0) == 10);
  REQUIRE(fps_to_frame_delay(0.0) == 12);
  REQUIRE(fps_to_frame_delay(100.0) == 6);
}

TEST_CASE("encode_gif produces GIF89a animation", "[gif]") {
  GifEncodeParams params;
  params.width = 2;
  params.height = 2;
  params.fps = 8.0;
  params.loop = true;
  params.palette = make_palette();
  params.frames = {
      std::vector<uint8_t>{1, 2, 2, 1},
      std::vector<uint8_t>{2, 1, 1, 2},
  };

  const auto result = encode_gif(params);
  REQUIRE(result.has_value());
  const auto& bytes = result.value();
  REQUIRE(bytes.size() >= 6);
  REQUIRE(std::string(reinterpret_cast<const char*>(bytes.data()), 6) == "GIF89a");
}

TEST_CASE("encode_gif rejects mismatched frame sizes", "[gif]") {
  GifEncodeParams params;
  params.width = 2;
  params.height = 2;
  params.palette = make_palette();
  params.frames = {std::vector<uint8_t>{1, 2, 2}};

  const auto result = encode_gif(params);
  REQUIRE_FALSE(result.has_value());
}
