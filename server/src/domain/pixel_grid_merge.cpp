#include "domain/pixel_grid_merge.hpp"

#include <utility>

namespace pixelanea::domain {

Result<std::vector<uint8_t>> apply_cell_changes(const std::vector<uint8_t>& pixels, int width,
                                                int height,
                                                const std::vector<CellChange>& changes) {
  if (width <= 0 || height <= 0) {
    return Result<std::vector<uint8_t>>::fail("invalid grid dimensions");
  }

  const std::size_t expected =
      static_cast<std::size_t>(width) * static_cast<std::size_t>(height);
  if (pixels.size() != expected) {
    return Result<std::vector<uint8_t>>::fail("pixel count does not match frame size");
  }

  std::vector<uint8_t> merged = pixels;
  for (const CellChange& change : changes) {
    if (change.previous == change.next) {
      continue;
    }

    if (change.x < 0 || change.y < 0 || change.x >= width || change.y >= height) {
      return Result<std::vector<uint8_t>>::fail("cell out of bounds");
    }

    const std::size_t index =
        static_cast<std::size_t>(change.y) * static_cast<std::size_t>(width) +
        static_cast<std::size_t>(change.x);
    if (merged[index] != change.previous) {
      return Result<std::vector<uint8_t>>::fail("cell conflict");
    }

    merged[index] = change.next;
  }

  return Result<std::vector<uint8_t>>::ok(std::move(merged));
}

}  // namespace pixelanea::domain
