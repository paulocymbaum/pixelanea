#include "api/compute_handlers.hpp"

#include "api/api_http_helpers.hpp"
#include "api/base64.hpp"
#include "api/http_response.hpp"
#include "domain/selection_ops.hpp"

#include <nlohmann/json.hpp>

namespace pixelanea::api {

namespace {

enum class SelectionOperation {
  Extract,
  ClearChanges,
  PasteChanges,
  MoveChanges,
};

domain::SelectionRect parse_selection_rect(const nlohmann::json& json) {
  domain::SelectionRect selection;
  selection.x = json.at("x").get<int>();
  selection.y = json.at("y").get<int>();
  selection.width = json.at("width").get<int>();
  selection.height = json.at("height").get<int>();
  const std::string shape = json.at("shape").get<std::string>();
  const auto parsed_shape = domain::parse_selection_shape(shape);
  if (!parsed_shape.has_value()) {
    throw std::runtime_error(parsed_shape.error());
  }
  selection.shape = parsed_shape.value();
  return selection;
}

SelectionOperation parse_operation(const std::string& operation) {
  if (operation == "extract") {
    return SelectionOperation::Extract;
  }
  if (operation == "clear_changes") {
    return SelectionOperation::ClearChanges;
  }
  if (operation == "paste_changes") {
    return SelectionOperation::PasteChanges;
  }
  if (operation == "move_changes") {
    return SelectionOperation::MoveChanges;
  }
  throw std::runtime_error("invalid selection operation");
}

std::vector<uint8_t> parse_pixels(const nlohmann::json& body, int grid_width, int grid_height) {
  const std::size_t expected =
      static_cast<std::size_t>(grid_width) * static_cast<std::size_t>(grid_height);

  if (body.contains("pixelsBase64")) {
    std::string error;
    const auto decoded = decode_base64(body.at("pixelsBase64").get<std::string>(), error);
    if (!error.empty()) {
      throw std::runtime_error(error);
    }
    if (decoded.size() != expected) {
      throw std::runtime_error("pixel count does not match frame size");
    }
    return decoded;
  }

  if (!body.contains("pixels")) {
    throw std::runtime_error("pixels or pixelsBase64 required");
  }

  const auto& pixels_json = body.at("pixels");
  if (!pixels_json.is_array()) {
    throw std::runtime_error("pixels must be an array");
  }

  if (pixels_json.size() != expected) {
    throw std::runtime_error("pixel count does not match frame size");
  }

  std::vector<uint8_t> pixels;
  pixels.reserve(expected);
  for (const auto& value : pixels_json) {
    pixels.push_back(static_cast<uint8_t>(value.get<int>()));
  }
  return pixels;
}

domain::SelectionClipboard parse_clipboard(const nlohmann::json& json) {
  domain::SelectionClipboard clipboard;
  clipboard.width = json.at("width").get<int>();
  clipboard.height = json.at("height").get<int>();
  const std::size_t expected =
      static_cast<std::size_t>(clipboard.width) * static_cast<std::size_t>(clipboard.height);

  if (json.contains("pixelsBase64")) {
    std::string error;
    clipboard.pixels = decode_base64(json.at("pixelsBase64").get<std::string>(), error);
    if (!error.empty()) {
      throw std::runtime_error(error);
    }
  } else {
    const auto& pixels_json = json.at("pixels");
    clipboard.pixels.clear();
    for (const auto& value : pixels_json) {
      clipboard.pixels.push_back(static_cast<uint8_t>(value.get<int>()));
    }
  }

  if (clipboard.pixels.size() != expected) {
    throw std::runtime_error("clipboard pixel count mismatch");
  }
  return clipboard;
}

nlohmann::json cell_change_to_json(const domain::CellChange& change) {
  return nlohmann::json{{"x", change.x},
                        {"y", change.y},
                        {"previous", change.previous},
                        {"next", change.next}};
}

nlohmann::json clipboard_to_json(const domain::SelectionClipboard& clipboard) {
  nlohmann::json pixels = nlohmann::json::array();
  for (uint8_t value : clipboard.pixels) {
    pixels.push_back(value);
  }
  return nlohmann::json{{"width", clipboard.width},
                        {"height", clipboard.height},
                        {"pixels", pixels}};
}

}  // namespace

httplib::Response handle_compute_selection(const httplib::Request& req, const HandlerDeps& deps) {
  (void)deps;

  nlohmann::json body;
  try {
    body = nlohmann::json::parse(req.body);
  } catch (const nlohmann::json::exception&) {
    return respond_error(deps.log, 400, "request.invalid_json", "invalid JSON body");
  }

  try {
    const int grid_width = body.at("gridWidth").get<int>();
    const int grid_height = body.at("gridHeight").get<int>();
    const auto pixels = parse_pixels(body, grid_width, grid_height);
    const auto operation = parse_operation(body.at("operation").get<std::string>());

    switch (operation) {
      case SelectionOperation::Extract: {
        if (!body.contains("selection")) {
          throw std::runtime_error("selection required for extract");
        }
        const auto selection = parse_selection_rect(body.at("selection"));
        const auto result =
            domain::extract_selection_pixels(pixels, grid_width, grid_height, selection);
        if (!result.has_value()) {
          return respond_error(deps.log, 400, "selection.extract_failed", result.error());
        }
        return json_response(200, nlohmann::json{{"clipboard", clipboard_to_json(result.value())}});
      }
      case SelectionOperation::ClearChanges: {
        if (!body.contains("selection")) {
          throw std::runtime_error("selection required for clear_changes");
        }
        const auto selection = parse_selection_rect(body.at("selection"));
        const auto result =
            domain::build_clear_selection_changes(pixels, grid_width, grid_height, selection);
        if (!result.has_value()) {
          return respond_error(deps.log, 400, "selection.clear_failed", result.error());
        }
        nlohmann::json changes = nlohmann::json::array();
        for (const auto& change : result.value()) {
          changes.push_back(cell_change_to_json(change));
        }
        return json_response(200, nlohmann::json{{"changes", changes}});
      }
      case SelectionOperation::PasteChanges: {
        const auto clipboard = parse_clipboard(body.at("clipboard"));
        const int origin_x = body.at("origin").at("x").get<int>();
        const int origin_y = body.at("origin").at("y").get<int>();
        const auto result =
            domain::build_paste_changes(clipboard, origin_x, origin_y, pixels, grid_width,
                                        grid_height);
        if (!result.has_value()) {
          return respond_error(deps.log, 400, "selection.paste_failed", result.error());
        }
        nlohmann::json changes = nlohmann::json::array();
        for (const auto& change : result.value()) {
          changes.push_back(cell_change_to_json(change));
        }
        return json_response(200, nlohmann::json{{"changes", changes}});
      }
      case SelectionOperation::MoveChanges: {
        if (!body.contains("selection")) {
          throw std::runtime_error("selection required for move_changes");
        }
        const auto selection = parse_selection_rect(body.at("selection"));
        const int delta_x = body.at("delta").at("x").get<int>();
        const int delta_y = body.at("delta").at("y").get<int>();
        const auto result =
            domain::build_move_selection_changes(pixels, grid_width, grid_height, selection,
                                                 delta_x, delta_y);
        if (!result.has_value()) {
          return respond_error(deps.log, 400, "selection.move_failed", result.error());
        }
        nlohmann::json changes = nlohmann::json::array();
        for (const auto& change : result.value()) {
          changes.push_back(cell_change_to_json(change));
        }
        return json_response(200, nlohmann::json{{"changes", changes}});
      }
    }
  } catch (const std::exception& ex) {
    return respond_error(deps.log, 400, "request.invalid_body", ex.what());
  }

  return respond_error(deps.log, 400, "request.invalid_body", "unsupported operation");
}

}  // namespace pixelanea::api
