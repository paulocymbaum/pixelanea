#pragma once

#include <filesystem>
#include <memory>
#include <string>

struct sqlite3;

namespace pixelanea::db {

class Connection {
 public:
  static std::unique_ptr<Connection> open(const std::filesystem::path& db_path);
  ~Connection();

  Connection(const Connection&) = delete;
  Connection& operator=(const Connection&) = delete;

  sqlite3* handle() const { return db_; }

 private:
  explicit Connection(sqlite3* db);

  sqlite3* db_;
};

}  // namespace pixelanea::db
