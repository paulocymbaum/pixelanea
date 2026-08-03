#pragma once

#include <cstdint>

namespace pixelanea::domain {

struct CellChange {
  int x = 0;
  int y = 0;
  uint8_t previous = 0;
  uint8_t next = 0;
};

}  // namespace pixelanea::domain
