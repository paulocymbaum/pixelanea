#pragma once

#include "api/handler_deps.hpp"

#include <httplib.h>

namespace pixelanea::api {

httplib::Response handle_get_palette(const httplib::Request& req, const HandlerDeps& deps);
httplib::Response handle_put_palette(const httplib::Request& req, const HandlerDeps& deps);

}  // namespace pixelanea::api
