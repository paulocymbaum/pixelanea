#include "db/frame_repository.hpp"

#include "db/pixel_blob_codec.hpp"
#include "domain/pixel_grid_merge.hpp"
#include "domain/time.hpp"

#include <sqlite3.h>

namespace pixelanea::db {

uint64_t FrameRepository::pixel_content_hash(const std::vector<uint8_t>& pixels) {
  uint64_t hash = 14695981039346656037ULL;
  for (const uint8_t byte : pixels) {
    hash ^= byte;
    hash *= 1099511628211ULL;
  }
  return hash;
}

void FrameRepository::invalidate_project_cache(const domain::ProjectId& id) {
  frame_cache_.erase(id.value);
}

void FrameRepository::invalidate_project(const domain::ProjectId& id) {
  invalidate_project_cache(id);
}

void FrameRepository::store_cache_entry(const domain::ProjectId& id, const domain::Frame& frame,
                                        uint64_t content_hash) const {
  CachedFrame entry;
  entry.pixels = frame.pixels;
  entry.content_hash = content_hash;
  entry.width = frame.width;
  entry.height = frame.height;
  entry.updated_at = frame.updated_at;
  frame_cache_[id.value][frame.index] = std::move(entry);
}

FrameRepository::FrameRepository(ProjectRepository& projects, logging::Logger& logger)
    : projects_(projects), log_(logger, "db", "FrameRepository") {}

domain::Result<std::vector<domain::FrameMetadata>> FrameRepository::list(
    const domain::ProjectId& id) const {
  if (!projects_.has(id)) {
    return domain::Result<std::vector<domain::FrameMetadata>>::fail("project not found");
  }

  const auto& connection = projects_.connection_for(id);
  const char* sql =
      "SELECT frame_index, width, height, updated_at FROM frames WHERE project_id = ? ORDER BY "
      "frame_index";

  sqlite3_stmt* stmt = nullptr;
  if (sqlite3_prepare_v2(connection.handle(), sql, -1, &stmt, nullptr) != SQLITE_OK) {
    const std::string message = sqlite3_errmsg(connection.handle());
    log_.error("frame.list_failed", {{"project_id", id.value}, {"error", message}});
    return domain::Result<std::vector<domain::FrameMetadata>>::fail(message);
  }

  sqlite3_bind_text(stmt, 1, id.value.c_str(), -1, SQLITE_TRANSIENT);

  std::vector<domain::FrameMetadata> frames;
  while (sqlite3_step(stmt) == SQLITE_ROW) {
    domain::FrameMetadata metadata;
    metadata.index = sqlite3_column_int(stmt, 0);
    metadata.width = sqlite3_column_int(stmt, 1);
    metadata.height = sqlite3_column_int(stmt, 2);
    metadata.updated_at = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
    frames.push_back(std::move(metadata));
  }
  sqlite3_finalize(stmt);
  return domain::Result<std::vector<domain::FrameMetadata>>::ok(std::move(frames));
}

domain::Result<domain::Frame> FrameRepository::get(const domain::ProjectId& id,
                                                     int frame_index) const {
  if (!projects_.has(id)) {
    return domain::Result<domain::Frame>::fail("project not found");
  }

  const auto project_cache_it = frame_cache_.find(id.value);
  if (project_cache_it != frame_cache_.end()) {
    const auto frame_it = project_cache_it->second.find(frame_index);
    if (frame_it != project_cache_it->second.end()) {
      const CachedFrame& cached = frame_it->second;
      domain::Frame frame;
      frame.index = frame_index;
      frame.width = cached.width;
      frame.height = cached.height;
      frame.pixels = cached.pixels;
      frame.updated_at = cached.updated_at;
      return domain::Result<domain::Frame>::ok(std::move(frame));
    }
  }

  const auto& connection = projects_.connection_for(id);
  const char* sql =
      "SELECT frame_index, width, height, pixel_blob, updated_at FROM frames WHERE project_id = ? "
      "AND frame_index = ?";

  sqlite3_stmt* stmt = nullptr;
  if (sqlite3_prepare_v2(connection.handle(), sql, -1, &stmt, nullptr) != SQLITE_OK) {
    const std::string message = sqlite3_errmsg(connection.handle());
    log_.error("frame.get_failed", {{"project_id", id.value}, {"frame_index", frame_index},
                                     {"error", message}});
    return domain::Result<domain::Frame>::fail(message);
  }

  sqlite3_bind_text(stmt, 1, id.value.c_str(), -1, SQLITE_TRANSIENT);
  sqlite3_bind_int(stmt, 2, frame_index);

  if (sqlite3_step(stmt) != SQLITE_ROW) {
    sqlite3_finalize(stmt);
    return domain::Result<domain::Frame>::fail("frame not found");
  }

  domain::Frame frame;
  frame.index = sqlite3_column_int(stmt, 0);
  frame.width = sqlite3_column_int(stmt, 1);
  frame.height = sqlite3_column_int(stmt, 2);
  const auto* blob_ptr = static_cast<const uint8_t*>(sqlite3_column_blob(stmt, 3));
  const int blob_size = sqlite3_column_bytes(stmt, 3);
  frame.updated_at = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4));
  const std::vector<uint8_t> blob(blob_ptr, blob_ptr + blob_size);
  sqlite3_finalize(stmt);

  try {
    const std::size_t expected =
        static_cast<std::size_t>(frame.width) * static_cast<std::size_t>(frame.height);
    frame.pixels = PixelBlobCodec::decode(blob, expected);
  } catch (const std::exception& ex) {
    log_.error("frame.decode_failed",
               {{"project_id", id.value}, {"frame_index", frame_index}, {"error", ex.what()}});
    return domain::Result<domain::Frame>::fail(ex.what());
  }

  const uint64_t content_hash = pixel_content_hash(frame.pixels);
  store_cache_entry(id, frame, content_hash);

  return domain::Result<domain::Frame>::ok(std::move(frame));
}

domain::Result<domain::FrameMetadata> FrameRepository::put(const domain::ProjectId& id,
                                                             const domain::Frame& frame) {
  if (!projects_.has(id)) {
    return domain::Result<domain::FrameMetadata>::fail("project not found");
  }

  const std::size_t expected =
      static_cast<std::size_t>(frame.width) * static_cast<std::size_t>(frame.height);
  if (frame.pixels.size() != expected) {
    log_.warn("frame.put_invalid_pixels",
              {{"project_id", id.value},
               {"frame_index", frame.index},
               {"expected", static_cast<int>(expected)},
               {"actual", static_cast<int>(frame.pixels.size())}});
    return domain::Result<domain::FrameMetadata>::fail("pixel count does not match frame size");
  }

  const uint64_t content_hash = pixel_content_hash(frame.pixels);
  const auto project_cache_it = frame_cache_.find(id.value);
  if (project_cache_it != frame_cache_.end()) {
    const auto frame_it = project_cache_it->second.find(frame.index);
    if (frame_it != project_cache_it->second.end()) {
      const CachedFrame& cached = frame_it->second;
      if (cached.content_hash == content_hash && cached.width == frame.width &&
          cached.height == frame.height) {
        log_.debug("frame.put_skipped",
                   {{"project_id", id.value},
                    {"frame_index", frame.index},
                    {"width", frame.width},
                    {"height", frame.height}});
        domain::FrameMetadata metadata;
        metadata.index = frame.index;
        metadata.width = frame.width;
        metadata.height = frame.height;
        metadata.updated_at = cached.updated_at;
        return domain::Result<domain::FrameMetadata>::ok(std::move(metadata));
      }
    }
  }

  auto& connection = projects_.connection_for(id);
  const auto blob = PixelBlobCodec::encode(frame.pixels);
  const std::string now = domain::utc_now_iso8601();

  const char* sql =
      "UPDATE frames SET width = ?, height = ?, pixel_blob = ?, updated_at = ? "
      "WHERE project_id = ? AND frame_index = ?";

  sqlite3_stmt* stmt = nullptr;
  if (sqlite3_prepare_v2(connection.handle(), sql, -1, &stmt, nullptr) != SQLITE_OK) {
    const std::string message = sqlite3_errmsg(connection.handle());
    log_.error("frame.put_failed",
               {{"project_id", id.value}, {"frame_index", frame.index}, {"error", message}});
    return domain::Result<domain::FrameMetadata>::fail(message);
  }

  sqlite3_bind_int(stmt, 1, frame.width);
  sqlite3_bind_int(stmt, 2, frame.height);
  sqlite3_bind_blob(stmt, 3, blob.data(), static_cast<int>(blob.size()), SQLITE_TRANSIENT);
  sqlite3_bind_text(stmt, 4, now.c_str(), -1, SQLITE_TRANSIENT);
  sqlite3_bind_text(stmt, 5, id.value.c_str(), -1, SQLITE_TRANSIENT);
  sqlite3_bind_int(stmt, 6, frame.index);

  if (sqlite3_step(stmt) != SQLITE_DONE) {
    const std::string message = sqlite3_errmsg(connection.handle());
    sqlite3_finalize(stmt);
    log_.error("frame.put_failed",
               {{"project_id", id.value}, {"frame_index", frame.index}, {"error", message}});
    return domain::Result<domain::FrameMetadata>::fail(message);
  }
  if (sqlite3_changes(connection.handle()) == 0) {
    sqlite3_finalize(stmt);
    log_.warn("frame.not_found",
              {{"project_id", id.value}, {"frame_index", frame.index}});
    return domain::Result<domain::FrameMetadata>::fail("frame not found");
  }
  sqlite3_finalize(stmt);

  domain::FrameMetadata metadata;
  metadata.index = frame.index;
  metadata.width = frame.width;
  metadata.height = frame.height;
  metadata.updated_at = now;
  domain::Frame cached_frame = frame;
  cached_frame.updated_at = now;
  store_cache_entry(id, cached_frame, content_hash);
  log_.debug("frame.saved",
             {{"project_id", id.value},
              {"frame_index", frame.index},
              {"width", frame.width},
              {"height", frame.height},
              {"pixel_count", static_cast<int>(frame.pixels.size())}});
  return domain::Result<domain::FrameMetadata>::ok(std::move(metadata));
}

domain::Result<domain::FrameMetadata> FrameRepository::patch_cells(
    const domain::ProjectId& id, int frame_index,
    const std::vector<domain::CellChange>& changes) {
  if (!projects_.has(id)) {
    return domain::Result<domain::FrameMetadata>::fail("project not found");
  }

  auto current = get(id, frame_index);
  if (!current.has_value()) {
    return domain::Result<domain::FrameMetadata>::fail("frame not found");
  }

  auto merged = domain::apply_cell_changes(current.value().pixels, current.value().width,
                                           current.value().height, changes);
  if (!merged.has_value()) {
    return domain::Result<domain::FrameMetadata>::fail(merged.error());
  }

  domain::Frame frame = current.value();
  frame.pixels = std::move(merged.value());
  return put(id, frame);
}

domain::Result<domain::DuplicateFramesResult> FrameRepository::duplicate(
    const domain::ProjectId& id, const domain::DuplicateFramesParams& params) {
  if (!projects_.has(id)) {
    return domain::Result<domain::DuplicateFramesResult>::fail("project not found");
  }

  invalidate_project_cache(id);

  if (params.target_frame_count != 8 && params.target_frame_count != 16 &&
      params.target_frame_count != 32) {
    return domain::Result<domain::DuplicateFramesResult>::fail(
        "frameCount must be 8, 16, or 32");
  }

  if (params.source_frame_index < 0) {
    return domain::Result<domain::DuplicateFramesResult>::fail("invalid source frame index");
  }

  auto source = get(id, params.source_frame_index);
  if (!source.has_value()) {
    return domain::Result<domain::DuplicateFramesResult>::fail("frame not found");
  }

  const auto& source_frame = source.value();
  const auto source_blob = PixelBlobCodec::encode(source_frame.pixels);
  const std::size_t cell_count =
      static_cast<std::size_t>(source_frame.width) * static_cast<std::size_t>(source_frame.height);
  const std::vector<uint8_t> empty_indices(cell_count, 0);
  const auto empty_blob = PixelBlobCodec::encode(empty_indices);
  const std::string now = domain::utc_now_iso8601();

  auto& connection = projects_.connection_for(id);
  const char* project_sql =
      "UPDATE projects SET frame_count = ?, updated_at = ? WHERE id = ?";
  sqlite3_stmt* project_stmt = nullptr;
  if (sqlite3_prepare_v2(connection.handle(), project_sql, -1, &project_stmt, nullptr) !=
      SQLITE_OK) {
    return domain::Result<domain::DuplicateFramesResult>::fail(
        sqlite3_errmsg(connection.handle()));
  }
  sqlite3_bind_int(project_stmt, 1, params.target_frame_count);
  sqlite3_bind_text(project_stmt, 2, now.c_str(), -1, SQLITE_TRANSIENT);
  sqlite3_bind_text(project_stmt, 3, id.value.c_str(), -1, SQLITE_TRANSIENT);
  if (sqlite3_step(project_stmt) != SQLITE_DONE) {
    const std::string message = sqlite3_errmsg(connection.handle());
    sqlite3_finalize(project_stmt);
    return domain::Result<domain::DuplicateFramesResult>::fail(message);
  }
  sqlite3_finalize(project_stmt);

  const char* frame_sql =
      "INSERT OR REPLACE INTO frames (project_id, frame_index, width, height, pixel_blob, "
      "updated_at) VALUES (?, ?, ?, ?, ?, ?)";

  for (int index = 0; index < params.target_frame_count; ++index) {
    const bool use_source =
        params.fill_mode == domain::DuplicateFillMode::Copy ||
        index == params.source_frame_index;
    const auto& blob = use_source ? source_blob : empty_blob;

    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(connection.handle(), frame_sql, -1, &stmt, nullptr) != SQLITE_OK) {
      return domain::Result<domain::DuplicateFramesResult>::fail(
          sqlite3_errmsg(connection.handle()));
    }
    sqlite3_bind_text(stmt, 1, id.value.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 2, index);
    sqlite3_bind_int(stmt, 3, source_frame.width);
    sqlite3_bind_int(stmt, 4, source_frame.height);
    sqlite3_bind_blob(stmt, 5, blob.data(), static_cast<int>(blob.size()), SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 6, now.c_str(), -1, SQLITE_TRANSIENT);
    if (sqlite3_step(stmt) != SQLITE_DONE) {
      const std::string message = sqlite3_errmsg(connection.handle());
      sqlite3_finalize(stmt);
      return domain::Result<domain::DuplicateFramesResult>::fail(message);
    }
    sqlite3_finalize(stmt);
  }

  const char* delete_sql =
      "DELETE FROM frames WHERE project_id = ? AND frame_index >= ?";
  sqlite3_stmt* delete_stmt = nullptr;
  if (sqlite3_prepare_v2(connection.handle(), delete_sql, -1, &delete_stmt, nullptr) !=
      SQLITE_OK) {
    return domain::Result<domain::DuplicateFramesResult>::fail(
        sqlite3_errmsg(connection.handle()));
  }
  sqlite3_bind_text(delete_stmt, 1, id.value.c_str(), -1, SQLITE_TRANSIENT);
  sqlite3_bind_int(delete_stmt, 2, params.target_frame_count);
  if (sqlite3_step(delete_stmt) != SQLITE_DONE) {
    const std::string message = sqlite3_errmsg(connection.handle());
    sqlite3_finalize(delete_stmt);
    return domain::Result<domain::DuplicateFramesResult>::fail(message);
  }
  sqlite3_finalize(delete_stmt);

  const uint64_t source_hash = pixel_content_hash(source_frame.pixels);
  const uint64_t empty_hash = pixel_content_hash(empty_indices);
  for (int index = 0; index < params.target_frame_count; ++index) {
    const bool use_source =
        params.fill_mode == domain::DuplicateFillMode::Copy ||
        index == params.source_frame_index;
    domain::Frame cached;
    cached.index = index;
    cached.width = source_frame.width;
    cached.height = source_frame.height;
    cached.updated_at = now;
    cached.pixels = use_source ? source_frame.pixels : empty_indices;
    store_cache_entry(id, cached, use_source ? source_hash : empty_hash);
  }

  auto project = projects_.get(id);
  if (!project.has_value()) {
    return domain::Result<domain::DuplicateFramesResult>::fail(project.error());
  }

  auto frames = list(id);
  if (!frames.has_value()) {
    return domain::Result<domain::DuplicateFramesResult>::fail(frames.error());
  }

  log_.info("frame.duplicated",
            {{"project_id", id.value},
             {"target_frame_count", params.target_frame_count},
             {"source_frame_index", params.source_frame_index}});

  domain::DuplicateFramesResult result;
  result.project = std::move(project.value());
  result.frames = std::move(frames.value());
  return domain::Result<domain::DuplicateFramesResult>::ok(std::move(result));
}

domain::Result<domain::FrameMetadata> FrameRepository::copy_frame(
    const domain::ProjectId& id, const domain::CopyFrameParams& params) {
  if (!projects_.has(id)) {
    return domain::Result<domain::FrameMetadata>::fail("project not found");
  }

  if (params.source_frame_index < 0 || params.target_frame_index < 0) {
    return domain::Result<domain::FrameMetadata>::fail("invalid frame index");
  }

  if (params.source_frame_index == params.target_frame_index) {
    return domain::Result<domain::FrameMetadata>::fail("source and target must differ");
  }

  auto project = projects_.get(id);
  if (!project.has_value()) {
    return domain::Result<domain::FrameMetadata>::fail(project.error());
  }

  const int frame_count = project.value().frame_count;
  if (params.source_frame_index >= frame_count || params.target_frame_index >= frame_count) {
    return domain::Result<domain::FrameMetadata>::fail("frame not found");
  }

  auto source = get(id, params.source_frame_index);
  if (!source.has_value()) {
    return domain::Result<domain::FrameMetadata>::fail("frame not found");
  }

  domain::Frame target;
  target.index = params.target_frame_index;
  target.width = source.value().width;
  target.height = source.value().height;
  target.pixels = source.value().pixels;

  const auto saved = put(id, target);
  if (!saved.has_value()) {
    return domain::Result<domain::FrameMetadata>::fail(saved.error());
  }

  log_.info("frame.copied",
            {{"project_id", id.value},
             {"source_frame_index", params.source_frame_index},
             {"target_frame_index", params.target_frame_index}});
  return saved;
}

domain::Result<std::vector<domain::FrameMetadata>> FrameRepository::reorder(
    const domain::ProjectId& id, const domain::ReorderFramesParams& params) {
  if (!projects_.has(id)) {
    return domain::Result<std::vector<domain::FrameMetadata>>::fail("project not found");
  }

  invalidate_project_cache(id);

  if (params.from_index < 0 || params.to_index < 0) {
    return domain::Result<std::vector<domain::FrameMetadata>>::fail("invalid frame index");
  }

  if (params.from_index == params.to_index) {
    return list(id);
  }

  auto project = projects_.get(id);
  if (!project.has_value()) {
    return domain::Result<std::vector<domain::FrameMetadata>>::fail(project.error());
  }

  const int frame_count = project.value().frame_count;
  if (params.from_index >= frame_count || params.to_index >= frame_count) {
    return domain::Result<std::vector<domain::FrameMetadata>>::fail("frame not found");
  }

  std::vector<domain::Frame> frames;
  for (int index = 0; index < frame_count; ++index) {
    auto frame = get(id, index);
    if (!frame.has_value()) {
      return domain::Result<std::vector<domain::FrameMetadata>>::fail(frame.error());
    }
    frames.push_back(std::move(frame.value()));
  }

  const auto moved = std::move(frames[params.from_index]);
  frames.erase(frames.begin() + params.from_index);
  frames.insert(frames.begin() + params.to_index, std::move(moved));

  for (int index = 0; index < static_cast<int>(frames.size()); ++index) {
    frames[index].index = index;
    const auto saved = put(id, frames[index]);
    if (!saved.has_value()) {
      return domain::Result<std::vector<domain::FrameMetadata>>::fail(saved.error());
    }
  }

  const std::string now = domain::utc_now_iso8601();
  auto& connection = projects_.connection_for(id);
  const char* project_sql = "UPDATE projects SET updated_at = ? WHERE id = ?";
  sqlite3_stmt* project_stmt = nullptr;
  if (sqlite3_prepare_v2(connection.handle(), project_sql, -1, &project_stmt, nullptr) !=
      SQLITE_OK) {
    return domain::Result<std::vector<domain::FrameMetadata>>::fail(
        sqlite3_errmsg(connection.handle()));
  }
  sqlite3_bind_text(project_stmt, 1, now.c_str(), -1, SQLITE_TRANSIENT);
  sqlite3_bind_text(project_stmt, 2, id.value.c_str(), -1, SQLITE_TRANSIENT);
  if (sqlite3_step(project_stmt) != SQLITE_DONE) {
    const std::string message = sqlite3_errmsg(connection.handle());
    sqlite3_finalize(project_stmt);
    return domain::Result<std::vector<domain::FrameMetadata>>::fail(message);
  }
  sqlite3_finalize(project_stmt);

  auto listed = list(id);
  if (!listed.has_value()) {
    return domain::Result<std::vector<domain::FrameMetadata>>::fail(listed.error());
  }

  log_.info("frame.reordered",
            {{"project_id", id.value},
             {"from_index", params.from_index},
             {"to_index", params.to_index}});
  return listed;
}

}  // namespace pixelanea::db
