#pragma once

#include "api/file_dialog_provider.hpp"

#include "logging/logger.hpp"

namespace pixelanea::api {

class Win32FileDialogProvider final : public FileDialogProvider {
 public:
  explicit Win32FileDialogProvider(logging::Logger& logger);

  PickPathResult pick_path(const PickPathRequest& request) override;

 private:
  logging::ScopedLogger log_;
};

}  // namespace pixelanea::api
