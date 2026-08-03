#pragma once

#include "api/file_dialog_provider.hpp"
#include "db/frame_repository.hpp"
#include "db/palette_repository.hpp"
#include "db/project_repository.hpp"
#include "logging/logger.hpp"

namespace pixelanea::api {

struct HandlerDeps {
  db::ProjectRepository& projects;
  db::FrameRepository& frames;
  db::PaletteRepository& palettes;
  const logging::ScopedLogger& log;
  FileDialogProvider* file_dialog;  // nullable
};

}  // namespace pixelanea::api
