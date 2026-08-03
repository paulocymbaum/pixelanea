#include "api/api_http_helpers.hpp"

#include "api/http_response.hpp"

#include <algorithm>
#include <exception>
#include <string>

namespace pixelanea::api {

httplib::Response respond_error(const logging::ScopedLogger& log, int status,
                                std::string_view event, const std::string& message,
                                nlohmann::json fields) {
  fields["status"] = status;
  fields["error"] = message;
  if (status >= 500) {
    log.error(event, std::move(fields));
  } else {
    log.warn(event, std::move(fields));
  }
  return error_response(status, message);
}

bool content_type_is_octet_stream(const httplib::Request& req) {
  const std::string content_type = req.get_header_value("Content-Type");
  return content_type.rfind("application/octet-stream", 0) == 0;
}

bool accept_prefers_octet_stream(const httplib::Request& req) {
  const std::string accept = req.get_header_value("Accept");
  if (accept.empty()) {
    return false;
  }

  double octet_q = -1.0;
  double json_q = -1.0;

  std::size_t start = 0;
  while (start < accept.size()) {
    std::size_t end = accept.find(',', start);
    if (end == std::string::npos) {
      end = accept.size();
    }

    std::string token = accept.substr(start, end - start);
    while (!token.empty() && (token.front() == ' ' || token.front() == '\t')) {
      token.erase(token.begin());
    }
    while (!token.empty() && (token.back() == ' ' || token.back() == '\t')) {
      token.pop_back();
    }

    double q = 1.0;
    const std::size_t semicolon = token.find(';');
    std::string media = token;
    if (semicolon != std::string::npos) {
      media = token.substr(0, semicolon);
      std::string params = token.substr(semicolon + 1);
      while (!params.empty() && (params.front() == ' ' || params.front() == '\t')) {
        params.erase(params.begin());
      }
      if (params.rfind("q=", 0) == 0) {
        try {
          q = std::stod(params.substr(2));
        } catch (const std::exception&) {
          q = 0.0;
        }
      }
    }

    while (!media.empty() && (media.back() == ' ' || media.back() == '\t')) {
      media.pop_back();
    }

    if (media == "application/octet-stream") {
      octet_q = std::max(octet_q, q);
    }
    if (media == "application/json") {
      json_q = std::max(json_q, q);
    }

    start = end + 1;
  }

  if (octet_q < 0.0) {
    return false;
  }
  if (json_q < 0.0) {
    return true;
  }
  return octet_q > json_q;
}

void set_frame_binary_headers(httplib::Response& res, const domain::Frame& frame) {
  res.set_header("X-Frame-Index", std::to_string(frame.index));
  res.set_header("X-Frame-Width", std::to_string(frame.width));
  res.set_header("X-Frame-Height", std::to_string(frame.height));
  res.set_header("X-Frame-Updated-At", frame.updated_at);
}

}  // namespace pixelanea::api
