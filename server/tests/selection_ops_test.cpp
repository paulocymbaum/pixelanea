#include <catch2/catch_test_macros.hpp>

#include "domain/selection_ops.hpp"

using pixelanea::domain::CellChange;
using pixelanea::domain::SelectionRect;
using pixelanea::domain::SelectionShape;
using pixelanea::domain::build_clear_selection_changes;
using pixelanea::domain::build_move_selection_changes;
using pixelanea::domain::build_paste_changes;
using pixelanea::domain::extract_selection_pixels;
using pixelanea::domain::is_cell_in_selection;
using pixelanea::domain::kTransparentIndex;

namespace {

std::vector<uint8_t> grid_4x4() {
  return std::vector<uint8_t>(16, kTransparentIndex);
}

SelectionRect rect_selection(int x, int y, int w, int h) {
  return {x, y, w, h, SelectionShape::Rect};
}

SelectionRect ellipse_selection(int x, int y, int w, int h) {
  return {x, y, w, h, SelectionShape::Ellipse};
}

}  // namespace

TEST_CASE("extract_selection_pixels copies rect selection", "[domain][selection_ops]") {
  auto pixels = grid_4x4();
  pixels[0] = 1;
  pixels[1] = 2;
  pixels[4] = 3;
  pixels[5] = 4;

  const auto result = extract_selection_pixels(pixels, 4, 4, rect_selection(0, 0, 2, 2));
  REQUIRE(result.has_value());
  const auto& clip = result.value();
  REQUIRE(clip.width == 2);
  REQUIRE(clip.height == 2);
  REQUIRE(clip.pixels.size() == 4);
  REQUIRE(clip.pixels[0] == 1);
  REQUIRE(clip.pixels[1] == 2);
  REQUIRE(clip.pixels[2] == 3);
  REQUIRE(clip.pixels[3] == 4);
}

TEST_CASE("extract_selection_pixels masks ellipse cells", "[domain][selection_ops]") {
  auto pixels = grid_4x4();
  pixels[5] = 4;

  const auto result = extract_selection_pixels(pixels, 4, 4, ellipse_selection(0, 0, 3, 3));
  REQUIRE(result.has_value());
  const auto& clip = result.value();
  REQUIRE(clip.width == 3);
  REQUIRE(clip.height == 3);
  REQUIRE(clip.pixels[0] == kTransparentIndex);
  REQUIRE(clip.pixels[1 * 3 + 1] == 4);
}

TEST_CASE("build_clear_selection_changes clears masked pixels", "[domain][selection_ops]") {
  auto pixels = grid_4x4();
  pixels[0] = 1;
  pixels[1] = 2;

  const auto result = build_clear_selection_changes(pixels, 4, 4, rect_selection(0, 0, 2, 2));
  REQUIRE(result.has_value());
  const auto& changes = result.value();
  REQUIRE(changes.size() == 2);
  REQUIRE(changes[0].previous == 1);
  REQUIRE(changes[0].next == kTransparentIndex);
  REQUIRE(changes[1].previous == 2);
}

TEST_CASE("build_paste_changes stamps clipboard at origin", "[domain][selection_ops]") {
  const auto pixels = grid_4x4();
  pixelanea::domain::SelectionClipboard clipboard;
  clipboard.width = 2;
  clipboard.height = 2;
  clipboard.pixels = {5, 6, 7, 8};

  const auto result = build_paste_changes(clipboard, 1, 1, pixels, 4, 4);
  REQUIRE(result.has_value());
  const auto& changes = result.value();
  REQUIRE(changes.size() == 4);
  REQUIRE(changes[0].x == 1);
  REQUIRE(changes[0].y == 1);
  REQUIRE(changes[0].next == 5);
}

TEST_CASE("build_move_selection_changes moves rect selection", "[domain][selection_ops]") {
  auto pixels = grid_4x4();
  pixels[0] = 1;
  pixels[1] = 2;
  pixels[4] = 3;
  pixels[5] = 4;

  const auto result =
      build_move_selection_changes(pixels, 4, 4, rect_selection(0, 0, 2, 2), 1, 0);
  REQUIRE(result.has_value());
  const auto& changes = result.value();
  REQUIRE(changes.size() == 8);

  auto merged = pixels;
  for (const CellChange& change : changes) {
    const std::size_t index =
        static_cast<std::size_t>(change.y) * 4 + static_cast<std::size_t>(change.x);
    merged[index] = change.next;
  }

  REQUIRE(merged[0] == kTransparentIndex);
  REQUIRE(merged[4] == kTransparentIndex);
  REQUIRE(merged[1] == 1);
  REQUIRE(merged[2] == 2);
  REQUIRE(merged[5] == 3);
  REQUIRE(merged[6] == 4);
}

TEST_CASE("is_cell_in_selection ellipse center cell", "[domain][selection_ops]") {
  const SelectionRect selection = ellipse_selection(0, 0, 1, 1);
  REQUIRE(is_cell_in_selection(0, 0, selection));
}
