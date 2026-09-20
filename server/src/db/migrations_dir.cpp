#include "db/migrations_dir.hpp"

#include <cstdlib>
#include <string>

#if defined(_WIN32)
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#elif defined(__APPLE__)
#include <mach-o/dyld.h>
#include <vector>
#else
#include <unistd.h>
#endif

namespace pixelanea::db {

namespace {

std::filesystem::path current_executable_directory() {
#if defined(_WIN32)
  wchar_t buffer[MAX_PATH];
  const DWORD length = GetModuleFileNameW(nullptr, buffer, MAX_PATH);
  if (length == 0 || length >= MAX_PATH) {
    return {};
  }
  std::error_code ec;
  const auto exe = std::filesystem::weakly_canonical(std::filesystem::path(buffer), ec);
  if (ec) {
    return std::filesystem::path(buffer).parent_path();
  }
  return exe.parent_path();
#elif defined(__APPLE__)
  uint32_t size = 0;
  _NSGetExecutablePath(nullptr, &size);
  if (size == 0) {
    return {};
  }
  std::vector<char> buffer(size);
  if (_NSGetExecutablePath(buffer.data(), &size) != 0) {
    return {};
  }
  std::error_code ec;
  const auto exe = std::filesystem::weakly_canonical(std::filesystem::path(buffer.data()), ec);
  if (ec) {
    return std::filesystem::path(buffer.data()).parent_path();
  }
  return exe.parent_path();
#else
  std::error_code ec;
  const auto exe = std::filesystem::canonical("/proc/self/exe", ec);
  if (ec) {
    return {};
  }
  return exe.parent_path();
#endif
}

std::filesystem::path compile_time_migrations_dir() {
#ifdef PIXELANEA_MIGRATIONS_DIR
  return std::filesystem::path(PIXELANEA_MIGRATIONS_DIR);
#else
  return {};
#endif
}

}  // namespace

bool migrations_dir_is_valid(const std::filesystem::path& dir) {
  std::error_code ec;
  if (dir.empty() || !std::filesystem::is_directory(dir, ec)) {
    return false;
  }
  return std::filesystem::is_regular_file(dir / "001_initial.sql", ec);
}

std::filesystem::path resolve_migrations_dir() {
  if (const char* from_env = std::getenv("PIXELANEA_MIGRATIONS_DIR")) {
    const std::filesystem::path env_dir(from_env);
    if (migrations_dir_is_valid(env_dir)) {
      return env_dir;
    }
  }

  const auto exe_dir = current_executable_directory();
  if (!exe_dir.empty()) {
    const auto packaged = exe_dir / "migrations";
    if (migrations_dir_is_valid(packaged)) {
      return packaged;
    }
  }

  const auto compiled = compile_time_migrations_dir();
  if (migrations_dir_is_valid(compiled)) {
    return compiled;
  }

  if (compiled.empty()) {
    return exe_dir / "migrations";
  }
  return compiled;
}

}  // namespace pixelanea::db
