#include <catch2/catch_test_macros.hpp>

#include "api/file_dialog_handlers.hpp"
#include "api/file_dialog_provider.hpp"
#include "logging/null_logger.hpp"

#include <nlohmann/json.hpp>

using pixelanea::api::FileDialogMode;
using pixelanea::api::FileDialogProvider;
using pixelanea::api::PickPathRequest;
using pixelanea::api::PickPathResult;
using pixelanea::api::ensure_pixelanea_extension;
using pixelanea::api::handle_pick_project_path;
using pixelanea::api::has_pixelanea_extension;
using pixelanea::logging::NullLogger;

namespace {

class MockFileDialogProvider final : public FileDialogProvider {
 public:
  PickPathResult next_result;
  PickPathRequest last_request{};
  int call_count = 0;

  PickPathResult pick_path(const PickPathRequest& request) override {
    ++call_count;
    last_request = request;
    return next_result;
  }
};

pixelanea::logging::ScopedLogger make_log() {
  static NullLogger logger;
  return pixelanea::logging::ScopedLogger(logger, "test", "file_dialog");
}

}  // namespace

TEST_CASE("pixelanea extension helpers", "[file_dialog]") {
  REQUIRE(has_pixelanea_extension("project.pixelanea"));
  REQUIRE(has_pixelanea_extension("project.PIXELANEA"));
  REQUIRE_FALSE(has_pixelanea_extension("project.zip"));

  const auto with_extension = ensure_pixelanea_extension(std::filesystem::path("hero"));
  REQUIRE(with_extension.filename() == "hero.pixelanea");
}

TEST_CASE("handle_pick_project_path returns cancelled response", "[file_dialog]") {
  MockFileDialogProvider provider;
  provider.next_result.cancelled = true;

  const auto response = handle_pick_project_path(
      nlohmann::json{{"mode", "open"}}, provider, make_log());

  REQUIRE(response.status == 200);
  const auto body = nlohmann::json::parse(response.body);
  REQUIRE(body.at("cancelled").get<bool>());
  REQUIRE(provider.call_count == 1);
  REQUIRE(provider.last_request.mode == FileDialogMode::Open);
}

TEST_CASE("handle_pick_project_path returns selected path", "[file_dialog]") {
  MockFileDialogProvider provider;
  provider.next_result.path = "/tmp/demo.pixelanea";

  const auto response = handle_pick_project_path(
      nlohmann::json{{"mode", "saveAs"}, {"defaultName", "demo"}},
      provider,
      make_log());

  REQUIRE(response.status == 200);
  const auto body = nlohmann::json::parse(response.body);
  REQUIRE(body.at("path").get<std::string>() == "/tmp/demo.pixelanea");
  REQUIRE(provider.last_request.mode == FileDialogMode::SaveAs);
  REQUIRE(provider.last_request.default_name == "demo");
}

TEST_CASE("handle_pick_project_path maps provider errors", "[file_dialog]") {
  MockFileDialogProvider provider;
  provider.next_result.error_message = "zenity is not installed";

  const auto response = handle_pick_project_path(
      nlohmann::json{{"mode", "open"}}, provider, make_log());

  REQUIRE(response.status == 503);
}

TEST_CASE("handle_pick_project_path validates mode", "[file_dialog]") {
  MockFileDialogProvider provider;
  const auto response = handle_pick_project_path(
      nlohmann::json{{"mode", "rename"}}, provider, make_log());

  REQUIRE(response.status == 400);
  REQUIRE(provider.call_count == 0);
}
