#pragma once

#include "domain/cell_change.hpp"
#include "domain/types.hpp"

#include <nlohmann/json.hpp>

#include <optional>
#include <vector>

namespace pixelanea::api {

std::optional<domain::AssetType> parse_asset_type_field(const nlohmann::json& body,
                                                        const char* key);
domain::Palette parse_put_palette_request(const nlohmann::json& body);
domain::CreateProjectParams parse_create_request(const nlohmann::json& body);
domain::UpdateProjectParams parse_update_request(const nlohmann::json& body);
domain::DuplicateFramesParams parse_duplicate_frames_request(const nlohmann::json& body);
domain::CopyFrameParams parse_copy_frame_request(const nlohmann::json& body);
domain::ReorderFramesParams parse_reorder_frames_request(const nlohmann::json& body);
std::vector<domain::CellChange> parse_patch_frame_cells_request(const nlohmann::json& body);

}  // namespace pixelanea::api
