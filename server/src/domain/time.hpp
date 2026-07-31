#pragma once

#include <chrono>
#include <iomanip>
#include <random>
#include <sstream>
#include <string>

namespace pixelanea::domain {

inline std::string utc_now_iso8601() {
  const auto now = std::chrono::system_clock::now();
  const auto time = std::chrono::system_clock::to_time_t(now);
  std::tm tm{};
#if defined(_WIN32)
  gmtime_s(&tm, &time);
#else
  gmtime_r(&time, &tm);
#endif
  std::ostringstream out;
  out << std::put_time(&tm, "%Y-%m-%dT%H:%M:%SZ");
  return out.str();
}

inline std::string generate_uuid_v4() {
  static thread_local std::mt19937_64 rng{std::random_device{}()};
  std::uniform_int_distribution<uint64_t> dist;
  const uint64_t a = dist(rng);
  const uint64_t b = dist(rng);

  std::ostringstream out;
  out << std::hex << std::setfill('0');
  out << std::setw(8) << ((a >> 32) & 0xFFFFFFFFULL) << '-';
  out << std::setw(4) << ((a >> 16) & 0xFFFFULL) << '-';
  out << std::setw(4) << (0x4000ULL | (a & 0x0FFFULL)) << '-';
  out << std::setw(4) << (0x8000ULL | ((b >> 48) & 0x3FFFULL)) << '-';
  out << std::setw(12) << (b & 0xFFFFFFFFFFFFULL);
  return out.str();
}

}  // namespace pixelanea::domain
