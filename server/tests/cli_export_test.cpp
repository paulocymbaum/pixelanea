#include <catch2/catch_test_macros.hpp>

#include "cli/export_command.hpp"
#include "db/frame_repository.hpp"
#include "db/project_repository.hpp"
#include "logging/null_logger.hpp"

#include <filesystem>
#include <fstream>

using pixelanea::db::FrameRepository;
using pixelanea::db::ProjectRepository;
using pixelanea::domain::CreateProjectParams;
using pixelanea::domain::Frame;
using pixelanea::domain::ProjectId;
using pixelanea::logging::NullLogger;

namespace {

std::filesystem::path temp_cli_dir(const std::string& label) {
  const auto dir =
      std::filesystem::temp_directory_path() / "pixelanea-cli-tests" / label;
  std::error_code ec;
  std::filesystem::create_directories(dir, ec);
  return dir;
}

}  // namespace

TEST_CASE("cli export writes PNG from bundle", "[cli][export]") {
  NullLogger logger;
  ProjectRepository projects(logger);
  FrameRepository frames(projects, logger);

  CreateProjectParams params;
  params.name = "CLI Export";
  params.width = 2;
  params.height = 2;
  params.frame_count = 1;

  const auto created = projects.create(params);
  REQUIRE(created.has_value());
  const ProjectId id = created.value().id;

  Frame frame;
  frame.index = 0;
  frame.width = 2;
  frame.height = 2;
  frame.pixels = {0, 1, 2, 0};
  REQUIRE(frames.put(id, frame).has_value());

  const auto work_dir = temp_cli_dir("export-png");
  const auto bundle_path = work_dir / "hero.pixelanea";
  const auto output_path = work_dir / "hero.png";

  REQUIRE(projects.save_to_bundle(id, bundle_path).has_value());
  REQUIRE(projects.close(id).has_value());

  pixelanea::cli::ExportOptions options;
  options.bundle_path = bundle_path;
  options.output_path = output_path;
  options.format = "png";
  options.frame_index = 0;

  const auto result = pixelanea::cli::run_export_command(options);
  REQUIRE(result.has_value());
  REQUIRE(std::filesystem::exists(output_path));
  REQUIRE(std::filesystem::file_size(output_path) > 32);

  std::ifstream png(output_path, std::ios::binary);
  char header[8] = {};
  png.read(header, 8);
  REQUIRE(png.gcount() == 8);
  REQUIRE(header[0] == static_cast<char>(0x89));
  REQUIRE(header[1] == 'P');
  REQUIRE(header[2] == 'N');
  REQUIRE(header[3] == 'G');
}

TEST_CASE("cli export rejects unsupported format", "[cli][export]") {
  pixelanea::cli::ExportOptions options;
  options.bundle_path = "missing.pixelanea";
  options.format = "gif";
  const auto result = pixelanea::cli::run_export_command(options);
  REQUIRE_FALSE(result.has_value());
  REQUIRE(result.error().find("unsupported format") != std::string::npos);
}
