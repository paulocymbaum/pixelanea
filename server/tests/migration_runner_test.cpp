#include <catch2/catch_test_macros.hpp>

#include "db/connection.hpp"
#include "db/migration_runner.hpp"

#include <sqlite3.h>

#include <filesystem>

using pixelanea::db::Connection;
using pixelanea::db::MigrationRunner;

namespace {

std::filesystem::path temp_db_path() {
  const auto dir = std::filesystem::temp_directory_path() / "pixelanea-tests";
  std::filesystem::create_directories(dir);
  return dir / "migration_test.db";
}

int query_int(sqlite3* db, const char* sql) {
  sqlite3_stmt* stmt = nullptr;
  REQUIRE(sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) == SQLITE_OK);
  REQUIRE(sqlite3_step(stmt) == SQLITE_ROW);
  const int value = sqlite3_column_int(stmt, 0);
  sqlite3_finalize(stmt);
  return value;
}

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

}  // namespace

TEST_CASE("MigrationRunner applies 001_initial.sql", "[migration]") {
  const auto db_path = temp_db_path();
  std::error_code ec;
  std::filesystem::remove(db_path, ec);

  auto connection = Connection::open(db_path);
  MigrationRunner{std::filesystem::path(PIXELANEA_MIGRATIONS_DIR)}.apply_all(
      *connection);

  auto* db = connection->handle();
  REQUIRE(query_int(db, "SELECT value FROM app_meta WHERE key = 'schema_version'") ==
          2);
  REQUIRE(table_exists(db, "projects"));
  REQUIRE(table_exists(db, "palettes"));
  REQUIRE(table_exists(db, "palette_colors"));
  REQUIRE(table_exists(db, "frames"));
  REQUIRE(table_exists(db, "assets"));

  sqlite3_stmt* stmt = nullptr;
  REQUIRE(sqlite3_prepare_v2(
              db,
              "SELECT COUNT(*) FROM pragma_table_info('projects') WHERE name = 'asset_type'",
              -1,
              &stmt,
              nullptr) == SQLITE_OK);
  REQUIRE(sqlite3_step(stmt) == SQLITE_ROW);
  REQUIRE(sqlite3_column_int(stmt, 0) == 1);
  sqlite3_finalize(stmt);

  std::filesystem::remove(db_path, ec);
}

TEST_CASE("MigrationRunner is idempotent on re-apply", "[migration]") {
  const auto db_path = temp_db_path();
  std::error_code ec;
  std::filesystem::remove(db_path, ec);

  auto connection = Connection::open(db_path);
  const MigrationRunner runner{std::filesystem::path(PIXELANEA_MIGRATIONS_DIR)};
  runner.apply_all(*connection);
  REQUIRE_NOTHROW(runner.apply_all(*connection));

  std::filesystem::remove(db_path, ec);
}
