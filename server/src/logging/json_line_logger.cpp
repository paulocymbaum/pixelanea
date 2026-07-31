#include "logging/json_line_logger.hpp"

#include "domain/time.hpp"

#include <chrono>
#include <iomanip>
#include <iostream>
#include <sstream>

namespace pixelanea::logging {

namespace {

std::string utc_now_iso8601_ms() {
  const auto now = std::chrono::system_clock::now();
  const auto millis =
      std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()).count();
  const auto seconds = millis / 1000;
  const auto ms = millis % 1000;

  const auto time = static_cast<std::time_t>(seconds);
  std::tm tm{};
#if defined(_WIN32)
  gmtime_s(&tm, &time);
#else
  gmtime_r(&time, &tm);
#endif

  std::ostringstream out;
  out << std::put_time(&tm, "%Y-%m-%dT%H:%M:%S") << '.' << std::setw(3) << std::setfill('0')
      << ms << 'Z';
  return out.str();
}

nlohmann::json merge_context(const nlohmann::json& context, const nlohmann::json& fields) {
  nlohmann::json merged = nlohmann::json::object();
  if (context.is_object()) {
    merged.update(context);
  }
  if (fields.is_object()) {
    merged.update(fields);
  }
  return merged;
}

std::string flatten_json_value(const nlohmann::json& value) {
  if (value.is_string()) {
    return value.get<std::string>();
  }
  return value.dump();
}

}  // namespace

JsonLineLogger::JsonLineLogger(LogLevel min_level, LogFormat format, std::ostream& info_out,
                               std::ostream& error_out)
    : min_level_(min_level),
      format_(format),
      info_out_(info_out),
      error_out_(error_out),
      context_(nlohmann::json::object()) {}

bool JsonLineLogger::is_enabled(LogLevel level) const {
  return static_cast<int>(level) >= static_cast<int>(min_level_) &&
         min_level_ != LogLevel::Off;
}

void JsonLineLogger::log(LogLevel level, std::string_view layer, std::string_view component,
                         std::string_view event, nlohmann::json fields) const {
  if (!is_enabled(level)) {
    return;
  }

  const auto merged_fields = merge_context(context_, fields);

  std::ostringstream line;
  if (format_ == LogFormat::Json) {
    nlohmann::json record = nlohmann::json::object();
    record["ts"] = utc_now_iso8601_ms();
    record["level"] = to_string(level);
    record["layer"] = layer;
    record["component"] = component;
    record["event"] = event;
    record.update(merged_fields);
    line << record.dump();
  } else {
    line << utc_now_iso8601_ms() << ' ' << to_string(level) << " [" << layer << '/'
         << component << "] " << event;
    if (merged_fields.is_object() && !merged_fields.empty()) {
      for (const auto& [key, value] : merged_fields.items()) {
        line << ' ' << key << '=' << flatten_json_value(value);
      }
    }
  }

  std::ostream& out = (level == LogLevel::Error || level == LogLevel::Critical) ? error_out_
                                                                                : info_out_;
  const std::lock_guard<std::mutex> lock(mutex_);
  out << line.str() << '\n';
  out.flush();
}

std::unique_ptr<Logger> JsonLineLogger::with_context(nlohmann::json context) const {
  auto child = std::make_unique<JsonLineLogger>(min_level_, format_, info_out_, error_out_);
  child->context_ = merge_context(context_, std::move(context));
  return child;
}

}  // namespace pixelanea::logging
