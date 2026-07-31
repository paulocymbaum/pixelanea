#include "db/connection.hpp"

#include "domain/result.hpp"

#include <sqlite3.h>

#include <stdexcept>

namespace pixelanea::db {

Connection::Connection(sqlite3* db) : db_(db) {}

Connection::~Connection() {
  if (db_) {
    sqlite3_close(db_);
  }
}

std::unique_ptr<Connection> Connection::open(const std::filesystem::path& db_path) {
  sqlite3* db = nullptr;
  const int rc = sqlite3_open(db_path.string().c_str(), &db);
  if (rc != SQLITE_OK) {
    const std::string message = db ? sqlite3_errmsg(db) : "failed to open database";
    if (db) {
      sqlite3_close(db);
    }
    throw std::runtime_error(message);
  }

  auto connection = std::unique_ptr<Connection>(new Connection(db));

  char* err = nullptr;
  if (sqlite3_exec(db, "PRAGMA foreign_keys = ON;", nullptr, nullptr, &err) != SQLITE_OK) {
    const std::string message = err ? err : "failed to enable foreign keys";
    sqlite3_free(err);
    throw std::runtime_error(message);
  }
  if (sqlite3_exec(db, "PRAGMA journal_mode = WAL;", nullptr, nullptr, &err) != SQLITE_OK) {
    const std::string message = err ? err : "failed to enable WAL";
    sqlite3_free(err);
    throw std::runtime_error(message);
  }

  return connection;
}

domain::VoidResult Connection::checkpoint_wal() const {
  char* err = nullptr;
  if (sqlite3_exec(db_, "PRAGMA wal_checkpoint(FULL);", nullptr, nullptr, &err) != SQLITE_OK) {
    const std::string message = err ? err : "failed to checkpoint WAL";
    sqlite3_free(err);
    return domain::VoidResult::fail(message);
  }
  return domain::VoidResult::ok();
}

}  // namespace pixelanea::db
