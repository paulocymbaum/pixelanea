#pragma once

#include "db/connection.hpp"

#include <filesystem>

namespace pixelanea::db {

class MigrationRunner {
 public:
  explicit MigrationRunner(std::filesystem::path migrations_dir);

  void apply_all(Connection& connection) const;

 private:
  std::filesystem::path migrations_dir_;
};

}  // namespace pixelanea::db
