#include <catch2/catch_test_macros.hpp>

#include "api/api_server.hpp"
#include "db/frame_repository.hpp"
#include "db/palette_repository.hpp"
#include "db/project_repository.hpp"
#include "logging/null_logger.hpp"

#include <httplib.h>
#include <nlohmann/json.hpp>

#include <chrono>
#include <thread>

using pixelanea::api::ApiServer;
using pixelanea::db::FrameRepository;
using pixelanea::db::PaletteRepository;
using pixelanea::db::ProjectRepository;
using pixelanea::logging::NullLogger;

namespace {

constexpr int kComputeTestPort = 18788;

class ComputeApiFixture {
 public:
  ComputeApiFixture(NullLogger& logger)
      : projects_(logger),
        frames_(projects_, logger),
        palettes_(projects_, logger),
        api_(projects_, frames_, palettes_, logger) {
    api_.register_routes(server_);
    thread_ = std::thread([this] {
      server_.listen("127.0.0.1", kComputeTestPort);
    });
    wait_until_ready();
  }

  ~ComputeApiFixture() {
    server_.stop();
    if (thread_.joinable()) {
      thread_.join();
    }
  }

  httplib::Client client() const { return httplib::Client("127.0.0.1", kComputeTestPort); }

 private:
  void wait_until_ready() {
    for (int attempt = 0; attempt < 50; ++attempt) {
      httplib::Client cli("127.0.0.1", kComputeTestPort);
      if (auto res = cli.Get("/api/health")) {
        if (res->status == 200) {
          return;
        }
      }
      std::this_thread::sleep_for(std::chrono::milliseconds(20));
    }
    FAIL("compute test API server failed to start");
  }

  ProjectRepository projects_;
  FrameRepository frames_;
  PaletteRepository palettes_;
  ApiServer api_;
  httplib::Server server_;
  std::thread thread_;
};

nlohmann::json sample_grid_body() {
  return nlohmann::json{
      {"gridWidth", 4},
      {"gridHeight", 4},
      {"pixels", std::vector<int>{1, 2, 0, 0, 3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0}},
  };
}

nlohmann::json sample_selection() {
  return nlohmann::json{{"x", 0}, {"y", 0}, {"width", 2}, {"height", 2}, {"shape", "rect"}};
}

}  // namespace

TEST_CASE("ApiServer compute selection extract returns clipboard", "[api][selection_compute]") {
  NullLogger logger;
  ComputeApiFixture fixture(logger);

  nlohmann::json body = sample_grid_body();
  body["selection"] = sample_selection();
  body["operation"] = "extract";

  httplib::Client cli = fixture.client();
  auto res = cli.Post("/api/compute/selection", body.dump(), "application/json");
  REQUIRE(res);
  REQUIRE(res->status == 200);

  const auto json = nlohmann::json::parse(res->body);
  REQUIRE(json.at("clipboard").at("width").get<int>() == 2);
  REQUIRE(json.at("clipboard").at("height").get<int>() == 2);
  REQUIRE(json.at("clipboard").at("pixels").at(0).get<int>() == 1);
  REQUIRE(json.at("clipboard").at("pixels").at(1).get<int>() == 2);
  REQUIRE(json.at("clipboard").at("pixels").at(2).get<int>() == 3);
  REQUIRE(json.at("clipboard").at("pixels").at(3).get<int>() == 4);
}

TEST_CASE("ApiServer compute selection clear_changes returns cell changes", "[api][selection_compute]") {
  NullLogger logger;
  ComputeApiFixture fixture(logger);

  nlohmann::json body = sample_grid_body();
  body["selection"] = sample_selection();
  body["operation"] = "clear_changes";

  httplib::Client cli = fixture.client();
  auto res = cli.Post("/api/compute/selection", body.dump(), "application/json");
  REQUIRE(res);
  REQUIRE(res->status == 200);

  const auto json = nlohmann::json::parse(res->body);
  const auto& changes = json.at("changes");
  REQUIRE(changes.is_array());
  REQUIRE(changes.size() == 4);
}

TEST_CASE("ApiServer compute selection paste_changes without selection rect", "[api][selection_compute]") {
  NullLogger logger;
  ComputeApiFixture fixture(logger);

  nlohmann::json body = sample_grid_body();
  body["operation"] = "paste_changes";
  body["origin"] = nlohmann::json{{"x", 1}, {"y", 1}};
  body["clipboard"] =
      nlohmann::json{{"width", 2}, {"height", 1}, {"pixels", std::vector<int>{5, 6}}};

  httplib::Client cli = fixture.client();
  auto res = cli.Post("/api/compute/selection", body.dump(), "application/json");
  REQUIRE(res);
  REQUIRE(res->status == 200);

  const auto json = nlohmann::json::parse(res->body);
  const auto& changes = json.at("changes");
  REQUIRE(changes.is_array());
  REQUIRE(changes.size() == 2);
  REQUIRE(changes.at(0).at("x").get<int>() == 1);
  REQUIRE(changes.at(0).at("next").get<int>() == 5);
  REQUIRE(changes.at(1).at("next").get<int>() == 6);
}

TEST_CASE("ApiServer compute selection move_changes relocates pixels", "[api][selection_compute]") {
  NullLogger logger;
  ComputeApiFixture fixture(logger);

  nlohmann::json body = sample_grid_body();
  body["selection"] = sample_selection();
  body["operation"] = "move_changes";
  body["delta"] = nlohmann::json{{"x", 1}, {"y", 0}};

  httplib::Client cli = fixture.client();
  auto res = cli.Post("/api/compute/selection", body.dump(), "application/json");
  REQUIRE(res);
  REQUIRE(res->status == 200);

  const auto json = nlohmann::json::parse(res->body);
  const auto& changes = json.at("changes");
  REQUIRE(changes.is_array());
  REQUIRE(changes.size() == 8);
}
