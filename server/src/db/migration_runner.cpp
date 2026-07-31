#include "db/migration_runner.hpp"

#include <sqlite3.h>

#include <algorithm>
#include <cctype>
#include <fstream>
#include <sstream>
#include <stdexcept>
#include <vector>

namespace pixelanea::db {

namespace {

bool table_exists(sqlite3* db, const char* name) {
  const char* sql =
      "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?";
  sqlite3_stmt* stmt = nullptr;
  if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
    return false;
  }
  sqlite3_bind_text(stmt, 1, name, -1, SQLITE_TRANSIENT);
  const bool exists =
      sqlite3_step(stmt) == SQLITE_ROW && sqlite3_column_int(stmt, 0) > 0;
  sqlite3_finalize(stmt);
  return exists;
}

int read_schema_version(sqlite3* db) {
  if (!table_exists(db, "app_meta")) {
    return 0;
  }

  const char* sql = "SELECT value FROM app_meta WHERE key = 'schema_version'";
  sqlite3_stmt* stmt = nullptr;
  if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
    return 0;
  }

  int version = 0;
  if (sqlite3_step(stmt) == SQLITE_ROW) {
    version = sqlite3_column_int(stmt, 0);
  }
  sqlite3_finalize(stmt);
  return version;
}

int migration_version_from_filename(const std::filesystem::path& file) {
  const auto stem = file.stem().string();
  int version = 0;
  for (const char ch : stem) {
    if (!std::isdigit(static_cast<unsigned char>(ch))) {
      break;
    }
    version = version * 10 + (ch - '0');
  }
  return version;
}

}  // namespace

MigrationRunner::MigrationRunner(std::filesystem::path migrations_dir)
    : migrations_dir_(std::move(migrations_dir)) {}

void MigrationRunner::apply_all(Connection& connection) const {
  if (!std::filesystem::exists(migrations_dir_)) {
    throw std::runtime_error("migrations directory not found: " + migrations_dir_.string());
  }

  std::vector<std::filesystem::path> files;
  for (const auto& entry : std::filesystem::directory_iterator(migrations_dir_)) {
    if (entry.is_regular_file() && entry.path().extension() == ".sql") {
      files.push_back(entry.path());
    }
  }
  std::sort(files.begin(), files.end());

  int schema_version = read_schema_version(connection.handle());
  for (const auto& file : files) {
    const int migration_version = migration_version_from_filename(file);
    if (migration_version <= 0 || migration_version <= schema_version) {
      continue;
    }

    std::ifstream in(file);
    if (!in) {
      throw std::runtime_error("failed to read migration: " + file.string());
    }
    std::ostringstream sql;
    sql << in.rdbuf();

    char* err = nullptr;
    if (sqlite3_exec(connection.handle(), sql.str().c_str(), nullptr, nullptr, &err) != SQLITE_OK) {
      const std::string message =
          std::string("migration failed (") + file.filename().string() + "): " + (err ? err : "");
      sqlite3_free(err);
      throw std::runtime_error(message);
    }

    schema_version = read_schema_version(connection.handle());
    if (schema_version < migration_version) {
      throw std::runtime_error("migration did not update schema_version: " + file.filename().string());
    }
  }
}

}  // namespace pixelanea::db
