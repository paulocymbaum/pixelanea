#include "api/web_static.hpp"

#include <cstdlib>
#include <iostream>

namespace pixelanea::api {

void register_web_static(httplib::Server& server, const std::filesystem::path& web_root) {
  const auto absolute = std::filesystem::absolute(web_root);
  if (!std::filesystem::is_directory(absolute)) {
    std::cerr << "web root not found: " << absolute << '\n';
    std::exit(1);
  }

  const std::string root = absolute.string();
  if (!server.set_mount_point("/", root)) {
    std::cerr << "failed to mount web root: " << root << '\n';
    std::exit(1);
  }
}

}  // namespace pixelanea::api
