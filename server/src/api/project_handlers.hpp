#pragma once

#include "api/handler_deps.hpp"

#include <httplib.h>

namespace pixelanea::api {

httplib::Response handle_create_project(const httplib::Request& req, const HandlerDeps& deps);
httplib::Response handle_open_project(const httplib::Request& req, const HandlerDeps& deps);
httplib::Response handle_get_project(const httplib::Request& req, const HandlerDeps& deps);
httplib::Response handle_update_project(const httplib::Request& req, const HandlerDeps& deps);
httplib::Response handle_close_project(const httplib::Request& req, const HandlerDeps& deps);
httplib::Response handle_save_project(const httplib::Request& req, const HandlerDeps& deps);

}  // namespace pixelanea::api
