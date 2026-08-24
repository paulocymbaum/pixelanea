#include <catch2/catch_test_macros.hpp>

#include "api/api_server.hpp"
#include "db/frame_repository.hpp"
#include "db/palette_repository.hpp"
#include "db/project_repository.hpp"
#include "export/bundle_io.hpp"
#include "logging/null_logger.hpp"

#include <httplib.h>
#include <nlohmann/json.hpp>
#include <zip.h>

#include <chrono>
#include <filesystem>
#include <fstream>
#include <thread>

using pixelanea::api::ApiServer;
using pixelanea::bundle::kDbEntryName;
using pixelanea::db::FrameRepository;
using pixelanea::db::PaletteRepository;
using pixelanea::db::ProjectRepository;
using pixelanea::domain::CreateProjectParams;
using pixelanea::logging::NullLogger;

namespace {

constexpr int kProjectApiPort = 18788;

pixelanea::domain::CreateProjectParams sample_project_params() {
  CreateProjectParams params;
  params.name = "Project API Test";
  params.width = 4;
  params.height = 4;
  params.frame_count = 1;
  return params;
}

std::filesystem::path temp_project_api_dir(const std::string& label) {
  const auto dir =
      std::filesystem::temp_directory_path() / "pixelanea-project-api-tests" / label;
  std::error_code ec;
  std::filesystem::create_directories(dir, ec);
  return dir;
}

class ProjectApiFixture {
 public:
  ProjectApiFixture(NullLogger& logger)
      : projects_(logger),
        frames_(projects_, logger),
        palettes_(projects_, logger),
        api_(projects_, frames_, palettes_, logger) {
    api_.register_routes(server_);
    thread_ = std::thread([this] { server_.listen("127.0.0.1", kProjectApiPort); });
    wait_until_ready();
  }

  ~ProjectApiFixture() {
    server_.stop();
    if (thread_.joinable()) {
      thread_.join();
    }
  }

  httplib::Client client() const { return httplib::Client("127.0.0.1", kProjectApiPort); }

  ProjectRepository& projects() { return projects_; }

 private:
  void wait_until_ready() {
    for (int attempt = 0; attempt < 50; ++attempt) {
      httplib::Client cli("127.0.0.1", kProjectApiPort);
      if (auto res = cli.Get("/api/health")) {
        if (res->status == 200) {
          return;
        }
      }
      std::this_thread::sleep_for(std::chrono::milliseconds(20));
    }
    FAIL("project API test server failed to start");
  }

  ProjectRepository projects_;
  FrameRepository frames_;
  PaletteRepository palettes_;
  ApiServer api_;
  httplib::Server server_;
  std::thread thread_;
};

}  // namespace

TEST_CASE("ApiServer open project rejects missing path", "[api][project_io]") {
  NullLogger logger;
  ProjectApiFixture fixture(logger);

  httplib::Client cli = fixture.client();
  auto res = cli.Post("/api/projects/open", nlohmann::json{{"name", "x"}}.dump(),
                      "application/json");
  REQUIRE(res);
  REQUIRE(res->status == 400);
  const auto body = nlohmann::json::parse(res->body);
  REQUIRE(body.at("message").get<std::string>().find("path") != std::string::npos);
}

TEST_CASE("ApiServer open project rejects missing bundle file", "[api][project_io]") {
  NullLogger logger;
  ProjectApiFixture fixture(logger);

  httplib::Client cli = fixture.client();
  const std::string missing = (temp_project_api_dir("missing") / "nope.pixelanea").string();
  auto res = cli.Post("/api/projects/open", nlohmann::json{{"path", missing}}.dump(),
                      "application/json");
  REQUIRE(res);
  REQUIRE(res->status == 400);
  const auto body = nlohmann::json::parse(res->body);
  REQUIRE_FALSE(body.at("message").get<std::string>().empty());
}

TEST_CASE("ApiServer open project rejects checksum-tampered bundle", "[api][project_io]") {
  NullLogger logger;
  ProjectApiFixture fixture(logger);

  const auto created = fixture.projects().create(sample_project_params());
  REQUIRE(created.has_value());
  const std::string project_id = created.value().id.value;

  const auto work_dir = temp_project_api_dir("checksum-tamper");
  const auto bundle_path = work_dir / "tampered.pixelanea";
  REQUIRE(fixture.projects().save_to_bundle(created.value().id, bundle_path).has_value());
  REQUIRE(fixture.projects().close(created.value().id).has_value());

  int error = 0;
  zip_t* archive = zip_open(bundle_path.string().c_str(), 0, &error);
  REQUIRE(archive != nullptr);
  zip_source_t* source = zip_source_buffer(archive, "tampered", 8, 0);
  REQUIRE(source != nullptr);
  const auto db_index = zip_name_locate(archive, kDbEntryName, 0);
  REQUIRE(db_index >= 0);
  REQUIRE(zip_file_replace(archive, static_cast<zip_uint64_t>(db_index), source, 0) == 0);
  REQUIRE(zip_close(archive) == 0);

  httplib::Client cli = fixture.client();
  auto res = cli.Post("/api/projects/open", nlohmann::json{{"path", bundle_path.string()}}.dump(),
                      "application/json");
  REQUIRE(res);
  REQUIRE(res->status == 400);
  const auto body = nlohmann::json::parse(res->body);
  REQUIRE(body.at("message").get<std::string>().find("checksum") != std::string::npos);

  (void)project_id;
}

TEST_CASE("ApiServer save project rejects missing path", "[api][project_io]") {
  NullLogger logger;
  ProjectApiFixture fixture(logger);

  const auto created = fixture.projects().create(sample_project_params());
  REQUIRE(created.has_value());
  const std::string project_id = created.value().id.value;

  httplib::Client cli = fixture.client();
  auto res = cli.Post("/api/projects/" + project_id + "/save", "{}", "application/json");
  REQUIRE(res);
  REQUIRE(res->status == 400);
  const auto body = nlohmann::json::parse(res->body);
  REQUIRE(body.at("message").get<std::string>().find("path") != std::string::npos);

  REQUIRE(fixture.projects().close(created.value().id).has_value());
}

TEST_CASE("ApiServer save project returns 404 for unknown project", "[api][project_io]") {
  NullLogger logger;
  ProjectApiFixture fixture(logger);

  httplib::Client cli = fixture.client();
  const auto bundle_path = temp_project_api_dir("save-404") / "out.pixelanea";
  auto res = cli.Post("/api/projects/missing-project-id/save",
                      nlohmann::json{{"path", bundle_path.string()}}.dump(),
                      "application/json");
  REQUIRE(res);
  REQUIRE(res->status == 404);
  const auto body = nlohmann::json::parse(res->body);
  REQUIRE(body.at("message").get<std::string>().find("not found") != std::string::npos);
}

TEST_CASE("ApiServer save and reopen bundle round-trip via HTTP", "[api][project_io]") {
  NullLogger logger;
  ProjectApiFixture fixture(logger);

  const auto created = fixture.projects().create(sample_project_params());
  REQUIRE(created.has_value());
  const std::string project_id = created.value().id.value;

  const auto bundle_path = temp_project_api_dir("round-trip") / "hero.pixelanea";

  httplib::Client cli = fixture.client();
  auto save_res =
      cli.Post("/api/projects/" + project_id + "/save",
               nlohmann::json{{"path", bundle_path.string()}}.dump(), "application/json");
  REQUIRE(save_res);
  REQUIRE(save_res->status == 200);

  auto close_res = cli.Delete("/api/projects/" + project_id);
  REQUIRE(close_res);
  REQUIRE(close_res->status == 204);

  auto open_res = cli.Post("/api/projects/open",
                           nlohmann::json{{"path", bundle_path.string()}}.dump(),
                           "application/json");
  REQUIRE(open_res);
  REQUIRE(open_res->status == 200);
  const auto opened = nlohmann::json::parse(open_res->body);
  REQUIRE(opened.at("name").get<std::string>() == "Project API Test");

  const std::string reopened_id = opened.at("id").get<std::string>();
  REQUIRE(fixture.projects().close(pixelanea::domain::ProjectId(reopened_id)).has_value());
}
