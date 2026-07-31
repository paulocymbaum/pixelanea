#include <catch2/catch_test_macros.hpp>

#include "db/frame_repository.hpp"
#include "db/project_repository.hpp"
#include "export/bundle_io.hpp"
#include "logging/null_logger.hpp"

#include <zip.h>

#include <filesystem>
#include <fstream>

using pixelanea::bundle::PackBundleParams;
using pixelanea::bundle::kDbEntryName;
using pixelanea::bundle::kManifestEntryName;
using pixelanea::bundle::pack_bundle;
using pixelanea::bundle::unpack_bundle;
using pixelanea::db::FrameRepository;
using pixelanea::db::ProjectRepository;
using pixelanea::domain::CreateProjectParams;
using pixelanea::domain::Frame;
using pixelanea::domain::ProjectId;
using pixelanea::logging::NullLogger;

namespace {

std::filesystem::path temp_test_dir(const std::string& label) {
  const auto dir = std::filesystem::temp_directory_path() / "pixelanea-bundle-tests" / label;
  std::error_code ec;
  std::filesystem::create_directories(dir, ec);
  return dir;
}

pixelanea::domain::Project create_sample_project(ProjectRepository& projects) {
  CreateProjectParams params;
  params.name = "Bundle Test";
  params.width = 4;
  params.height = 4;
  params.frame_count = 1;
  const auto created = projects.create(params);
  REQUIRE(created.has_value());
  return created.value();
}

pixelanea::domain::VoidResult create_malicious_zip(const std::filesystem::path& zip_path) {
  int error = 0;
  zip_t* archive = zip_open(zip_path.string().c_str(), ZIP_CREATE | ZIP_TRUNCATE, &error);
  if (!archive) {
    return pixelanea::domain::VoidResult::fail("could not create test zip");
  }

  const char payload[] = "evil";
  zip_source_t* source = zip_source_buffer(archive, payload, sizeof(payload) - 1, 0);
  if (!source) {
    zip_close(archive);
    return pixelanea::domain::VoidResult::fail("could not create zip source");
  }
  if (zip_file_add(archive, "../escape.txt", source, ZIP_FL_OVERWRITE) < 0) {
    zip_source_free(source);
    zip_close(archive);
    return pixelanea::domain::VoidResult::fail("could not add malicious entry");
  }
  if (zip_close(archive) < 0) {
    return pixelanea::domain::VoidResult::fail("could not close test zip");
  }
  return pixelanea::domain::VoidResult::ok();
}

}  // namespace

TEST_CASE("bundle pack and unpack round-trip", "[bundle]") {
  NullLogger logger;
  ProjectRepository projects{logger};
  FrameRepository frames{projects, logger};

  const auto project = create_sample_project(projects);
  const ProjectId id = project.id;

  Frame frame;
  frame.index = 0;
  frame.width = 4;
  frame.height = 4;
  frame.pixels = std::vector<uint8_t>(16, 0);
  frame.pixels[3] = 2;
  REQUIRE(frames.put(id, frame).has_value());

  const auto work_dir = temp_test_dir("round-trip");
  const auto bundle_path = work_dir / "test.pixelanea";

  const auto saved = projects.save_to_bundle(id, bundle_path);
  REQUIRE(saved.has_value());
  REQUIRE(std::filesystem::exists(bundle_path));
  REQUIRE_FALSE(std::filesystem::exists(bundle_path.string() + ".tmp"));

  REQUIRE(projects.close(id).has_value());

  auto reopened = projects.open_from_bundle(bundle_path);
  REQUIRE(reopened.has_value());
  REQUIRE(reopened.value().id.value == id.value);
  REQUIRE(reopened.value().name == "Bundle Test");

  const auto fetched = frames.get(reopened.value().id, 0);
  REQUIRE(fetched.has_value());
  REQUIRE(fetched.value().pixels[3] == 2);

  REQUIRE(projects.close(reopened.value().id).has_value());
}

TEST_CASE("bundle save preserves asset type", "[bundle]") {
  NullLogger logger;
  ProjectRepository projects{logger};

  CreateProjectParams params;
  params.name = "Prop Asset";
  params.width = 4;
  params.height = 4;
  params.frame_count = 1;
  params.asset_type = pixelanea::domain::AssetType::Prop;
  const auto created = projects.create(params);
  REQUIRE(created.has_value());
  REQUIRE(created.value().asset_type == pixelanea::domain::AssetType::Prop);

  const ProjectId id = created.value().id;
  const auto work_dir = temp_test_dir("asset-type");
  const auto bundle_path = work_dir / "prop.pixelanea";

  REQUIRE(projects.save_to_bundle(id, bundle_path).has_value());
  REQUIRE(projects.close(id).has_value());

  auto reopened = projects.open_from_bundle(bundle_path);
  REQUIRE(reopened.has_value());
  REQUIRE(reopened.value().asset_type == pixelanea::domain::AssetType::Prop);

  REQUIRE(projects.close(reopened.value().id).has_value());
}

TEST_CASE("bundle unpack rejects checksum mismatch", "[bundle]") {
  NullLogger logger;
  ProjectRepository projects{logger};
  const auto project = create_sample_project(projects);
  const ProjectId id = project.id;

  const auto work_dir = temp_test_dir("checksum-fail");
  const auto bundle_path = work_dir / "bad.pixelanea";
  REQUIRE(projects.save_to_bundle(id, bundle_path).has_value());
  REQUIRE(projects.close(id).has_value());

  int error = 0;
  zip_t* archive = zip_open(bundle_path.string().c_str(), 0, &error);
  REQUIRE(archive != nullptr);
  zip_source_t* source = zip_source_buffer(archive, "tampered", 8, 0);
  REQUIRE(source != nullptr);
  const auto db_index = zip_name_locate(archive, kDbEntryName, 0);
  REQUIRE(db_index >= 0);
  REQUIRE(zip_file_replace(archive, static_cast<zip_uint64_t>(db_index), source, 0) == 0);
  REQUIRE(zip_close(archive) == 0);

  const auto failed = unpack_bundle(bundle_path, work_dir / "extract");
  REQUIRE_FALSE(failed.has_value());
  REQUIRE(failed.error().find("checksum mismatch") != std::string::npos);
}

TEST_CASE("bundle unpack rejects path traversal", "[bundle]") {
  const auto work_dir = temp_test_dir("traversal");
  const auto zip_path = work_dir / "evil.pixelanea";
  REQUIRE(create_malicious_zip(zip_path).has_value());

  const auto result = unpack_bundle(zip_path, work_dir / "extract");
  REQUIRE_FALSE(result.has_value());
  REQUIRE(result.error().find("unsafe") != std::string::npos);
}

TEST_CASE("bundle unpack rejects missing manifest", "[bundle]") {
  const auto work_dir = temp_test_dir("no-manifest");
  const auto zip_path = work_dir / "empty.pixelanea";

  int error = 0;
  zip_t* archive = zip_open(zip_path.string().c_str(), ZIP_CREATE | ZIP_TRUNCATE, &error);
  REQUIRE(archive != nullptr);
  const char payload[] = "db";
  zip_source_t* source = zip_source_buffer(archive, payload, sizeof(payload) - 1, 0);
  REQUIRE(source != nullptr);
  REQUIRE(zip_file_add(archive, kDbEntryName, source, ZIP_FL_OVERWRITE) >= 0);
  REQUIRE(zip_close(archive) == 0);

  const auto result = unpack_bundle(zip_path, work_dir / "extract");
  REQUIRE_FALSE(result.has_value());
  REQUIRE(result.error().find(".pixelanea project") != std::string::npos);
}

TEST_CASE("ProjectRepository open rejects already-open project", "[bundle]") {
  NullLogger logger;
  ProjectRepository projects{logger};
  const auto project = create_sample_project(projects);
  const ProjectId id = project.id;

  const auto work_dir = temp_test_dir("already-open");
  const auto bundle_path = work_dir / "open.pixelanea";
  REQUIRE(projects.save_to_bundle(id, bundle_path).has_value());

  const auto second_open = projects.open_from_bundle(bundle_path);
  REQUIRE_FALSE(second_open.has_value());
  REQUIRE(second_open.error() == "project is already open");

  REQUIRE(projects.close(id).has_value());
}
