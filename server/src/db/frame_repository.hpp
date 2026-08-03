#pragma once

#include "db/project_repository.hpp"
#include "domain/cell_change.hpp"
#include "domain/result.hpp"
#include "domain/types.hpp"
#include "logging/logger.hpp"

#include <cstdint>
#include <string>
#include <unordered_map>
#include <vector>

namespace pixelanea::db {

class FrameRepository {
 public:
  FrameRepository(ProjectRepository& projects, logging::Logger& logger);

  domain::Result<std::vector<domain::FrameMetadata>> list(const domain::ProjectId& id) const;
  domain::Result<domain::Frame> get(const domain::ProjectId& id, int frame_index) const;
  domain::Result<domain::FrameMetadata> put(const domain::ProjectId& id,
                                              const domain::Frame& frame);
  domain::Result<domain::FrameMetadata> patch_cells(
      const domain::ProjectId& id, int frame_index,
      const std::vector<domain::CellChange>& changes);
  domain::Result<domain::DuplicateFramesResult> duplicate(
      const domain::ProjectId& id, const domain::DuplicateFramesParams& params);
  domain::Result<domain::FrameMetadata> copy_frame(const domain::ProjectId& id,
                                                   const domain::CopyFrameParams& params);
  domain::Result<std::vector<domain::FrameMetadata>> reorder(
      const domain::ProjectId& id, const domain::ReorderFramesParams& params);

  void invalidate_project(const domain::ProjectId& id);

 private:
  struct CachedFrame {
    std::vector<uint8_t> pixels;
    uint64_t content_hash = 0;
    int width = 0;
    int height = 0;
    std::string updated_at;
  };

  static uint64_t pixel_content_hash(const std::vector<uint8_t>& pixels);
  void store_cache_entry(const domain::ProjectId& id, const domain::Frame& frame,
                         uint64_t content_hash) const;
  void invalidate_project_cache(const domain::ProjectId& id);

  ProjectRepository& projects_;
  logging::ScopedLogger log_;
  mutable std::unordered_map<std::string, std::unordered_map<int, CachedFrame>> frame_cache_;
};

}  // namespace pixelanea::db
