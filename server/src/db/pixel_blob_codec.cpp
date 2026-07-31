#include "db/pixel_blob_codec.hpp"

#include <stdexcept>

namespace pixelanea::db {

namespace {

constexpr uint8_t kRleMarker = 0xFF;

}  // namespace

std::vector<uint8_t> PixelBlobCodec::encode(const std::vector<uint8_t>& indices) {
  std::vector<uint8_t> out;
  out.reserve(indices.size());

  std::size_t i = 0;
  while (i < indices.size()) {
    const uint8_t value = indices[i];
    std::size_t run = 1;
    while (i + run < indices.size() && indices[i + run] == value && run < 255) {
      ++run;
    }

    if (run >= 3 || value == kRleMarker) {
      out.push_back(kRleMarker);
      out.push_back(static_cast<uint8_t>(run));
      out.push_back(value);
    } else {
      for (std::size_t j = 0; j < run; ++j) {
        out.push_back(value);
      }
    }
    i += run;
  }

  return out;
}

std::vector<uint8_t> PixelBlobCodec::decode(const std::vector<uint8_t>& blob,
                                            std::size_t expected_size) {
  std::vector<uint8_t> out;
  out.reserve(expected_size);

  for (std::size_t i = 0; i < blob.size();) {
    if (blob[i] == kRleMarker) {
      if (i + 2 >= blob.size()) {
        throw std::runtime_error("invalid RLE blob");
      }
      const uint8_t run = blob[i + 1];
      const uint8_t value = blob[i + 2];
      out.insert(out.end(), run, value);
      i += 3;
    } else {
      out.push_back(blob[i]);
      ++i;
    }
  }

  if (out.size() != expected_size) {
    throw std::runtime_error("decoded pixel blob size mismatch");
  }
  return out;
}

}  // namespace pixelanea::db
