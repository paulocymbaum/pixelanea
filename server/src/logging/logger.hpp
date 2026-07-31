#pragma once

#include "logging/log_level.hpp"

#include <nlohmann/json.hpp>

#include <memory>
#include <string>
#include <string_view>

namespace pixelanea::logging {

// Abstract logging sink — inject into api/, db/, and other infrastructure layers.
class Logger {
 public:
  virtual ~Logger() = default;

  virtual bool is_enabled(LogLevel level) const = 0;

  virtual void log(LogLevel level, std::string_view layer, std::string_view component,
                   std::string_view event, nlohmann::json fields = nlohmann::json::object()) const = 0;

  void trace(std::string_view layer, std::string_view component, std::string_view event,
             nlohmann::json fields = nlohmann::json::object()) const {
    log(LogLevel::Trace, layer, component, event, std::move(fields));
  }

  void debug(std::string_view layer, std::string_view component, std::string_view event,
             nlohmann::json fields = nlohmann::json::object()) const {
    log(LogLevel::Debug, layer, component, event, std::move(fields));
  }

  void info(std::string_view layer, std::string_view component, std::string_view event,
            nlohmann::json fields = nlohmann::json::object()) const {
    log(LogLevel::Info, layer, component, event, std::move(fields));
  }

  void warn(std::string_view layer, std::string_view component, std::string_view event,
            nlohmann::json fields = nlohmann::json::object()) const {
    log(LogLevel::Warn, layer, component, event, std::move(fields));
  }

  void error(std::string_view layer, std::string_view component, std::string_view event,
             nlohmann::json fields = nlohmann::json::object()) const {
    log(LogLevel::Error, layer, component, event, std::move(fields));
  }

  void critical(std::string_view layer, std::string_view component, std::string_view event,
                nlohmann::json fields = nlohmann::json::object()) const {
    log(LogLevel::Critical, layer, component, event, std::move(fields));
  }

  virtual std::unique_ptr<Logger> with_context(nlohmann::json context) const = 0;
};

// Lightweight view that binds layer/component and merges default context fields.
class ScopedLogger {
 public:
  ScopedLogger(const Logger& logger, std::string layer, std::string component,
               nlohmann::json context = nlohmann::json::object());

  void trace(std::string_view event, nlohmann::json fields = nlohmann::json::object()) const;
  void debug(std::string_view event, nlohmann::json fields = nlohmann::json::object()) const;
  void info(std::string_view event, nlohmann::json fields = nlohmann::json::object()) const;
  void warn(std::string_view event, nlohmann::json fields = nlohmann::json::object()) const;
  void error(std::string_view event, nlohmann::json fields = nlohmann::json::object()) const;
  void critical(std::string_view event, nlohmann::json fields = nlohmann::json::object()) const;

  ScopedLogger scoped(std::string component,
                      nlohmann::json extra_context = nlohmann::json::object()) const;

 private:
  const Logger& logger_;
  std::string layer_;
  std::string component_;
  nlohmann::json context_;
};

}  // namespace pixelanea::logging
