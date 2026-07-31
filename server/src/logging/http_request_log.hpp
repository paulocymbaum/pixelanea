#pragma once

#include "logging/logger.hpp"

#include <httplib.h>

#include <chrono>
#include <mutex>
#include <string>
#include <unordered_map>

namespace pixelanea::logging {

// Correlates HTTP requests with structured logs via request_id.
class HttpRequestLog {
 public:
  explicit HttpRequestLog(Logger& logger);

  void install(httplib::Server& server) const;

 private:
  struct RequestTiming {
    std::string request_id;
    std::chrono::steady_clock::time_point started_at;
  };

  Logger& logger_;
  mutable std::mutex timing_mutex_;
  mutable std::unordered_map<const void*, RequestTiming> timings_;

  void on_request_started(const httplib::Request& req) const;
  void on_request_completed(const httplib::Request& req, const httplib::Response& res) const;
};

}  // namespace pixelanea::logging
