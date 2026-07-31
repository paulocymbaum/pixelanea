#include "db/palette_repository.hpp"

#include <sqlite3.h>

#include <cctype>
#include <set>
#include <string>

namespace pixelanea::db {

namespace {

bool is_valid_hex(const std::string& hex) {
  if (hex.size() != 7 || hex[0] != '#') {
    return false;
  }
  for (std::size_t i = 1; i < hex.size(); ++i) {
    if (!std::isxdigit(static_cast<unsigned char>(hex[i]))) {
      return false;
    }
  }
  return true;
}

std::string normalize_hex(std::string hex) {
  for (char& c : hex) {
    if (c >= 'a' && c <= 'f') {
      c = static_cast<char>(c - 'a' + 'A');
    }
  }
  return hex;
}

domain::Result<domain::Palette> validate_palette_colors(domain::Palette palette) {
  if (palette.colors.empty()) {
    return domain::Result<domain::Palette>::fail("at least one color required");
  }
  if (palette.colors.size() > 256) {
    return domain::Result<domain::Palette>::fail("palette cannot exceed 256 colors");
  }

  std::set<int> used_slots;
  for (auto& color : palette.colors) {
    if (color.slot < 0 || color.slot > 255) {
      return domain::Result<domain::Palette>::fail("slot must be between 0 and 255");
    }
    if (!used_slots.insert(color.slot).second) {
      return domain::Result<domain::Palette>::fail("duplicate slot");
    }
    if (!is_valid_hex(color.hex)) {
      return domain::Result<domain::Palette>::fail("invalid hex color format");
    }
    color.hex = normalize_hex(std::move(color.hex));
  }
  return domain::Result<domain::Palette>::ok(std::move(palette));
}

}  // namespace

PaletteRepository::PaletteRepository(ProjectRepository& projects, logging::Logger& logger)
    : projects_(projects), log_(logger, "db", "PaletteRepository") {}

domain::Result<domain::Palette> PaletteRepository::get_default(
    const domain::ProjectId& id) const {
  if (!projects_.has(id)) {
    return domain::Result<domain::Palette>::fail("project not found");
  }

  const auto& connection = projects_.connection_for(id);
  const char* palette_sql =
      "SELECT id, name FROM palettes WHERE project_id = ? AND is_default = 1 LIMIT 1";

  sqlite3_stmt* palette_stmt = nullptr;
  if (sqlite3_prepare_v2(connection.handle(), palette_sql, -1, &palette_stmt, nullptr) !=
      SQLITE_OK) {
    const std::string message = sqlite3_errmsg(connection.handle());
    log_.error("palette.get_failed", {{"project_id", id.value}, {"error", message}});
    return domain::Result<domain::Palette>::fail(message);
  }

  sqlite3_bind_text(palette_stmt, 1, id.value.c_str(), -1, SQLITE_TRANSIENT);
  if (sqlite3_step(palette_stmt) != SQLITE_ROW) {
    sqlite3_finalize(palette_stmt);
    return domain::Result<domain::Palette>::fail("palette not found");
  }

  domain::Palette palette;
  palette.id = reinterpret_cast<const char*>(sqlite3_column_text(palette_stmt, 0));
  palette.name = reinterpret_cast<const char*>(sqlite3_column_text(palette_stmt, 1));
  const std::string palette_id = palette.id;
  sqlite3_finalize(palette_stmt);

  const char* color_sql =
      "SELECT slot, hex, name FROM palette_colors WHERE palette_id = ? ORDER BY sort_order";

  sqlite3_stmt* color_stmt = nullptr;
  if (sqlite3_prepare_v2(connection.handle(), color_sql, -1, &color_stmt, nullptr) !=
      SQLITE_OK) {
    return domain::Result<domain::Palette>::fail(sqlite3_errmsg(connection.handle()));
  }

  sqlite3_bind_text(color_stmt, 1, palette_id.c_str(), -1, SQLITE_TRANSIENT);
  while (sqlite3_step(color_stmt) == SQLITE_ROW) {
    domain::Color color;
    color.slot = sqlite3_column_int(color_stmt, 0);
    color.hex = reinterpret_cast<const char*>(sqlite3_column_text(color_stmt, 1));
    if (sqlite3_column_type(color_stmt, 2) != SQLITE_NULL) {
      color.name = reinterpret_cast<const char*>(sqlite3_column_text(color_stmt, 2));
    }
    palette.colors.push_back(std::move(color));
  }
  sqlite3_finalize(color_stmt);

  return domain::Result<domain::Palette>::ok(std::move(palette));
}

domain::Result<domain::Palette> PaletteRepository::put_default(const domain::ProjectId& id,
                                                                 const domain::Palette& palette) {
  if (!projects_.has(id)) {
    return domain::Result<domain::Palette>::fail("project not found");
  }

  auto validated = validate_palette_colors(palette);
  if (!validated.has_value()) {
    log_.warn("palette.validation_failed",
              {{"project_id", id.value}, {"error", validated.error()}});
    return validated;
  }

  auto& connection = projects_.connection_for(id);
  const char* palette_sql =
      "SELECT id, name FROM palettes WHERE project_id = ? AND is_default = 1 LIMIT 1";

  sqlite3_stmt* palette_stmt = nullptr;
  if (sqlite3_prepare_v2(connection.handle(), palette_sql, -1, &palette_stmt, nullptr) !=
      SQLITE_OK) {
    const std::string message = sqlite3_errmsg(connection.handle());
    log_.error("palette.put_failed", {{"project_id", id.value}, {"error", message}});
    return domain::Result<domain::Palette>::fail(message);
  }

  sqlite3_bind_text(palette_stmt, 1, id.value.c_str(), -1, SQLITE_TRANSIENT);
  if (sqlite3_step(palette_stmt) != SQLITE_ROW) {
    sqlite3_finalize(palette_stmt);
    log_.warn("palette.not_found", {{"project_id", id.value}});
    return domain::Result<domain::Palette>::fail("palette not found");
  }

  const std::string palette_id =
      reinterpret_cast<const char*>(sqlite3_column_text(palette_stmt, 0));
  std::string palette_name =
      reinterpret_cast<const char*>(sqlite3_column_text(palette_stmt, 1));
  sqlite3_finalize(palette_stmt);

  if (!palette.name.empty()) {
    palette_name = palette.name;
    const char* update_name_sql = "UPDATE palettes SET name = ? WHERE id = ?";
    sqlite3_stmt* name_stmt = nullptr;
    if (sqlite3_prepare_v2(connection.handle(), update_name_sql, -1, &name_stmt, nullptr) !=
        SQLITE_OK) {
      return domain::Result<domain::Palette>::fail(sqlite3_errmsg(connection.handle()));
    }
    sqlite3_bind_text(name_stmt, 1, palette_name.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(name_stmt, 2, palette_id.c_str(), -1, SQLITE_TRANSIENT);
    if (sqlite3_step(name_stmt) != SQLITE_DONE) {
      const std::string message = sqlite3_errmsg(connection.handle());
      sqlite3_finalize(name_stmt);
      return domain::Result<domain::Palette>::fail(message);
    }
    sqlite3_finalize(name_stmt);
  }

  char* err_msg = nullptr;
  if (sqlite3_exec(connection.handle(), "BEGIN IMMEDIATE", nullptr, nullptr, &err_msg) !=
      SQLITE_OK) {
    const std::string message = err_msg ? err_msg : "failed to begin transaction";
    sqlite3_free(err_msg);
    return domain::Result<domain::Palette>::fail(message);
  }

  const char* delete_sql = "DELETE FROM palette_colors WHERE palette_id = ?";
  sqlite3_stmt* delete_stmt = nullptr;
  if (sqlite3_prepare_v2(connection.handle(), delete_sql, -1, &delete_stmt, nullptr) !=
      SQLITE_OK) {
    sqlite3_exec(connection.handle(), "ROLLBACK", nullptr, nullptr, nullptr);
    return domain::Result<domain::Palette>::fail(sqlite3_errmsg(connection.handle()));
  }

  sqlite3_bind_text(delete_stmt, 1, palette_id.c_str(), -1, SQLITE_TRANSIENT);
  if (sqlite3_step(delete_stmt) != SQLITE_DONE) {
    const std::string message = sqlite3_errmsg(connection.handle());
    sqlite3_finalize(delete_stmt);
    sqlite3_exec(connection.handle(), "ROLLBACK", nullptr, nullptr, nullptr);
    return domain::Result<domain::Palette>::fail(message);
  }
  sqlite3_finalize(delete_stmt);

  const char* insert_sql =
      "INSERT INTO palette_colors (palette_id, slot, hex, name, sort_order) VALUES (?, ?, ?, ?, ?)";
  const auto& colors = validated.value().colors;
  for (const auto& color : colors) {
    sqlite3_stmt* insert_stmt = nullptr;
    if (sqlite3_prepare_v2(connection.handle(), insert_sql, -1, &insert_stmt, nullptr) !=
        SQLITE_OK) {
      sqlite3_exec(connection.handle(), "ROLLBACK", nullptr, nullptr, nullptr);
      return domain::Result<domain::Palette>::fail(sqlite3_errmsg(connection.handle()));
    }

    sqlite3_bind_text(insert_stmt, 1, palette_id.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(insert_stmt, 2, color.slot);
    sqlite3_bind_text(insert_stmt, 3, color.hex.c_str(), -1, SQLITE_TRANSIENT);
    if (color.name) {
      sqlite3_bind_text(insert_stmt, 4, color.name->c_str(), -1, SQLITE_TRANSIENT);
    } else {
      sqlite3_bind_null(insert_stmt, 4);
    }
    sqlite3_bind_int(insert_stmt, 5, color.slot);

    if (sqlite3_step(insert_stmt) != SQLITE_DONE) {
      const std::string message = sqlite3_errmsg(connection.handle());
      sqlite3_finalize(insert_stmt);
      sqlite3_exec(connection.handle(), "ROLLBACK", nullptr, nullptr, nullptr);
      return domain::Result<domain::Palette>::fail(message);
    }
    sqlite3_finalize(insert_stmt);
  }

  if (sqlite3_exec(connection.handle(), "COMMIT", nullptr, nullptr, &err_msg) != SQLITE_OK) {
    const std::string message = err_msg ? err_msg : "failed to commit transaction";
    sqlite3_free(err_msg);
    sqlite3_exec(connection.handle(), "ROLLBACK", nullptr, nullptr, nullptr);
    return domain::Result<domain::Palette>::fail(message);
  }

  domain::Palette result;
  result.id = palette_id;
  result.name = palette_name;
  result.colors = colors;
  log_.debug("palette.saved",
             {{"project_id", id.value},
              {"palette_id", palette_id},
              {"color_count", static_cast<int>(colors.size())}});
  return domain::Result<domain::Palette>::ok(std::move(result));
}

}  // namespace pixelanea::db
