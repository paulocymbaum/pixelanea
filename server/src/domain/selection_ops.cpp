#include "domain/selection_ops.hpp"

#include "domain/pixel_grid_merge.hpp"

#include <cmath>
#include <utility>

namespace pixelanea::domain {

namespace {

bool grid_dimensions_valid(int grid_width, int grid_height,
                           const std::vector<uint8_t>& pixels) {
  if (grid_width <= 0 || grid_height <= 0) {
    return false;
  }
  const std::size_t expected =
      static_cast<std::size_t>(grid_width) * static_cast<std::size_t>(grid_height);
  return pixels.size() == expected;
}

struct EllipseRadii {
  double cx;
  double cy;
  double rx;
  double ry;
};

EllipseRadii ellipse_radii(const SelectionRect& selection) {
  const double cx = selection.x + (selection.width - 1) / 2.0;
  const double cy = selection.y + (selection.height - 1) / 2.0;
  const double rx = (selection.width - 1) / 2.0;
  const double ry = (selection.height - 1) / 2.0;
  return {cx, cy, rx, ry};
}

bool is_cell_in_ellipse(int cell_x, int cell_y, const SelectionRect& selection) {
  const EllipseRadii radii = ellipse_radii(selection);

  if (radii.rx == 0.0 && radii.ry == 0.0) {
    return cell_x == static_cast<int>(std::round(radii.cx)) &&
           cell_y == static_cast<int>(std::round(radii.cy));
  }

  if (radii.rx == 0.0) {
    return cell_x == static_cast<int>(std::round(radii.cx)) &&
           std::abs(cell_y - radii.cy) <= radii.ry;
  }

  if (radii.ry == 0.0) {
    return cell_y == static_cast<int>(std::round(radii.cy)) &&
           std::abs(cell_x - radii.cx) <= radii.rx;
  }

  const double nx = (cell_x - radii.cx) / radii.rx;
  const double ny = (cell_y - radii.cy) / radii.ry;
  return nx * nx + ny * ny <= 1.0;
}

}  // namespace

Result<SelectionShape> parse_selection_shape(const std::string& shape) {
  if (shape == "rect") {
    return Result<SelectionShape>::ok(SelectionShape::Rect);
  }
  if (shape == "square") {
    return Result<SelectionShape>::ok(SelectionShape::Square);
  }
  if (shape == "ellipse") {
    return Result<SelectionShape>::ok(SelectionShape::Ellipse);
  }
  return Result<SelectionShape>::fail("invalid selection shape");
}

bool is_cell_in_selection(int cell_x, int cell_y, const SelectionRect& selection) {
  if (cell_x < selection.x || cell_y < selection.y ||
      cell_x >= selection.x + selection.width || cell_y >= selection.y + selection.height) {
    return false;
  }

  if (selection.shape == SelectionShape::Ellipse) {
    return is_cell_in_ellipse(cell_x, cell_y, selection);
  }

  return true;
}

Result<SelectionClipboard> extract_selection_pixels(const std::vector<uint8_t>& pixels,
                                                     int grid_width, int grid_height,
                                                     const SelectionRect& selection) {
  if (!grid_dimensions_valid(grid_width, grid_height, pixels)) {
    return Result<SelectionClipboard>::fail("pixel count does not match frame size");
  }

  if (selection.width <= 0 || selection.height <= 0) {
    return Result<SelectionClipboard>::fail("invalid selection dimensions");
  }

  SelectionClipboard clipboard;
  clipboard.width = selection.width;
  clipboard.height = selection.height;
  clipboard.pixels.assign(static_cast<std::size_t>(selection.width) *
                              static_cast<std::size_t>(selection.height),
                          kTransparentIndex);

  for (int ly = 0; ly < selection.height; ly++) {
    for (int lx = 0; lx < selection.width; lx++) {
      const int gx = selection.x + lx;
      const int gy = selection.y + ly;
      const std::size_t out_index =
          static_cast<std::size_t>(ly) * static_cast<std::size_t>(selection.width) +
          static_cast<std::size_t>(lx);

      if (!is_cell_in_selection(gx, gy, selection) || gx < 0 || gy < 0 ||
          gx >= grid_width || gy >= grid_height) {
        clipboard.pixels[out_index] = kTransparentIndex;
        continue;
      }

      const std::size_t grid_index =
          static_cast<std::size_t>(gy) * static_cast<std::size_t>(grid_width) +
          static_cast<std::size_t>(gx);
      clipboard.pixels[out_index] = pixels[grid_index];
    }
  }

  return Result<SelectionClipboard>::ok(std::move(clipboard));
}

Result<std::vector<CellChange>> build_clear_selection_changes(const std::vector<uint8_t>& pixels,
                                                              int grid_width, int grid_height,
                                                              const SelectionRect& selection) {
  if (!grid_dimensions_valid(grid_width, grid_height, pixels)) {
    return Result<std::vector<CellChange>>::fail("pixel count does not match frame size");
  }

  if (selection.width <= 0 || selection.height <= 0) {
    return Result<std::vector<CellChange>>::ok({});
  }

  std::vector<CellChange> changes;

  for (int ly = 0; ly < selection.height; ly++) {
    for (int lx = 0; lx < selection.width; lx++) {
      const int gx = selection.x + lx;
      const int gy = selection.y + ly;

      if (!is_cell_in_selection(gx, gy, selection) || gx < 0 || gy < 0 ||
          gx >= grid_width || gy >= grid_height) {
        continue;
      }

      const std::size_t index =
          static_cast<std::size_t>(gy) * static_cast<std::size_t>(grid_width) +
          static_cast<std::size_t>(gx);
      const uint8_t previous = pixels[index];
      if (previous == kTransparentIndex) {
        continue;
      }

      changes.push_back({gx, gy, previous, kTransparentIndex});
    }
  }

  return Result<std::vector<CellChange>>::ok(std::move(changes));
}

Result<std::vector<CellChange>> build_paste_changes(const SelectionClipboard& clipboard,
                                                    int origin_x, int origin_y,
                                                    const std::vector<uint8_t>& pixels,
                                                    int grid_width, int grid_height) {
  if (!grid_dimensions_valid(grid_width, grid_height, pixels)) {
    return Result<std::vector<CellChange>>::fail("pixel count does not match frame size");
  }

  if (clipboard.width <= 0 || clipboard.height <= 0) {
    return Result<std::vector<CellChange>>::ok({});
  }

  const std::size_t expected_clipboard =
      static_cast<std::size_t>(clipboard.width) * static_cast<std::size_t>(clipboard.height);
  if (clipboard.pixels.size() != expected_clipboard) {
    return Result<std::vector<CellChange>>::fail("clipboard pixel count mismatch");
  }

  std::vector<CellChange> changes;

  for (int ly = 0; ly < clipboard.height; ly++) {
    for (int lx = 0; lx < clipboard.width; lx++) {
      const int gx = origin_x + lx;
      const int gy = origin_y + ly;
      if (gx < 0 || gy < 0 || gx >= grid_width || gy >= grid_height) {
        continue;
      }

      const std::size_t clip_index =
          static_cast<std::size_t>(ly) * static_cast<std::size_t>(clipboard.width) +
          static_cast<std::size_t>(lx);
      const uint8_t next = clipboard.pixels[clip_index];

      const std::size_t grid_index =
          static_cast<std::size_t>(gy) * static_cast<std::size_t>(grid_width) +
          static_cast<std::size_t>(gx);
      const uint8_t previous = pixels[grid_index];
      changes.push_back({gx, gy, previous, next});
    }
  }

  return Result<std::vector<CellChange>>::ok(std::move(changes));
}

Result<std::vector<CellChange>> build_move_selection_changes(const std::vector<uint8_t>& pixels,
                                                             int grid_width, int grid_height,
                                                             const SelectionRect& selection,
                                                             int delta_x, int delta_y) {
  auto extracted = extract_selection_pixels(pixels, grid_width, grid_height, selection);
  if (!extracted.has_value()) {
    return Result<std::vector<CellChange>>::fail(extracted.error());
  }

  auto clear_changes = build_clear_selection_changes(pixels, grid_width, grid_height, selection);
  if (!clear_changes.has_value()) {
    return Result<std::vector<CellChange>>::fail(clear_changes.error());
  }

  auto merged_clear = apply_cell_changes(pixels, grid_width, grid_height, clear_changes.value());
  if (!merged_clear.has_value()) {
    return Result<std::vector<CellChange>>::fail(merged_clear.error());
  }

  const int target_x = selection.x + delta_x;
  const int target_y = selection.y + delta_y;
  auto paste_changes =
      build_paste_changes(extracted.value(), target_x, target_y, merged_clear.value(), grid_width,
                          grid_height);
  if (!paste_changes.has_value()) {
    return Result<std::vector<CellChange>>::fail(paste_changes.error());
  }

  std::vector<CellChange> changes = std::move(clear_changes.value());
  const auto& paste = paste_changes.value();
  changes.insert(changes.end(), paste.begin(), paste.end());
  return Result<std::vector<CellChange>>::ok(std::move(changes));
}

}  // namespace pixelanea::domain
