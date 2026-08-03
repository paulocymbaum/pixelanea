#include "api/api_request_parsers.hpp"

#include <stdexcept>
#include <string>

namespace pixelanea::api {

std::optional<domain::AssetType> parse_asset_type_field(const nlohmann::json& body,
                                                        const char* key) {
  if (!body.contains(key)) {
    return std::nullopt;
  }
  return domain::asset_type_from_string(body.at(key).get<std::string>());
}

domain::Palette parse_put_palette_request(const nlohmann::json& body) {
  domain::Palette palette;
  if (body.contains("name")) {
    palette.name = body.at("name").get<std::string>();
  }
  for (const auto& item : body.at("colors")) {
    domain::Color color;
    color.slot = item.at("slot").get<int>();
    color.hex = item.at("hex").get<std::string>();
    if (item.contains("name") && !item.at("name").is_null()) {
      color.name = item.at("name").get<std::string>();
    }
    palette.colors.push_back(std::move(color));
  }
  return palette;
}

domain::CreateProjectParams parse_create_request(const nlohmann::json& body) {
  domain::CreateProjectParams params;
  params.name = body.at("name").get<std::string>();
  params.width = body.at("width").get<int>();
  params.height = body.at("height").get<int>();
  if (body.contains("frameCount")) {
    params.frame_count = body.at("frameCount").get<int>();
  }
  if (body.contains("fps")) {
    params.fps = body.at("fps").get<double>();
  }
  if (body.contains("cellSize")) {
    params.cell_size = body.at("cellSize").get<int>();
  }
  if (const auto asset_type = parse_asset_type_field(body, "assetType")) {
    params.asset_type = *asset_type;
  }
  if (body.contains("loop")) {
    params.loop = body.at("loop").get<bool>();
  }
  return params;
}

domain::UpdateProjectParams parse_update_request(const nlohmann::json& body) {
  domain::UpdateProjectParams params;
  if (body.contains("name")) {
    params.name = body.at("name").get<std::string>();
  }
  if (body.contains("fps")) {
    params.fps = body.at("fps").get<double>();
  }
  if (body.contains("cellSize")) {
    params.cell_size = body.at("cellSize").get<int>();
  }
  if (const auto asset_type = parse_asset_type_field(body, "assetType")) {
    params.asset_type = *asset_type;
  }
  if (body.contains("loop")) {
    params.loop = body.at("loop").get<bool>();
  }
  return params;
}

domain::DuplicateFramesParams parse_duplicate_frames_request(const nlohmann::json& body) {
  domain::DuplicateFramesParams params;
  params.target_frame_count = body.at("frameCount").get<int>();
  if (body.contains("sourceFrameIndex")) {
    params.source_frame_index = body.at("sourceFrameIndex").get<int>();
  }
  if (body.contains("fillMode")) {
    const std::string fill_mode = body.at("fillMode").get<std::string>();
    if (fill_mode == "blank") {
      params.fill_mode = domain::DuplicateFillMode::Blank;
    } else if (fill_mode != "copy") {
      throw std::runtime_error("fillMode must be copy or blank");
    }
  }
  return params;
}

domain::CopyFrameParams parse_copy_frame_request(const nlohmann::json& body) {
  domain::CopyFrameParams params;
  params.source_frame_index = body.at("sourceFrameIndex").get<int>();
  params.target_frame_index = body.at("targetFrameIndex").get<int>();
  return params;
}

domain::ReorderFramesParams parse_reorder_frames_request(const nlohmann::json& body) {
  domain::ReorderFramesParams params;
  params.from_index = body.at("fromIndex").get<int>();
  params.to_index = body.at("toIndex").get<int>();
  return params;
}

std::vector<domain::CellChange> parse_patch_frame_cells_request(const nlohmann::json& body) {
  if (!body.is_array()) {
    throw std::runtime_error("request body must be a JSON array of cell changes");
  }

  std::vector<domain::CellChange> changes;
  changes.reserve(body.size());
  for (const auto& item : body) {
    domain::CellChange change;
    change.x = item.at("x").get<int>();
    change.y = item.at("y").get<int>();
    change.previous = static_cast<uint8_t>(item.at("previous").get<int>());
    change.next = static_cast<uint8_t>(item.at("next").get<int>());
    changes.push_back(change);
  }
  return changes;
}

}  // namespace pixelanea::api
