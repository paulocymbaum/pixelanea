#include "db/project_repository.hpp"

#include "db/migration_runner.hpp"
#include "db/pixel_blob_codec.hpp"
#include "domain/time.hpp"
#include "export/bundle_io.hpp"

#include <sqlite3.h>

#include <fstream>
#include <sstream>
#include <stdexcept>

namespace pixelanea::db {

namespace {

constexpr const char* kDefaultPalette[] = {
    "#000000", "#FFFFFF", "#FF0044", "#00FF99", "#3399FF", "#FFCC00",
};

domain::Project read_project_row(sqlite3_stmt* stmt) {
  domain::Project project;
  project.id = domain::ProjectId(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0)));
  project.name = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
  project.width = sqlite3_column_int(stmt, 2);
  project.height = sqlite3_column_int(stmt, 3);
  project.frame_count = sqlite3_column_int(stmt, 4);
  project.fps = sqlite3_column_double(stmt, 5);
  project.cell_size = sqlite3_column_int(stmt, 6);
  project.created_at = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 7));
  project.updated_at = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 8));
  const auto* asset_type_text =
      reinterpret_cast<const char*>(sqlite3_column_text(stmt, 9));
  if (asset_type_text != nullptr) {
    const auto parsed = domain::asset_type_from_string(asset_type_text);
    if (parsed) {
      project.asset_type = *parsed;
    }
  }
  return project;
}

}  // namespace

ProjectRepository::ProjectRepository(logging::Logger& logger)
    : log_(logger, "db", "ProjectRepository") {
  data_dir_ = std::filesystem::temp_directory_path() / "pixelanea-projects";
  std::filesystem::create_directories(data_dir_);
  log_.debug("repository.initialized", {{"data_dir", data_dir_.string()}});
}

domain::Result<domain::Project> ProjectRepository::create(
    const domain::CreateProjectParams& params) {
  if (params.name.empty() || params.width <= 0 || params.height <= 0) {
    return domain::Result<domain::Project>::fail("invalid project parameters");
  }
  if (params.frame_count != 1 && params.frame_count != 8 && params.frame_count != 16 &&
      params.frame_count != 32) {
    return domain::Result<domain::Project>::fail("frameCount must be 1, 8, 16, or 32");
  }

  const auto id = domain::ProjectId(domain::generate_uuid_v4());
  const auto db_path = data_dir_ / (id.value + ".db");

  try {
    auto connection = Connection::open(db_path);
    MigrationRunner{std::filesystem::path(PIXELANEA_MIGRATIONS_DIR)}.apply_all(*connection);
    const std::string now = domain::utc_now_iso8601();
    auto project_result = insert_project(*connection, params, id, now);
    if (!project_result.has_value()) {
      return project_result;
    }
    seed_default_palette(*connection, id, domain::generate_uuid_v4());
    seed_frames(*connection, id, params, now);
    ProjectHandle handle;
    handle.connection = std::move(connection);
    handle.db_path = db_path;
    projects_.emplace(id.value, std::move(handle));
    log_.info("project.created",
              {{"project_id", id.value},
               {"name", params.name},
               {"width", params.width},
               {"height", params.height},
               {"frame_count", params.frame_count}});
    return project_result;
  } catch (const std::exception& ex) {
    log_.error("project.create_failed", {{"error", ex.what()}});
    return domain::Result<domain::Project>::fail(ex.what());
  }
}

domain::Result<domain::Project> ProjectRepository::get(const domain::ProjectId& id) const {
  if (!has(id)) {
    return domain::Result<domain::Project>::fail("project not found");
  }

  const auto& connection = connection_for(id);
  const char* sql =
      "SELECT id, name, width, height, frame_count, fps, cell_size, created_at, updated_at, "
      "asset_type "
      "FROM projects WHERE id = ?";

  sqlite3_stmt* stmt = nullptr;
  if (sqlite3_prepare_v2(connection.handle(), sql, -1, &stmt, nullptr) != SQLITE_OK) {
    const std::string message = sqlite3_errmsg(connection.handle());
    log_.error("project.get_failed", {{"project_id", id.value}, {"error", message}});
    return domain::Result<domain::Project>::fail(message);
  }

  sqlite3_bind_text(stmt, 1, id.value.c_str(), -1, SQLITE_TRANSIENT);
  const int step = sqlite3_step(stmt);
  if (step != SQLITE_ROW) {
    sqlite3_finalize(stmt);
    return domain::Result<domain::Project>::fail("project not found");
  }

  auto project = read_project_row(stmt);
  sqlite3_finalize(stmt);
  return domain::Result<domain::Project>::ok(std::move(project));
}

domain::Result<domain::Project> ProjectRepository::update(
    const domain::ProjectId& id, const domain::UpdateProjectParams& params) {
  if (!has(id)) {
    return domain::Result<domain::Project>::fail("project not found");
  }

  auto existing = get(id);
  if (!existing.has_value()) {
    return existing;
  }

  auto project = existing.value();
  if (params.name) {
    project.name = *params.name;
  }
  if (params.fps) {
    project.fps = *params.fps;
  }
  if (params.cell_size) {
    project.cell_size = *params.cell_size;
  }
  if (params.asset_type) {
    project.asset_type = *params.asset_type;
  }
  project.updated_at = domain::utc_now_iso8601();

  auto& connection = connection_for(id);
  const char* sql =
      "UPDATE projects SET name = ?, fps = ?, cell_size = ?, asset_type = ?, updated_at = ? "
      "WHERE id = ?";
  sqlite3_stmt* stmt = nullptr;
  if (sqlite3_prepare_v2(connection.handle(), sql, -1, &stmt, nullptr) != SQLITE_OK) {
    return domain::Result<domain::Project>::fail(sqlite3_errmsg(connection.handle()));
  }

  const std::string asset_type = domain::asset_type_to_string(project.asset_type);
  sqlite3_bind_text(stmt, 1, project.name.c_str(), -1, SQLITE_TRANSIENT);
  sqlite3_bind_double(stmt, 2, project.fps);
  sqlite3_bind_int(stmt, 3, project.cell_size);
  sqlite3_bind_text(stmt, 4, asset_type.c_str(), -1, SQLITE_TRANSIENT);
  sqlite3_bind_text(stmt, 5, project.updated_at.c_str(), -1, SQLITE_TRANSIENT);
  sqlite3_bind_text(stmt, 6, id.value.c_str(), -1, SQLITE_TRANSIENT);

  if (sqlite3_step(stmt) != SQLITE_DONE) {
    const std::string message = sqlite3_errmsg(connection.handle());
    sqlite3_finalize(stmt);
    return domain::Result<domain::Project>::fail(message);
  }
  sqlite3_finalize(stmt);
  return domain::Result<domain::Project>::ok(std::move(project));
}

domain::VoidResult ProjectRepository::close(const domain::ProjectId& id) {
  const auto it = projects_.find(id.value);
  if (it == projects_.end()) {
    return domain::VoidResult::fail("project not found");
  }
  const ProjectHandle handle = std::move(it->second);
  projects_.erase(it);
  remove_project_files(handle);
  log_.info("project.closed", {{"project_id", id.value}});
  return domain::VoidResult::ok();
}

domain::Result<domain::Project> ProjectRepository::open_from_bundle(
    const std::filesystem::path& bundle_path) {
  if (bundle_path.empty()) {
    return domain::Result<domain::Project>::fail("bundle path is required");
  }

  const auto extract_dir = data_dir_ / ("open-" + domain::generate_uuid_v4());
  auto unpacked = bundle::unpack_bundle(bundle_path, extract_dir);
  if (!unpacked.has_value()) {
    std::error_code ec;
    std::filesystem::remove_all(extract_dir, ec);
    return domain::Result<domain::Project>::fail(unpacked.error());
  }

  try {
    auto connection = Connection::open(unpacked.value().db_path);
    MigrationRunner{std::filesystem::path(PIXELANEA_MIGRATIONS_DIR)}.apply_all(*connection);

    const domain::ProjectId manifest_id(unpacked.value().manifest.project_id);
    auto project = read_project(*connection, manifest_id);
    if (!project.has_value()) {
      std::error_code ec;
      std::filesystem::remove_all(extract_dir, ec);
      return domain::Result<domain::Project>::fail(
          "Couldn't open this file. Is it a .pixelanea project?");
    }

    if (has(project.value().id)) {
      std::error_code ec;
      std::filesystem::remove_all(extract_dir, ec);
      return domain::Result<domain::Project>::fail("project is already open");
    }

    ProjectHandle handle;
    handle.connection = std::move(connection);
    handle.db_path = unpacked.value().db_path;
    handle.extract_dir = extract_dir;
    projects_.emplace(project.value().id.value, std::move(handle));

    log_.info("project.opened_from_bundle",
              {{"project_id", project.value().id.value},
               {"bundle_path", bundle_path.string()}});
    return project;
  } catch (const std::exception& ex) {
    std::error_code ec;
    std::filesystem::remove_all(extract_dir, ec);
    log_.error("project.open_bundle_failed", {{"error", ex.what()}});
    return domain::Result<domain::Project>::fail(ex.what());
  }
}

domain::VoidResult ProjectRepository::save_to_bundle(const domain::ProjectId& id,
                                                       const std::filesystem::path& bundle_path) {
  if (!has(id)) {
    return domain::VoidResult::fail("project not found");
  }
  if (bundle_path.empty()) {
    return domain::VoidResult::fail("bundle path is required");
  }

  auto project = get(id);
  if (!project.has_value()) {
    return domain::VoidResult::fail(project.error());
  }

  auto& handle = projects_.at(id.value);
  const auto checkpoint = handle.connection->checkpoint_wal();
  if (!checkpoint.has_value()) {
    return checkpoint;
  }

  const auto updated = update(id, domain::UpdateProjectParams{});
  if (!updated.has_value()) {
    return domain::VoidResult::fail(updated.error());
  }

  bundle::PackBundleParams params;
  params.db_path = handle.db_path;
  params.project = updated.value();
  return bundle::pack_bundle(params, bundle_path);
}

Connection& ProjectRepository::connection_for(const domain::ProjectId& id) {
  return *projects_.at(id.value).connection;
}

const Connection& ProjectRepository::connection_for(const domain::ProjectId& id) const {
  return *projects_.at(id.value).connection;
}

bool ProjectRepository::has(const domain::ProjectId& id) const {
  return projects_.find(id.value) != projects_.end();
}

void ProjectRepository::remove_project_files(const ProjectHandle& handle) const {
  std::error_code ec;
  if (!handle.extract_dir.empty()) {
    std::filesystem::remove_all(handle.extract_dir, ec);
    return;
  }
  std::filesystem::remove(handle.db_path, ec);
}

domain::Result<domain::Project> ProjectRepository::read_project(
    Connection& connection, const domain::ProjectId& id) const {
  const char* sql =
      "SELECT id, name, width, height, frame_count, fps, cell_size, created_at, updated_at, "
      "asset_type "
      "FROM projects WHERE id = ?";

  sqlite3_stmt* stmt = nullptr;
  if (sqlite3_prepare_v2(connection.handle(), sql, -1, &stmt, nullptr) != SQLITE_OK) {
    return domain::Result<domain::Project>::fail(sqlite3_errmsg(connection.handle()));
  }

  sqlite3_bind_text(stmt, 1, id.value.c_str(), -1, SQLITE_TRANSIENT);
  const int step = sqlite3_step(stmt);
  if (step != SQLITE_ROW) {
    sqlite3_finalize(stmt);
    return domain::Result<domain::Project>::fail("project not found");
  }

  auto project = read_project_row(stmt);
  sqlite3_finalize(stmt);
  return domain::Result<domain::Project>::ok(std::move(project));
}

domain::Result<domain::Project> ProjectRepository::insert_project(
    Connection& connection, const domain::CreateProjectParams& params,
    const domain::ProjectId& id, const std::string& now) const {
  const char* sql =
      "INSERT INTO projects (id, name, width, height, frame_count, fps, cell_size, created_at, "
      "updated_at, asset_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

  sqlite3_stmt* stmt = nullptr;
  if (sqlite3_prepare_v2(connection.handle(), sql, -1, &stmt, nullptr) != SQLITE_OK) {
    return domain::Result<domain::Project>::fail(sqlite3_errmsg(connection.handle()));
  }

  const std::string asset_type = domain::asset_type_to_string(params.asset_type);
  sqlite3_bind_text(stmt, 1, id.value.c_str(), -1, SQLITE_TRANSIENT);
  sqlite3_bind_text(stmt, 2, params.name.c_str(), -1, SQLITE_TRANSIENT);
  sqlite3_bind_int(stmt, 3, params.width);
  sqlite3_bind_int(stmt, 4, params.height);
  sqlite3_bind_int(stmt, 5, params.frame_count);
  sqlite3_bind_double(stmt, 6, params.fps);
  sqlite3_bind_int(stmt, 7, params.cell_size);
  sqlite3_bind_text(stmt, 8, now.c_str(), -1, SQLITE_TRANSIENT);
  sqlite3_bind_text(stmt, 9, now.c_str(), -1, SQLITE_TRANSIENT);
  sqlite3_bind_text(stmt, 10, asset_type.c_str(), -1, SQLITE_TRANSIENT);

  if (sqlite3_step(stmt) != SQLITE_DONE) {
    const std::string message = sqlite3_errmsg(connection.handle());
    sqlite3_finalize(stmt);
    return domain::Result<domain::Project>::fail(message);
  }
  sqlite3_finalize(stmt);

  domain::Project project;
  project.id = id;
  project.name = params.name;
  project.width = params.width;
  project.height = params.height;
  project.frame_count = params.frame_count;
  project.fps = params.fps;
  project.cell_size = params.cell_size;
  project.asset_type = params.asset_type;
  project.created_at = now;
  project.updated_at = now;
  return domain::Result<domain::Project>::ok(std::move(project));
}

void ProjectRepository::seed_default_palette(Connection& connection,
                                               const domain::ProjectId& project_id,
                                               const std::string& palette_id) const {
  const char* palette_sql =
      "INSERT INTO palettes (id, project_id, name, is_default) VALUES (?, ?, 'Default', 1)";
  sqlite3_stmt* palette_stmt = nullptr;
  if (sqlite3_prepare_v2(connection.handle(), palette_sql, -1, &palette_stmt, nullptr) !=
      SQLITE_OK) {
    throw std::runtime_error(sqlite3_errmsg(connection.handle()));
  }
  sqlite3_bind_text(palette_stmt, 1, palette_id.c_str(), -1, SQLITE_TRANSIENT);
  sqlite3_bind_text(palette_stmt, 2, project_id.value.c_str(), -1, SQLITE_TRANSIENT);
  if (sqlite3_step(palette_stmt) != SQLITE_DONE) {
    sqlite3_finalize(palette_stmt);
    throw std::runtime_error("failed to insert default palette");
  }
  sqlite3_finalize(palette_stmt);

  const char* color_sql =
      "INSERT INTO palette_colors (palette_id, slot, hex, name, sort_order) VALUES (?, ?, ?, NULL, ?)";
  for (int slot = 0; slot < 6; ++slot) {
    sqlite3_stmt* color_stmt = nullptr;
    if (sqlite3_prepare_v2(connection.handle(), color_sql, -1, &color_stmt, nullptr) != SQLITE_OK) {
      throw std::runtime_error(sqlite3_errmsg(connection.handle()));
    }
    sqlite3_bind_text(color_stmt, 1, palette_id.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(color_stmt, 2, slot);
    sqlite3_bind_text(color_stmt, 3, kDefaultPalette[slot], -1, SQLITE_STATIC);
    sqlite3_bind_int(color_stmt, 4, slot);
    if (sqlite3_step(color_stmt) != SQLITE_DONE) {
      sqlite3_finalize(color_stmt);
      throw std::runtime_error("failed to insert palette color");
    }
    sqlite3_finalize(color_stmt);
  }
}

void ProjectRepository::seed_frames(Connection& connection, const domain::ProjectId& project_id,
                                    const domain::CreateProjectParams& params,
                                    const std::string& now) const {
  const std::size_t cell_count =
      static_cast<std::size_t>(params.width) * static_cast<std::size_t>(params.height);
  std::vector<uint8_t> empty_indices(cell_count, 0);
  const auto blob = PixelBlobCodec::encode(empty_indices);

  const char* sql =
      "INSERT INTO frames (project_id, frame_index, width, height, pixel_blob, updated_at) "
      "VALUES (?, ?, ?, ?, ?, ?)";

  for (int index = 0; index < params.frame_count; ++index) {
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(connection.handle(), sql, -1, &stmt, nullptr) != SQLITE_OK) {
      throw std::runtime_error(sqlite3_errmsg(connection.handle()));
    }
    sqlite3_bind_text(stmt, 1, project_id.value.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 2, index);
    sqlite3_bind_int(stmt, 3, params.width);
    sqlite3_bind_int(stmt, 4, params.height);
    sqlite3_bind_blob(stmt, 5, blob.data(), static_cast<int>(blob.size()), SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 6, now.c_str(), -1, SQLITE_TRANSIENT);
    if (sqlite3_step(stmt) != SQLITE_DONE) {
      sqlite3_finalize(stmt);
      throw std::runtime_error("failed to seed frame");
    }
    sqlite3_finalize(stmt);
  }
}

}  // namespace pixelanea::db
