#include <catch2/catch_test_macros.hpp>

#include "db/frame_repository.hpp"
#include "db/palette_repository.hpp"
#include "db/project_repository.hpp"
#include "domain/types.hpp"
#include "logging/null_logger.hpp"

using pixelanea::db::FrameRepository;
using pixelanea::db::PaletteRepository;
using pixelanea::db::ProjectRepository;
using pixelanea::domain::Color;
using pixelanea::domain::CreateProjectParams;
using pixelanea::domain::DuplicateFramesParams;
using pixelanea::domain::Frame;
using pixelanea::domain::Palette;
using pixelanea::domain::ProjectId;
using pixelanea::domain::UpdateProjectParams;
using pixelanea::logging::NullLogger;

namespace {

CreateProjectParams sample_project_params() {
  CreateProjectParams params;
  params.name = "Test";
  params.width = 4;
  params.height = 4;
  params.frame_count = 1;
  return params;
}

}  // namespace

TEST_CASE("ProjectRepository create get update close", "[repository]") {
  NullLogger logger;
  ProjectRepository projects{logger};

  const auto created = projects.create(sample_project_params());
  REQUIRE(created.has_value());
  REQUIRE(created.value().name == "Test");
  REQUIRE(created.value().width == 4);

  const ProjectId id = created.value().id;
  REQUIRE(projects.has(id));

  const auto fetched = projects.get(id);
  REQUIRE(fetched.has_value());
  REQUIRE(fetched.value().id.value == id.value);

  UpdateProjectParams update;
  update.name = "Renamed";
  update.fps = 12.0;
  const auto updated = projects.update(id, update);
  REQUIRE(updated.has_value());
  REQUIRE(updated.value().name == "Renamed");
  REQUIRE(updated.value().fps == 12.0);

  const auto closed = projects.close(id);
  REQUIRE(closed.has_value());
  REQUIRE_FALSE(projects.has(id));
}

TEST_CASE("ProjectRepository rejects invalid frame count", "[repository]") {
  NullLogger logger;
  ProjectRepository projects{logger};

  auto params = sample_project_params();
  params.frame_count = 5;
  const auto result = projects.create(params);
  REQUIRE_FALSE(result.has_value());
  REQUIRE(result.error().find("frameCount") != std::string::npos);
}

TEST_CASE("FrameRepository list get put round-trip", "[repository]") {
  NullLogger logger;
  ProjectRepository projects{logger};
  FrameRepository frames{projects, logger};

  const auto created = projects.create(sample_project_params());
  REQUIRE(created.has_value());
  const ProjectId id = created.value().id;

  const auto listed = frames.list(id);
  REQUIRE(listed.has_value());
  REQUIRE(listed.value().size() == 1);
  REQUIRE(listed.value()[0].width == 4);
  REQUIRE(listed.value()[0].height == 4);

  const auto fetched = frames.get(id, 0);
  REQUIRE(fetched.has_value());
  REQUIRE(fetched.value().pixels.size() == 16);
  REQUIRE(fetched.value().pixels[0] == 0);

  Frame frame = fetched.value();
  frame.pixels[0] = 2;
  frame.pixels[5] = 4;
  const auto saved = frames.put(id, frame);
  REQUIRE(saved.has_value());

  const auto round_trip = frames.get(id, 0);
  REQUIRE(round_trip.has_value());
  REQUIRE(round_trip.value().pixels[0] == 2);
  REQUIRE(round_trip.value().pixels[5] == 4);

  REQUIRE(projects.close(id).has_value());
}

TEST_CASE("FrameRepository rejects wrong pixel count", "[repository]") {
  NullLogger logger;
  ProjectRepository projects{logger};
  FrameRepository frames{projects, logger};

  const auto created = projects.create(sample_project_params());
  REQUIRE(created.has_value());
  const ProjectId id = created.value().id;

  Frame frame;
  frame.index = 0;
  frame.width = 4;
  frame.height = 4;
  frame.pixels = {1, 2, 3};
  const auto result = frames.put(id, frame);
  REQUIRE_FALSE(result.has_value());
  REQUIRE(result.error().find("pixel count") != std::string::npos);

  REQUIRE(projects.close(id).has_value());
}

TEST_CASE("FrameRepository duplicate expands and copies source frame", "[repository]") {
  NullLogger logger;
  ProjectRepository projects{logger};
  FrameRepository frames{projects, logger};

  const auto created = projects.create(sample_project_params());
  REQUIRE(created.has_value());
  const ProjectId id = created.value().id;

  Frame frame;
  frame.index = 0;
  frame.width = 4;
  frame.height = 4;
  frame.pixels = std::vector<uint8_t>(16, 0);
  frame.pixels[0] = 3;
  frame.pixels[7] = 5;
  REQUIRE(frames.put(id, frame).has_value());

  DuplicateFramesParams params;
  params.target_frame_count = 8;
  params.source_frame_index = 0;
  const auto duplicated = frames.duplicate(id, params);
  REQUIRE(duplicated.has_value());
  REQUIRE(duplicated.value().project.frame_count == 8);
  REQUIRE(duplicated.value().frames.size() == 8);

  for (int index = 0; index < 8; ++index) {
    const auto fetched = frames.get(id, index);
    REQUIRE(fetched.has_value());
    REQUIRE(fetched.value().pixels[0] == 3);
    REQUIRE(fetched.value().pixels[7] == 5);
  }

  REQUIRE(projects.close(id).has_value());
}

TEST_CASE("FrameRepository duplicate rejects invalid frame count", "[repository]") {
  NullLogger logger;
  ProjectRepository projects{logger};
  FrameRepository frames{projects, logger};

  const auto created = projects.create(sample_project_params());
  REQUIRE(created.has_value());
  const ProjectId id = created.value().id;

  DuplicateFramesParams params;
  params.target_frame_count = 5;
  const auto result = frames.duplicate(id, params);
  REQUIRE_FALSE(result.has_value());
  REQUIRE(result.error().find("frameCount") != std::string::npos);

  REQUIRE(projects.close(id).has_value());
}

TEST_CASE("FrameRepository duplicate rejects missing source frame", "[repository]") {
  NullLogger logger;
  ProjectRepository projects{logger};
  FrameRepository frames{projects, logger};

  const auto created = projects.create(sample_project_params());
  REQUIRE(created.has_value());
  const ProjectId id = created.value().id;

  DuplicateFramesParams params;
  params.target_frame_count = 8;
  params.source_frame_index = 2;
  const auto result = frames.duplicate(id, params);
  REQUIRE_FALSE(result.has_value());
  REQUIRE(result.error() == "frame not found");

  REQUIRE(projects.close(id).has_value());
}

TEST_CASE("PaletteRepository get put round-trip", "[repository]") {
  NullLogger logger;
  ProjectRepository projects{logger};
  PaletteRepository palettes{projects, logger};

  const auto created = projects.create(sample_project_params());
  REQUIRE(created.has_value());
  const ProjectId id = created.value().id;

  const auto fetched = palettes.get_default(id);
  REQUIRE(fetched.has_value());
  REQUIRE(fetched.value().name == "Default");
  REQUIRE(fetched.value().colors.size() == 6);
  REQUIRE(fetched.value().colors[0].hex == "#000000");
  REQUIRE(fetched.value().colors[0].slot == 0);

  Palette updated;
  updated.colors = {
      Color{0, "#112233", std::nullopt},
      Color{1, "#AABBCC", "Accent"},
  };
  const auto saved = palettes.put_default(id, updated);
  REQUIRE(saved.has_value());
  REQUIRE(saved.value().colors.size() == 2);
  REQUIRE(saved.value().colors[1].name == "Accent");

  const auto round_trip = palettes.get_default(id);
  REQUIRE(round_trip.has_value());
  REQUIRE(round_trip.value().colors.size() == 2);
  REQUIRE(round_trip.value().colors[0].hex == "#112233");
  REQUIRE(round_trip.value().colors[1].hex == "#AABBCC");
  REQUIRE(round_trip.value().colors[1].name == "Accent");

  REQUIRE(projects.close(id).has_value());
}

TEST_CASE("PaletteRepository rejects invalid colors", "[repository]") {
  NullLogger logger;
  ProjectRepository projects{logger};
  PaletteRepository palettes{projects, logger};

  const auto created = projects.create(sample_project_params());
  REQUIRE(created.has_value());
  const ProjectId id = created.value().id;

  Palette empty;
  REQUIRE_FALSE(palettes.put_default(id, empty).has_value());

  Palette bad_hex;
  bad_hex.colors = {Color{0, "112233", std::nullopt}};
  const auto hex_result = palettes.put_default(id, bad_hex);
  REQUIRE_FALSE(hex_result.has_value());
  REQUIRE(hex_result.error().find("hex") != std::string::npos);

  Palette duplicate_slots;
  duplicate_slots.colors = {Color{0, "#111111", std::nullopt}, Color{0, "#222222", std::nullopt}};
  const auto slot_result = palettes.put_default(id, duplicate_slots);
  REQUIRE_FALSE(slot_result.has_value());
  REQUIRE(slot_result.error().find("duplicate slot") != std::string::npos);

  REQUIRE(projects.close(id).has_value());
}
