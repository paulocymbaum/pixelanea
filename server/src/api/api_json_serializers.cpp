#include "api/api_json_serializers.hpp"

namespace pixelanea::api {

nlohmann::json project_to_json(const domain::Project& project) {
  return nlohmann::json{{"id", project.id.value},
                        {"name", project.name},
                        {"width", project.width},
                        {"height", project.height},
                        {"frameCount", project.frame_count},
                        {"fps", project.fps},
                        {"cellSize", project.cell_size},
                        {"assetType", domain::asset_type_to_string(project.asset_type)},
                        {"loop", project.loop},
                        {"createdAt", project.created_at},
                        {"updatedAt", project.updated_at}};
}

nlohmann::json frame_metadata_to_json(const domain::FrameMetadata& frame) {
  return nlohmann::json{{"index", frame.index},
                        {"width", frame.width},
                        {"height", frame.height},
                        {"updatedAt", frame.updated_at}};
}

nlohmann::json frame_to_json(const domain::Frame& frame) {
  return nlohmann::json{{"index", frame.index},
                        {"width", frame.width},
                        {"height", frame.height},
                        {"updatedAt", frame.updated_at},
                        {"pixels", frame.pixels}};
}

nlohmann::json color_to_json(const domain::Color& color) {
  nlohmann::json json{{"slot", color.slot}, {"hex", color.hex}};
  if (color.name) {
    json["name"] = *color.name;
  }
  return json;
}

nlohmann::json palette_to_json(const domain::Palette& palette) {
  nlohmann::json colors = nlohmann::json::array();
  for (const auto& color : palette.colors) {
    colors.push_back(color_to_json(color));
  }
  return nlohmann::json{{"id", palette.id}, {"name", palette.name}, {"colors", colors}};
}

}  // namespace pixelanea::api
