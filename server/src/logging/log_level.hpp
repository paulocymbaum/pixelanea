#pragma once

#include <string_view>

namespace pixelanea::logging {

enum class LogLevel { Trace, Debug, Info, Warn, Error, Critical, Off };

constexpr std::string_view to_string(LogLevel level) {
  switch (level) {
    case LogLevel::Trace:
      return "trace";
    case LogLevel::Debug:
      return "debug";
    case LogLevel::Info:
      return "info";
    case LogLevel::Warn:
      return "warn";
    case LogLevel::Error:
      return "error";
    case LogLevel::Critical:
      return "critical";
    case LogLevel::Off:
      return "off";
  }
  return "unknown";
}

inline LogLevel log_level_from_string(std::string_view value) {
  if (value == "trace") {
    return LogLevel::Trace;
  }
  if (value == "debug") {
    return LogLevel::Debug;
  }
  if (value == "info") {
    return LogLevel::Info;
  }
  if (value == "warn" || value == "warning") {
    return LogLevel::Warn;
  }
  if (value == "error") {
    return LogLevel::Error;
  }
  if (value == "critical" || value == "fatal") {
    return LogLevel::Critical;
  }
  if (value == "off" || value == "none") {
    return LogLevel::Off;
  }
  return LogLevel::Info;
}

}  // namespace pixelanea::logging
