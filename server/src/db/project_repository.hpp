#pragma once

#include "db/connection.hpp"
#include "domain/result.hpp"
#include "domain/types.hpp"
#include "logging/logger.hpp"

#include <filesystem>
#include <memory>
#include <unordered_map>

namespace pixelanea::db {

class ProjectRepository {
 public:
  explicit ProjectRepository(logging::Logger& logger);
  domain::Result<domain::Project> create(const domain::CreateProjectParams& params);
  domain::Result<domain::Project> get(const domain::ProjectId& id) const;
  domain::Result<domain::Project> update(const domain::ProjectId& id,
                                           const domain::UpdateProjectParams& params);
  domain::VoidResult close(const domain::ProjectId& id);

  Connection& connection_for(const domain::ProjectId& id);
  const Connection& connection_for(const domain::ProjectId& id) const;
  bool has(const domain::ProjectId& id) const;

 private:
  domain::Result<domain::Project> insert_project(Connection& connection,
                                                   const domain::CreateProjectParams& params,
                                                   const domain::ProjectId& id,
                                                   const std::string& now) const;
  void seed_default_palette(Connection& connection, const domain::ProjectId& project_id,
                            const std::string& palette_id) const;
  void seed_frames(Connection& connection, const domain::ProjectId& project_id,
                   const domain::CreateProjectParams& params, const std::string& now) const;

  logging::ScopedLogger log_;
  std::filesystem::path data_dir_;
  std::unordered_map<std::string, std::unique_ptr<Connection>> connections_;
};

}  // namespace pixelanea::db
