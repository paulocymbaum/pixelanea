#pragma once

#include "api/handler_deps.hpp"

#include <httplib.h>

namespace pixelanea::api {

httplib::Response handle_compute_selection(const httplib::Request& req, const HandlerDeps& deps);

}  // namespace pixelanea::api
