#include "logging/http_request_log.hpp"

#include "domain/time.hpp"

#include <chrono>

namespace pixelanea::logging {

namespace {

double duration_ms(const std::chrono::steady_clock::time_point& started_at) {
  const auto elapsed = std::chrono::steady_clock::now() - started_at;
  return std::chrono::duration<double, std::milli>(elapsed).count();
}

}  // namespace

HttpRequestLog::HttpRequestLog(Logger& logger) : logger_(logger) {}

void HttpRequestLog::install(httplib::Server& server) const {
  server.set_pre_routing_handler([this](const httplib::Request& req, httplib::Response&) {
    on_request_started(req);
    return httplib::Server::HandlerResponse::Unhandled;
  });

  server.set_logger([this](const httplib::Request& req, const httplib::Response& res) {
    on_request_completed(req, res);
  });
}

void HttpRequestLog::on_request_started(const httplib::Request& req) const {
  RequestTiming timing;
  timing.request_id = domain::generate_uuid_v4();
  timing.started_at = std::chrono::steady_clock::now();

  const std::lock_guard<std::mutex> lock(timing_mutex_);
  timings_[&req] = std::move(timing);
}

void HttpRequestLog::on_request_completed(const httplib::Request& req,
                                          const httplib::Response& res) const {
  RequestTiming timing;
  {
    const std::lock_guard<std::mutex> lock(timing_mutex_);
    const auto it = timings_.find(&req);
    if (it == timings_.end()) {
      timing.request_id = domain::generate_uuid_v4();
      timing.started_at = std::chrono::steady_clock::now();
    } else {
      timing = std::move(it->second);
      timings_.erase(it);
    }
  }

  nlohmann::json fields;
  fields["request_id"] = timing.request_id;
  fields["method"] = req.method;
  fields["path"] = req.path;
  fields["status"] = res.status;
  fields["duration_ms"] = duration_ms(timing.started_at);
  if (!req.remote_addr.empty()) {
    fields["remote_addr"] = req.remote_addr;
  }

  const auto level = res.status >= 500 ? LogLevel::Error
                     : res.status >= 400 ? LogLevel::Warn
                                         : LogLevel::Info;
  logger_.log(level, "api", "http", "http.request.completed", std::move(fields));
}

}  // namespace pixelanea::logging
