#include "cli/export_command.hpp"

#include "db/frame_repository.hpp"
#include "db/palette_repository.hpp"
#include "db/project_repository.hpp"
#include "export/png_encoder.hpp"
#include "logging/null_logger.hpp"

#include <iostream>

namespace pixelanea::cli {

namespace {

std::filesystem::path default_png_output(const std::filesystem::path& bundle_path,
                                         int frame_index) {
  auto stem = bundle_path.stem().string();
  if (stem.empty()) {
    stem = "project";
  }
  if (frame_index == 0) {
    return bundle_path.parent_path() / (stem + ".png");
  }
  return bundle_path.parent_path() /
         (stem + "-frame-" + std::to_string(frame_index + 1) + ".png");
}

}  // namespace

void print_cli_usage(std::string_view program) {
  std::cerr << "Usage:\n"
            << "  " << program << " export <project.pixelanea> --format png [options]\n"
            << "\n"
            << "Options:\n"
            << "  --format FORMAT   Export format (only png in this spike)\n"
            << "  --output PATH     Output file path (default: beside bundle)\n"
            << "  --frame INDEX     Frame index, zero-based (default: 0)\n"
            << "  -h, --help        Show help\n";
}

domain::VoidResult run_export_command(const ExportOptions& options) {
  if (options.format != "png") {
    return domain::VoidResult::fail("unsupported format: " + options.format + " (only png)");
  }

  logging::NullLogger logger;
  db::ProjectRepository projects(logger);
  db::FrameRepository frames(projects, logger);
  db::PaletteRepository palettes(projects, logger);

  const auto opened = projects.open_from_bundle(options.bundle_path);
  if (!opened.has_value()) {
    return domain::VoidResult::fail(opened.error());
  }

  const domain::ProjectId project_id = opened.value().id;
  const auto frame = frames.get(project_id, options.frame_index);
  if (!frame.has_value()) {
    projects.close(project_id);
    return domain::VoidResult::fail(frame.error());
  }

  const auto palette = palettes.get_default(project_id);
  if (!palette.has_value()) {
    projects.close(project_id);
    return domain::VoidResult::fail(palette.error());
  }

  export_cli::PngEncodeParams encode_params;
  encode_params.width = frame.value().width;
  encode_params.height = frame.value().height;
  encode_params.pixels = &frame.value().pixels;
  encode_params.palette = &palette.value();

  const auto png = export_cli::encode_frame_png(encode_params);
  if (!png.has_value()) {
    projects.close(project_id);
    return domain::VoidResult::fail(png.error());
  }

  const auto output_path = options.output_path.empty()
                               ? default_png_output(options.bundle_path, options.frame_index)
                               : options.output_path;

  const auto written = export_cli::write_png_file(output_path, png.value());
  projects.close(project_id);
  if (!written.has_value()) {
    return written;
  }

  std::cout << output_path.string() << '\n';
  return domain::VoidResult::ok();
}

}  // namespace pixelanea::cli
