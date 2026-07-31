#pragma once

#include "db/frame_repository.hpp"
#include "db/palette_repository.hpp"
#include "db/project_repository.hpp"
#include "domain/types.hpp"
#include "logging/http_request_log.hpp"

#include <httplib.h>

namespace pixelanea::api {

class ApiServer {
 public:
  ApiServer(db::ProjectRepository& projects, db::FrameRepository& frames,
            db::PaletteRepository& palettes, logging::Logger& logger);

  void register_routes(httplib::Server& server) const;

 private:
  db::ProjectRepository& projects_;
  db::FrameRepository& frames_;
  db::PaletteRepository& palettes_;
  logging::ScopedLogger log_;
  logging::HttpRequestLog http_request_log_;
};

}  // namespace pixelanea::api
