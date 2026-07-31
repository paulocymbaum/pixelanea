#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace pixelanea::api {

std::vector<uint8_t> decode_base64(const std::string& input, std::string& error);

}  // namespace pixelanea::api
