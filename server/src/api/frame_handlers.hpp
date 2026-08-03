#pragma once

#include "api/handler_deps.hpp"

#include <httplib.h>

namespace pixelanea::api {

httplib::Response handle_list_frames(const httplib::Request& req, const HandlerDeps& deps);
httplib::Response handle_duplicate_frames(const httplib::Request& req, const HandlerDeps& deps);
httplib::Response handle_copy_frame(const httplib::Request& req, const HandlerDeps& deps);
httplib::Response handle_reorder_frames(const httplib::Request& req, const HandlerDeps& deps);
httplib::Response handle_get_frame(const httplib::Request& req, const HandlerDeps& deps);
httplib::Response handle_put_frame(const httplib::Request& req, const HandlerDeps& deps);
httplib::Response handle_patch_frame_cells(const httplib::Request& req, const HandlerDeps& deps);

}  // namespace pixelanea::api
