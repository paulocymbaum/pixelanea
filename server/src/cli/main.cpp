#include "cli/export_command.hpp"

#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {

bool is_flag(std::string_view arg) {
  return arg == "-h" || arg == "--help";
}

}  // namespace

int main(int argc, char** argv) {
  if (argc < 2 || is_flag(argv[1])) {
    pixelanea::cli::print_cli_usage(argv[0]);
    return argc < 2 ? 1 : 0;
  }

  const std::string_view command = argv[1];
  if (command != "export") {
    std::cerr << "unknown command: " << command << '\n';
    pixelanea::cli::print_cli_usage(argv[0]);
    return 1;
  }

  if (argc < 3) {
    std::cerr << "export requires a .pixelanea bundle path\n";
    pixelanea::cli::print_cli_usage(argv[0]);
    return 1;
  }

  pixelanea::cli::ExportOptions options;
  options.bundle_path = argv[2];

  for (int index = 3; index < argc; ++index) {
    const std::string_view arg = argv[index];
    if (arg == "--format") {
      if (index + 1 >= argc) {
        std::cerr << "--format requires a value\n";
        return 1;
      }
      options.format = argv[++index];
      continue;
    }
    if (arg == "--output" || arg == "-o") {
      if (index + 1 >= argc) {
        std::cerr << "--output requires a path\n";
        return 1;
      }
      options.output_path = argv[++index];
      continue;
    }
    if (arg == "--frame") {
      if (index + 1 >= argc) {
        std::cerr << "--frame requires an index\n";
        return 1;
      }
      try {
        options.frame_index = std::stoi(argv[++index]);
      } catch (...) {
        std::cerr << "invalid --frame index\n";
        return 1;
      }
      continue;
    }
    if (is_flag(arg)) {
      pixelanea::cli::print_cli_usage(argv[0]);
      return 0;
    }

    std::cerr << "unknown option: " << arg << '\n';
    pixelanea::cli::print_cli_usage(argv[0]);
    return 1;
  }

  const auto result = pixelanea::cli::run_export_command(options);
  if (!result.has_value()) {
    std::cerr << result.error() << '\n';
    return 1;
  }
  return 0;
}
