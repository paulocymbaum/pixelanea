#include <catch2/catch_test_macros.hpp>

#include "domain/pixel_grid_merge.hpp"

using pixelanea::domain::CellChange;
using pixelanea::domain::apply_cell_changes;

namespace {

std::vector<uint8_t> grid_4x4() {
  return std::vector<uint8_t>(16, 0);
}

}  // namespace

TEST_CASE("apply_cell_changes applies valid changes", "[domain][pixel_grid_merge]") {
  auto pixels = grid_4x4();
  pixels[0] = 1;

  const std::vector<CellChange> changes{{0, 0, 1, 2}, {1, 0, 0, 3}};
  const auto result = apply_cell_changes(pixels, 4, 4, changes);
  REQUIRE(result.has_value());
  REQUIRE(result.value()[0] == 2);
  REQUIRE(result.value()[1] == 3);
}

TEST_CASE("apply_cell_changes skips no-op cells", "[domain][pixel_grid_merge]") {
  const auto pixels = grid_4x4();
  const std::vector<CellChange> changes{{0, 0, 0, 0}, {2, 2, 1, 1}};
  const auto result = apply_cell_changes(pixels, 4, 4, changes);
  REQUIRE(result.has_value());
  REQUIRE(result.value() == pixels);
}

TEST_CASE("apply_cell_changes rejects out-of-bounds", "[domain][pixel_grid_merge]") {
  const auto pixels = grid_4x4();
  const std::vector<CellChange> changes{{4, 0, 0, 1}};
  const auto result = apply_cell_changes(pixels, 4, 4, changes);
  REQUIRE_FALSE(result.has_value());
  REQUIRE(result.error() == "cell out of bounds");
}

TEST_CASE("apply_cell_changes rejects previous mismatch", "[domain][pixel_grid_merge]") {
  auto pixels = grid_4x4();
  pixels[5] = 4;

  const std::vector<CellChange> changes{{1, 1, 0, 2}};
  const auto result = apply_cell_changes(pixels, 4, 4, changes);
  REQUIRE_FALSE(result.has_value());
  REQUIRE(result.error() == "cell conflict");
}

TEST_CASE("apply_cell_changes overwrites matching previous", "[domain][pixel_grid_merge]") {
  auto pixels = grid_4x4();
  pixels[5] = 4;

  const std::vector<CellChange> changes{{1, 1, 4, 7}};
  const auto result = apply_cell_changes(pixels, 4, 4, changes);
  REQUIRE(result.has_value());
  REQUIRE(result.value()[5] == 7);
}
