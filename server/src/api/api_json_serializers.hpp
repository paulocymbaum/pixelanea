#pragma once

#include "domain/types.hpp"

#include <nlohmann/json.hpp>

namespace pixelanea::api {

nlohmann::json project_to_json(const domain::Project& project);
nlohmann::json frame_metadata_to_json(const domain::FrameMetadata& frame);
nlohmann::json frame_to_json(const domain::Frame& frame);
nlohmann::json color_to_json(const domain::Color& color);
nlohmann::json palette_to_json(const domain::Palette& palette);

}  // namespace pixelanea::api
