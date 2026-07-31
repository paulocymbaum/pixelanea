#pragma once

#include <cstddef>
#include <cstdint>
#include <filesystem>
#include <string>

namespace pixelanea::bundle {

std::string sha256_hex(const uint8_t* data, std::size_t size);
std::string sha256_hex_file(const std::filesystem::path& path);

}  // namespace pixelanea::bundle
