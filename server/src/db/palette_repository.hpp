#pragma once

#include "db/project_repository.hpp"
#include "domain/result.hpp"
#include "domain/types.hpp"
#include "logging/logger.hpp"

namespace pixelanea::db {

class PaletteRepository {
 public:
  PaletteRepository(ProjectRepository& projects, logging::Logger& logger);

  domain::Result<domain::Palette> get_default(const domain::ProjectId& id) const;
  domain::Result<domain::Palette> put_default(const domain::ProjectId& id,
                                                const domain::Palette& palette);

 private:
  ProjectRepository& projects_;
  logging::ScopedLogger log_;
};

}  // namespace pixelanea::db
