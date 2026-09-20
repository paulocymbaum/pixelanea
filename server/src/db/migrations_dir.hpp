#pragma once

#include <filesystem>

namespace pixelanea::db {

/** True when the directory contains 001_initial.sql (packaged schema). */
bool migrations_dir_is_valid(const std::filesystem::path& dir);

/**
 * Resolve SQL migrations for create/open.
 * Order: PIXELANEA_MIGRATIONS_DIR env, <exe>/migrations, compile-time source tree.
 */
std::filesystem::path resolve_migrations_dir();

}  // namespace pixelanea::db
