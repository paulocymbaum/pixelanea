#pragma once

#include "api/handler_deps.hpp"

#include <httplib.h>

namespace pixelanea::api {

httplib::Response handle_export_gif(const httplib::Request& req, const HandlerDeps& deps);

}  // namespace pixelanea::api
