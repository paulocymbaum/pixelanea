#include "api/api_server.hpp"
#include "api/web_static.hpp"

#include "logging/log_config.hpp"

#include <httplib.h>

#include <cstdlib>
#include <filesystem>
#include <iostream>
#include <optional>
#include <string>
#include <string_view>

namespace {

constexpr const char* kDefaultHost = "127.0.0.1";
constexpr int kDefaultPort = 8787;

struct ServerOptions {
  std::string host = kDefaultHost;
  int port = kDefaultPort;
  std::optional<std::filesystem::path> web_root;
};

void print_usage(const char* program) {
  std::cerr << "Usage: " << program << " [options]\n"
            << "\n"
            << "Options:\n"
            << "  --host HOST       Listen address (default: " << kDefaultHost << ")\n"
            << "  --port PORT       Listen port (default: " << kDefaultPort << ")\n"
            << "  --web-root PATH   Serve built frontend from PATH (desktop mode)\n"
            << "  -h, --help        Show this help\n"
            << "\n"
            << "Environment:\n"
            << "  PIXELANEA_WEB_ROOT  Same as --web-root\n"
            << "  PIXELANEA_HOST      Same as --host\n"
            << "  PIXELANEA_PORT      Same as --port\n";
}

bool parse_port(std::string_view value, int& out) {
  try {
    const auto parsed = std::stoi(std::string(value));
    if (parsed < 1 || parsed > 65535) {
      return false;
    }
    out = parsed;
    return true;
  } catch (...) {
    return false;
  }
}

ServerOptions parse_options(int argc, char** argv) {
  ServerOptions options;

  if (const char* host = std::getenv("PIXELANEA_HOST")) {
    options.host = host;
  }
  if (const char* port = std::getenv("PIXELANEA_PORT")) {
    if (!parse_port(port, options.port)) {
      std::cerr << "invalid PIXELANEA_PORT: " << port << '\n';
      std::exit(1);
    }
  }
  if (const char* web_root = std::getenv("PIXELANEA_WEB_ROOT")) {
    options.web_root = std::filesystem::path(web_root);
  }

  for (int index = 1; index < argc; ++index) {
    const std::string_view arg(argv[index]);
    if (arg == "-h" || arg == "--help") {
      print_usage(argv[0]);
      std::exit(0);
    }
    if (arg == "--host") {
      if (index + 1 >= argc) {
        std::cerr << "--host requires a value\n";
        std::exit(1);
      }
      options.host = argv[++index];
      continue;
    }
    if (arg == "--port") {
      if (index + 1 >= argc) {
        std::cerr << "--port requires a value\n";
        std::exit(1);
      }
      if (!parse_port(argv[++index], options.port)) {
        std::cerr << "invalid --port value\n";
        std::exit(1);
      }
      continue;
    }
    if (arg == "--web-root") {
      if (index + 1 >= argc) {
        std::cerr << "--web-root requires a value\n";
        std::exit(1);
      }
      options.web_root = std::filesystem::path(argv[++index]);
      continue;
    }

    std::cerr << "unknown option: " << arg << '\n';
    print_usage(argv[0]);
    std::exit(1);
  }

  return options;
}

}  // namespace

int main(int argc, char** argv) {
  const auto options = parse_options(argc, argv);
  const auto log_config = pixelanea::logging::log_config_from_env();
  auto logger = pixelanea::logging::create_logger(log_config);

  pixelanea::db::ProjectRepository projects(*logger);
  pixelanea::db::FrameRepository frames(projects, *logger);
  pixelanea::db::PaletteRepository palettes(projects, *logger);
  pixelanea::api::ApiServer api(projects, frames, palettes, *logger);

  httplib::Server server;
  api.register_routes(server);
  if (options.web_root.has_value()) {
    pixelanea::api::register_web_static(server, *options.web_root);
    logger->info("server", "main", "web.static_mounted",
                 {{"web_root", options.web_root->string()}});
  }

  logger->info("server", "main", "server.starting",
               {{"host", options.host}, {"port", options.port}});
  if (!server.listen(options.host.c_str(), options.port)) {
    logger->critical("server", "main", "server.listen_failed",
                       {{"host", options.host}, {"port", options.port}});
    return 1;
  }
  return 0;
}
