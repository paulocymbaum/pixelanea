#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <utility>
#include <vector>

namespace pixelanea::domain {

/** Pixel grid index reserved for transparent cells (matches frontend TRANSPARENT_INDEX). */
inline constexpr uint8_t kTransparentPixelIndex = 0;

enum class AssetType {
  Character,
  Prop,
  Background,
  Animation,
};

inline constexpr AssetType kDefaultAssetType = AssetType::Character;

inline std::string asset_type_to_string(AssetType type) {
  switch (type) {
    case AssetType::Character:
      return "character";
    case AssetType::Prop:
      return "prop";
    case AssetType::Background:
      return "background";
    case AssetType::Animation:
      return "animation";
  }
  return "character";
}

inline std::optional<AssetType> asset_type_from_string(const std::string& value) {
  if (value == "character") {
    return AssetType::Character;
  }
  if (value == "prop") {
    return AssetType::Prop;
  }
  if (value == "background") {
    return AssetType::Background;
  }
  if (value == "animation") {
    return AssetType::Animation;
  }
  return std::nullopt;
}

struct ProjectId {
  std::string value;

  ProjectId() = default;
  explicit ProjectId(std::string v) : value(std::move(v)) {}
};

struct Color {
  int slot = 0;
  std::string hex;
  std::optional<std::string> name;
};

struct Palette {
  std::string id;
  std::string name;
  std::vector<Color> colors;
};

struct Project {
  ProjectId id;
  std::string name;
  int width = 0;
  int height = 0;
  int frame_count = 1;
  double fps = 8.0;
  int cell_size = 16;
  AssetType asset_type = kDefaultAssetType;
  bool loop = true;
  std::string created_at;
  std::string updated_at;
};

struct PixelGrid {
  int width = 0;
  int height = 0;
  std::vector<uint8_t> indices;
};

struct Frame {
  int index = 0;
  int width = 0;
  int height = 0;
  std::vector<uint8_t> pixels;
  std::string updated_at;
};

struct FrameMetadata {
  int index = 0;
  int width = 0;
  int height = 0;
  std::string updated_at;
};

struct CreateProjectParams {
  std::string name;
  int width = 32;
  int height = 32;
  int frame_count = 1;
  double fps = 8.0;
  int cell_size = 16;
  AssetType asset_type = kDefaultAssetType;
  bool loop = true;
};

struct UpdateProjectParams {
  std::optional<std::string> name;
  std::optional<double> fps;
  std::optional<int> cell_size;
  std::optional<AssetType> asset_type;
  std::optional<bool> loop;
};

enum class DuplicateFillMode {
  Copy,
  Blank,
};

constexpr DuplicateFillMode kDefaultDuplicateFillMode = DuplicateFillMode::Copy;

struct DuplicateFramesParams {
  int target_frame_count = 8;
  int source_frame_index = 0;
  DuplicateFillMode fill_mode = kDefaultDuplicateFillMode;
};

struct DuplicateFramesResult {
  Project project;
  std::vector<FrameMetadata> frames;
};

struct CopyFrameParams {
  int source_frame_index = 0;
  int target_frame_index = 0;
};

struct ReorderFramesParams {
  int from_index = 0;
  int to_index = 0;
};

}  // namespace pixelanea::domain
