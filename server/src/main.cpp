#include "api/api_server.hpp"

#include "logging/log_config.hpp"

#include <httplib.h>

namespace {

constexpr const char* kHost = "127.0.0.1";
constexpr int kPort = 8787;

}  // namespace

int main() {
  const auto log_config = pixelanea::logging::log_config_from_env();
  auto logger = pixelanea::logging::create_logger(log_config);

  pixelanea::db::ProjectRepository projects(*logger);
  pixelanea::db::FrameRepository frames(projects, *logger);
  pixelanea::db::PaletteRepository palettes(projects, *logger);
  pixelanea::api::ApiServer api(projects, frames, palettes, *logger);

  httplib::Server server;
  api.register_routes(server);

  logger->info("server", "main", "server.starting", {{"host", kHost}, {"port", kPort}});
  if (!server.listen(kHost, kPort)) {
    logger->critical("server", "main", "server.listen_failed", {{"host", kHost}, {"port", kPort}});
    return 1;
  }
  return 0;
}
