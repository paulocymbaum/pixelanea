#pragma once

#include "domain/result.hpp"

#include <filesystem>
#include <string>
#include <string_view>

namespace pixelanea::cli {

struct ExportOptions {
  std::filesystem::path bundle_path;
  std::filesystem::path output_path;
  std::string format = "png";
  int frame_index = 0;
};

/** `pixelanea-cli export <bundle> --format png [--output path] [--frame N]` */
domain::VoidResult run_export_command(const ExportOptions& options);

void print_cli_usage(std::string_view program);

}  // namespace pixelanea::cli
