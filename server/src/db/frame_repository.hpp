#pragma once

#include "db/project_repository.hpp"
#include "domain/result.hpp"
#include "domain/types.hpp"
#include "logging/logger.hpp"

namespace pixelanea::db {

class FrameRepository {
 public:
  FrameRepository(ProjectRepository& projects, logging::Logger& logger);

  domain::Result<std::vector<domain::FrameMetadata>> list(const domain::ProjectId& id) const;
  domain::Result<domain::Frame> get(const domain::ProjectId& id, int frame_index) const;
  domain::Result<domain::FrameMetadata> put(const domain::ProjectId& id,
                                              const domain::Frame& frame);
  domain::Result<domain::DuplicateFramesResult> duplicate(
      const domain::ProjectId& id, const domain::DuplicateFramesParams& params);
  domain::Result<domain::FrameMetadata> copy_frame(const domain::ProjectId& id,
                                                   const domain::CopyFrameParams& params);
  domain::Result<std::vector<domain::FrameMetadata>> reorder(
      const domain::ProjectId& id, const domain::ReorderFramesParams& params);

 private:
  ProjectRepository& projects_;
  logging::ScopedLogger log_;
};

}  // namespace pixelanea::db
