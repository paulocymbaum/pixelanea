#include <catch2/catch_test_macros.hpp>

#include "api/api_server.hpp"
#include "db/frame_repository.hpp"
#include "db/palette_repository.hpp"
#include "db/project_repository.hpp"
#include "domain/types.hpp"
#include "logging/null_logger.hpp"

#include <httplib.h>
#include <nlohmann/json.hpp>

#include <chrono>
#include <thread>
#include <vector>

using pixelanea::api::ApiServer;
using pixelanea::db::FrameRepository;
using pixelanea::db::PaletteRepository;
using pixelanea::db::ProjectRepository;
using pixelanea::domain::CreateProjectParams;
using pixelanea::logging::NullLogger;

namespace {

constexpr int kTestPort = 18787;

pixelanea::domain::CreateProjectParams sample_project_params() {
  CreateProjectParams params;
  params.name = "Binary Frame Test";
  params.width = 4;
  params.height = 4;
  params.frame_count = 1;
  return params;
}

class TestApiServer {
 public:
  TestApiServer(NullLogger& logger)
      : projects_(logger),
        frames_(projects_, logger),
        palettes_(projects_, logger),
        api_(projects_, frames_, palettes_, logger) {
    api_.register_routes(server_);
    thread_ = std::thread([this] {
      server_.listen("127.0.0.1", kTestPort);
    });
    wait_until_ready();
  }

  ~TestApiServer() {
    server_.stop();
    if (thread_.joinable()) {
      thread_.join();
    }
  }

  httplib::Client client() const { return httplib::Client("127.0.0.1", kTestPort); }

  ProjectRepository& projects() { return projects_; }

 private:
  void wait_until_ready() {
    for (int attempt = 0; attempt < 50; ++attempt) {
      httplib::Client cli("127.0.0.1", kTestPort);
      if (auto res = cli.Get("/api/health")) {
        if (res->status == 200) {
          return;
        }
      }
      std::this_thread::sleep_for(std::chrono::milliseconds(20));
    }
    FAIL("test API server failed to start");
  }

  ProjectRepository projects_;
  FrameRepository frames_;
  PaletteRepository palettes_;
  ApiServer api_;
  httplib::Server server_;
  std::thread thread_;
};

}  // namespace

TEST_CASE("ApiServer frame binary put get round-trip", "[api][frame_binary]") {
  NullLogger logger;
  TestApiServer fixture(logger);

  const auto created = fixture.projects().create(sample_project_params());
  REQUIRE(created.has_value());
  const std::string project_id = created.value().id.value;

  std::vector<uint8_t> pixels(16, 0);
  pixels[0] = 2;
  pixels[5] = 4;

  httplib::Client cli = fixture.client();
  httplib::Headers put_headers{{"Content-Type", "application/octet-stream"}};
  const std::string pixel_body(reinterpret_cast<const char*>(pixels.data()), pixels.size());
  auto put_res = cli.Put("/api/projects/" + project_id + "/frames/0", put_headers, pixel_body,
                         "application/octet-stream");
  REQUIRE(put_res);
  REQUIRE(put_res->status == 200);

  httplib::Headers get_headers{{"Accept", "application/octet-stream"}};
  auto get_res = cli.Get("/api/projects/" + project_id + "/frames/0", get_headers);
  REQUIRE(get_res);
  REQUIRE(get_res->status == 200);
  REQUIRE(get_res->get_header_value("Content-Type").rfind("application/octet-stream", 0) == 0);
  REQUIRE(get_res->body.size() == 16);
  REQUIRE(static_cast<uint8_t>(get_res->body[0]) == 2);
  REQUIRE(static_cast<uint8_t>(get_res->body[5]) == 4);
  REQUIRE(get_res->get_header_value("X-Frame-Width") == "4");
  REQUIRE(get_res->get_header_value("X-Frame-Height") == "4");
  REQUIRE(get_res->get_header_value("X-Frame-Index") == "0");
  REQUIRE(!get_res->get_header_value("X-Frame-Updated-At").empty());

  REQUIRE(fixture.projects().close(created.value().id).has_value());
}

TEST_CASE("ApiServer frame JSON put get remains backward compatible", "[api][frame_binary]") {
  NullLogger logger;
  TestApiServer fixture(logger);

  const auto created = fixture.projects().create(sample_project_params());
  REQUIRE(created.has_value());
  const std::string project_id = created.value().id.value;

  nlohmann::json put_body{{"pixels", std::vector<int>{2, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0}}};
  httplib::Client cli = fixture.client();
  auto put_res = cli.Put("/api/projects/" + project_id + "/frames/0", put_body.dump(), "application/json");
  REQUIRE(put_res);
  REQUIRE(put_res->status == 200);

  auto get_res = cli.Get("/api/projects/" + project_id + "/frames/0");
  REQUIRE(get_res);
  REQUIRE(get_res->status == 200);
  const auto frame = nlohmann::json::parse(get_res->body);
  REQUIRE(frame.at("width").get<int>() == 4);
  REQUIRE(frame.at("pixels").at(0).get<int>() == 2);
  REQUIRE(frame.at("pixels").at(5).get<int>() == 4);

  REQUIRE(fixture.projects().close(created.value().id).has_value());
}

TEST_CASE("ApiServer patch frame cells round-trip", "[api][frame_delta]") {
  NullLogger logger;
  TestApiServer fixture(logger);

  const auto created = fixture.projects().create(sample_project_params());
  REQUIRE(created.has_value());
  const std::string project_id = created.value().id.value;

  httplib::Client cli = fixture.client();
  nlohmann::json patch_body = nlohmann::json::array({
      {{"x", 0}, {"y", 0}, {"previous", 0}, {"next", 2}},
      {{"x", 1}, {"y", 1}, {"previous", 0}, {"next", 4}},
  });
  auto patch_res =
      cli.Patch("/api/projects/" + project_id + "/frames/0/cells", patch_body.dump(), "application/json");
  REQUIRE(patch_res);
  REQUIRE(patch_res->status == 200);

  httplib::Headers get_headers{{"Accept", "application/octet-stream"}};
  auto get_res = cli.Get("/api/projects/" + project_id + "/frames/0", get_headers);
  REQUIRE(get_res);
  REQUIRE(get_res->status == 200);
  REQUIRE(static_cast<uint8_t>(get_res->body[0]) == 2);
  REQUIRE(static_cast<uint8_t>(get_res->body[5]) == 4);

  REQUIRE(fixture.projects().close(created.value().id).has_value());
}

TEST_CASE("ApiServer patch frame cells returns 409 on conflict", "[api][frame_delta]") {
  NullLogger logger;
  TestApiServer fixture(logger);

  const auto created = fixture.projects().create(sample_project_params());
  REQUIRE(created.has_value());
  const std::string project_id = created.value().id.value;

  httplib::Client cli = fixture.client();
  nlohmann::json patch_body = nlohmann::json::array({
      {{"x", 0}, {"y", 0}, {"previous", 0}, {"next", 2}},
  });
  REQUIRE(cli.Patch("/api/projects/" + project_id + "/frames/0/cells", patch_body.dump(),
                    "application/json"));

  nlohmann::json conflict_body = nlohmann::json::array({
      {{"x", 0}, {"y", 0}, {"previous", 0}, {"next", 3}},
  });
  auto conflict_res = cli.Patch("/api/projects/" + project_id + "/frames/0/cells",
                                conflict_body.dump(), "application/json");
  REQUIRE(conflict_res);
  REQUIRE(conflict_res->status == 409);

  REQUIRE(fixture.projects().close(created.value().id).has_value());
}

TEST_CASE("FrameRepository binary put payload size for 64x64 and 128x128", "[api][frame_binary][perf]") {
  NullLogger logger;
  TestApiServer fixture(logger);

  for (const int grid_size : {64, 128}) {
    CreateProjectParams params;
    params.name = "Binary size test";
    params.width = grid_size;
    params.height = grid_size;
    params.frame_count = 1;

    const auto created = fixture.projects().create(params);
    REQUIRE(created.has_value());
    const std::string project_id = created.value().id.value;

    const std::size_t pixel_count =
        static_cast<std::size_t>(grid_size) * static_cast<std::size_t>(grid_size);
    std::vector<uint8_t> pixels(pixel_count, 0);
    pixels[0] = 1;

    httplib::Client cli = fixture.client();
    httplib::Headers put_headers{{"Content-Type", "application/octet-stream"}};
    const std::string pixel_body(reinterpret_cast<const char*>(pixels.data()), pixels.size());
    auto put_res = cli.Put("/api/projects/" + project_id + "/frames/0", put_headers, pixel_body,
                           "application/octet-stream");
    REQUIRE(put_res);
    REQUIRE(put_res->status == 200);
    REQUIRE(pixel_body.size() == pixel_count);

    const auto first_meta = nlohmann::json::parse(put_res->body);
    const std::string first_updated = first_meta.at("updatedAt").get<std::string>();

    auto repeat_res = cli.Put("/api/projects/" + project_id + "/frames/0", put_headers, pixel_body,
                              "application/octet-stream");
    REQUIRE(repeat_res);
    REQUIRE(repeat_res->status == 200);
    const auto repeat_meta = nlohmann::json::parse(repeat_res->body);
    REQUIRE(repeat_meta.at("updatedAt").get<std::string>() == first_updated);

    REQUIRE(fixture.projects().close(created.value().id).has_value());
  }
}

TEST_CASE("ApiServer Accept q-values prefer higher-weighted media type", "[api][frame_binary]") {
  NullLogger logger;
  TestApiServer fixture(logger);

  const auto created = fixture.projects().create(sample_project_params());
  REQUIRE(created.has_value());
  const std::string project_id = created.value().id.value;

  std::vector<uint8_t> pixels(16, 0);
  pixels[0] = 2;
  const std::string pixel_body(reinterpret_cast<const char*>(pixels.data()), pixels.size());

  httplib::Client cli = fixture.client();
  httplib::Headers put_headers{{"Content-Type", "application/octet-stream"}};
  REQUIRE(cli.Put("/api/projects/" + project_id + "/frames/0", put_headers, pixel_body,
                    "application/octet-stream"));

  httplib::Headers prefer_json{{"Accept", "application/octet-stream;q=0.8, application/json;q=0.9"}};
  auto json_res = cli.Get("/api/projects/" + project_id + "/frames/0", prefer_json);
  REQUIRE(json_res);
  REQUIRE(json_res->status == 200);
  REQUIRE(json_res->get_header_value("Content-Type").rfind("application/json", 0) == 0);

  httplib::Headers prefer_octet{{"Accept", "application/json;q=0.8, application/octet-stream;q=0.9"}};
  auto octet_res = cli.Get("/api/projects/" + project_id + "/frames/0", prefer_octet);
  REQUIRE(octet_res);
  REQUIRE(octet_res->status == 200);
  REQUIRE(octet_res->get_header_value("Content-Type").rfind("application/octet-stream", 0) == 0);
  REQUIRE(octet_res->body.size() == 16);

  REQUIRE(fixture.projects().close(created.value().id).has_value());
}

TEST_CASE("ApiServer frame binary put rejects wrong byte count", "[api][frame_binary]") {
  NullLogger logger;
  TestApiServer fixture(logger);

  const auto created = fixture.projects().create(sample_project_params());
  REQUIRE(created.has_value());
  const std::string project_id = created.value().id.value;

  httplib::Client cli = fixture.client();
  httplib::Headers put_headers{{"Content-Type", "application/octet-stream"}};
  auto put_res = cli.Put("/api/projects/" + project_id + "/frames/0", put_headers, "abc",
                         "application/octet-stream");
  REQUIRE(put_res);
  REQUIRE(put_res->status == 400);

  REQUIRE(fixture.projects().close(created.value().id).has_value());
}
