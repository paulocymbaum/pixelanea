#pragma once

#include "logging/json_line_logger.hpp"
#include "logging/null_logger.hpp"

#include <cstdlib>
#include <memory>
#include <string>

namespace pixelanea::logging {

struct LogConfig {
  LogLevel level = LogLevel::Info;
  LogFormat format = LogFormat::Json;
};

inline LogConfig log_config_from_env() {
  LogConfig config;
  if (const char* level = std::getenv("PIXELANEA_LOG_LEVEL")) {
    config.level = log_level_from_string(level);
  }
  if (const char* format = std::getenv("PIXELANEA_LOG_FORMAT")) {
    config.format = log_format_from_string(format);
  }
  return config;
}

inline std::unique_ptr<Logger> create_logger(const LogConfig& config) {
  if (config.level == LogLevel::Off) {
    return std::make_unique<NullLogger>();
  }
  return std::make_unique<JsonLineLogger>(config.level, config.format);
}

}  // namespace pixelanea::logging
