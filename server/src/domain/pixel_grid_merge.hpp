#pragma once

#include "domain/cell_change.hpp"
#include "domain/result.hpp"

#include <cstdint>
#include <string>
#include <vector>

namespace pixelanea::domain {

/** Applies cell changes to a palette-index grid. Pure logic — no I/O. */
Result<std::vector<uint8_t>> apply_cell_changes(const std::vector<uint8_t>& pixels, int width,
                                                int height,
                                                const std::vector<CellChange>& changes);

}  // namespace pixelanea::domain
