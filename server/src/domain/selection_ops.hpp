#pragma once

#include "domain/cell_change.hpp"
#include "domain/result.hpp"

#include <cstdint>
#include <string>
#include <vector>

namespace pixelanea::domain {

constexpr uint8_t kTransparentIndex = 0;

enum class SelectionShape { Rect, Square, Ellipse };

struct SelectionRect {
  int x = 0;
  int y = 0;
  int width = 0;
  int height = 0;
  SelectionShape shape = SelectionShape::Rect;
};

struct SelectionClipboard {
  int width = 0;
  int height = 0;
  std::vector<uint8_t> pixels;
};

/** Parse selection shape string from API ("rect", "square", "ellipse"). */
Result<SelectionShape> parse_selection_shape(const std::string& shape);

bool is_cell_in_selection(int cell_x, int cell_y, const SelectionRect& selection);

/** Extract palette indices for the selection mask; out-of-mask cells are transparent. */
Result<SelectionClipboard> extract_selection_pixels(const std::vector<uint8_t>& pixels, int grid_width,
                                                    int grid_height, const SelectionRect& selection);

/** Build undoable cell changes that clear non-transparent pixels inside the selection mask. */
Result<std::vector<CellChange>> build_clear_selection_changes(const std::vector<uint8_t>& pixels,
                                                              int grid_width, int grid_height,
                                                              const SelectionRect& selection);

/** Stamp clipboard pixels at origin; includes transparent overwrite for full bbox coverage. */
Result<std::vector<CellChange>> build_paste_changes(const SelectionClipboard& clipboard, int origin_x,
                                                    int origin_y, const std::vector<uint8_t>& pixels,
                                                    int grid_width, int grid_height);

/** Extract, clear source, and stamp at delta in one logical move (single change list). */
Result<std::vector<CellChange>> build_move_selection_changes(const std::vector<uint8_t>& pixels,
                                                              int grid_width, int grid_height,
                                                              const SelectionRect& selection,
                                                              int delta_x, int delta_y);

}  // namespace pixelanea::domain
