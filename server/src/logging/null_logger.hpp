#pragma once

#include "logging/logger.hpp"

namespace pixelanea::logging {

// No-op logger for tests or when logging is disabled.
class NullLogger final : public Logger {
 public:
  bool is_enabled(LogLevel /*level*/) const override { return false; }

  void log(LogLevel /*level*/, std::string_view /*layer*/, std::string_view /*component*/,
           std::string_view /*event*/, nlohmann::json /*fields*/) const override {}

  std::unique_ptr<Logger> with_context(nlohmann::json /*context*/) const override {
    return std::make_unique<NullLogger>();
  }
};

}  // namespace pixelanea::logging
