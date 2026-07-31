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
  domain::Result<domain::Project> open_from_bundle(const std::filesystem::path& bundle_path);
  domain::VoidResult save_to_bundle(const domain::ProjectId& id,
                                      const std::filesystem::path& bundle_path);

  Connection& connection_for(const domain::ProjectId& id);
  const Connection& connection_for(const domain::ProjectId& id) const;
  bool has(const domain::ProjectId& id) const;

 private:
  struct ProjectHandle {
    std::unique_ptr<Connection> connection;
    std::filesystem::path db_path;
    std::filesystem::path extract_dir;
  };

  domain::Result<domain::Project> insert_project(Connection& connection,
                                                   const domain::CreateProjectParams& params,
                                                   const domain::ProjectId& id,
                                                   const std::string& now) const;
  domain::Result<domain::Project> read_project(Connection& connection,
                                                 const domain::ProjectId& id) const;
  void seed_default_palette(Connection& connection, const domain::ProjectId& project_id,
                            const std::string& palette_id) const;
  void seed_frames(Connection& connection, const domain::ProjectId& project_id,
                   const domain::CreateProjectParams& params, const std::string& now) const;
  void remove_project_files(const ProjectHandle& handle) const;

  logging::ScopedLogger log_;
  std::filesystem::path data_dir_;
  std::unordered_map<std::string, ProjectHandle> projects_;
};

}  // namespace pixelanea::db
