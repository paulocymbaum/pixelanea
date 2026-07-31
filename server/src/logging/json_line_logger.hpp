#pragma once

#include "logging/logger.hpp"

#include <iostream>
#include <mutex>
#include <ostream>

namespace pixelanea::logging {

enum class LogFormat { Json, Text };

constexpr std::string_view to_string(LogFormat format) {
  switch (format) {
    case LogFormat::Json:
      return "json";
    case LogFormat::Text:
      return "text";
  }
  return "json";
}

inline LogFormat log_format_from_string(std::string_view value) {
  if (value == "text" || value == "human") {
    return LogFormat::Text;
  }
  return LogFormat::Json;
}

// Emits one agent-friendly NDJSON record per line (default) or human-readable text.
class JsonLineLogger final : public Logger {
 public:
  JsonLineLogger(LogLevel min_level, LogFormat format, std::ostream& info_out = std::cout,
                 std::ostream& error_out = std::cerr);

  bool is_enabled(LogLevel level) const override;
  void log(LogLevel level, std::string_view layer, std::string_view component,
           std::string_view event, nlohmann::json fields) const override;
  std::unique_ptr<Logger> with_context(nlohmann::json context) const override;

 private:
  LogLevel min_level_;
  LogFormat format_;
  std::ostream& info_out_;
  std::ostream& error_out_;
  mutable std::mutex mutex_;
  nlohmann::json context_;
};

}  // namespace pixelanea::logging
