#pragma once

#include <optional>
#include <string>
#include <utility>
#include <vector>

namespace pixelanea::domain {

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
};

struct UpdateProjectParams {
  std::optional<std::string> name;
  std::optional<double> fps;
  std::optional<int> cell_size;
};

struct DuplicateFramesParams {
  int target_frame_count = 8;
  int source_frame_index = 0;
};

struct DuplicateFramesResult {
  Project project;
  std::vector<FrameMetadata> frames;
};

}  // namespace pixelanea::domain
