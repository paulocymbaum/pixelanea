#include "db/migration_runner.hpp"

#include <sqlite3.h>

#include <algorithm>
#include <fstream>
#include <sstream>
#include <stdexcept>
#include <vector>

namespace pixelanea::db {

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

  for (const auto& file : files) {
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
  }
}

}  // namespace pixelanea::db
