#include "logging/logger.hpp"

namespace pixelanea::logging {

namespace {

nlohmann::json merge_fields(const nlohmann::json& context, nlohmann::json fields) {
  if (!context.is_object() || context.empty()) {
    return fields;
  }
  if (!fields.is_object()) {
    fields = nlohmann::json::object();
  }
  for (const auto& [key, value] : context.items()) {
    if (!fields.contains(key)) {
      fields[key] = value;
    }
  }
  return fields;
}

}  // namespace

ScopedLogger::ScopedLogger(const Logger& logger, std::string layer, std::string component,
                           nlohmann::json context)
    : logger_(logger),
      layer_(std::move(layer)),
      component_(std::move(component)),
      context_(std::move(context)) {}

void ScopedLogger::trace(std::string_view event, nlohmann::json fields) const {
  logger_.trace(layer_, component_, event, merge_fields(context_, std::move(fields)));
}

void ScopedLogger::debug(std::string_view event, nlohmann::json fields) const {
  logger_.debug(layer_, component_, event, merge_fields(context_, std::move(fields)));
}

void ScopedLogger::info(std::string_view event, nlohmann::json fields) const {
  logger_.info(layer_, component_, event, merge_fields(context_, std::move(fields)));
}

void ScopedLogger::warn(std::string_view event, nlohmann::json fields) const {
  logger_.warn(layer_, component_, event, merge_fields(context_, std::move(fields)));
}

void ScopedLogger::error(std::string_view event, nlohmann::json fields) const {
  logger_.error(layer_, component_, event, merge_fields(context_, std::move(fields)));
}

void ScopedLogger::critical(std::string_view event, nlohmann::json fields) const {
  logger_.critical(layer_, component_, event, merge_fields(context_, std::move(fields)));
}

ScopedLogger ScopedLogger::scoped(std::string component,
                                  nlohmann::json extra_context) const {
  nlohmann::json merged = context_;
  if (extra_context.is_object()) {
    for (const auto& [key, value] : extra_context.items()) {
      merged[key] = value;
    }
  }
  return ScopedLogger(logger_, layer_, std::move(component), std::move(merged));
}

}  // namespace pixelanea::logging
