#include "api/osascript_file_dialog_provider.hpp"

#include <algorithm>
#include <array>
#include <cctype>
#include <chrono>
#include <spawn.h>
#include <string>
#include <thread>
#include <vector>

#include <signal.h>
#include <sys/wait.h>
#include <unistd.h>

extern char** environ;

namespace pixelanea::api {

namespace {

constexpr const char* kOsascriptBinary = "/usr/bin/osascript";

std::vector<char*> build_argv(const std::vector<std::string>& args) {
  std::vector<char*> argv;
  argv.reserve(args.size() + 1);
  for (const auto& arg : args) {
    argv.push_back(const_cast<char*>(arg.c_str()));
  }
  argv.push_back(nullptr);
  return argv;
}

struct ProcessOutput {
  int exit_code = -1;
  std::string stdout_text;
  bool timed_out = false;
};

ProcessOutput run_process(const std::vector<std::string>& args, int timeout_seconds) {
  ProcessOutput output;
  int stdout_pipe[2] = {-1, -1};
  if (pipe(stdout_pipe) != 0) {
    return output;
  }

  posix_spawn_file_actions_t actions;
  posix_spawn_file_actions_init(&actions);
  posix_spawn_file_actions_adddup2(&actions, stdout_pipe[1], STDOUT_FILENO);
  posix_spawn_file_actions_addclose(&actions, stdout_pipe[0]);
  posix_spawn_file_actions_addclose(&actions, stdout_pipe[1]);

  pid_t child = -1;
  auto argv = build_argv(args);
  const int spawn_status =
      posix_spawn(&child, args.front().c_str(), &actions, nullptr, argv.data(), environ);
  posix_spawn_file_actions_destroy(&actions);
  close(stdout_pipe[1]);

  if (spawn_status != 0) {
    close(stdout_pipe[0]);
    return output;
  }

  std::array<char, 256> buffer{};
  const auto deadline =
      std::chrono::steady_clock::now() + std::chrono::seconds(timeout_seconds);
  bool child_exited = false;

  while (true) {
    const ssize_t bytes_read = read(stdout_pipe[0], buffer.data(), buffer.size());
    if (bytes_read > 0) {
      output.stdout_text.append(buffer.data(), static_cast<std::size_t>(bytes_read));
    }

    int status = 0;
    const pid_t wait_result = waitpid(child, &status, WNOHANG);
    if (wait_result == child) {
      output.exit_code = WIFEXITED(status) ? WEXITSTATUS(status) : -1;
      child_exited = true;
      break;
    }
    if (wait_result == -1) {
      break;
    }

    if (std::chrono::steady_clock::now() >= deadline) {
      output.timed_out = true;
      kill(child, SIGTERM);
      waitpid(child, &status, 0);
      break;
    }

    if (bytes_read <= 0) {
      std::this_thread::sleep_for(std::chrono::milliseconds(50));
    }
  }

  if (!child_exited && !output.timed_out) {
    int status = 0;
    waitpid(child, &status, 0);
    output.exit_code = WIFEXITED(status) ? WEXITSTATUS(status) : -1;
  }

  while (true) {
    const ssize_t bytes_read = read(stdout_pipe[0], buffer.data(), buffer.size());
    if (bytes_read <= 0) {
      break;
    }
    output.stdout_text.append(buffer.data(), static_cast<std::size_t>(bytes_read));
  }

  close(stdout_pipe[0]);
  return output;
}

std::string trim(std::string value) {
  const auto not_space = [](unsigned char ch) { return !std::isspace(ch); };
  value.erase(value.begin(), std::find_if(value.begin(), value.end(), not_space));
  value.erase(std::find_if(value.rbegin(), value.rend(), not_space).base(), value.end());
  return value;
}

std::string apple_script_string(const std::string& value) {
  std::string escaped;
  escaped.reserve(value.size());
  for (const char ch : value) {
    if (ch == '\\' || ch == '"') {
      escaped.push_back('\\');
    }
    escaped.push_back(ch);
  }
  return escaped;
}

std::string build_open_script(const PickPathRequest& request) {
  std::string script = "POSIX path of (choose file of type {\"pixelanea\"} with prompt \"";
  script += apple_script_string(kOpenProjectTitle);
  script += "\"";
  if (request.default_path && !request.default_path->empty()) {
    const auto parent = request.default_path->parent_path();
    if (!parent.empty()) {
      script += " default location POSIX file \"";
      script += apple_script_string(parent.string());
      script += "\"";
    }
  }
  script += ")";
  return script;
}

std::string build_save_script(const PickPathRequest& request) {
  std::string script = "POSIX path of (choose file name with prompt \"";
  script += apple_script_string(kSaveProjectTitle);
  script += "\" default name \"";
  script += apple_script_string(default_save_filename(request));
  script += "\"";
  if (request.default_path && !request.default_path->empty()) {
    const auto parent = request.default_path->parent_path();
    if (!parent.empty()) {
      script += " default location POSIX file \"";
      script += apple_script_string(parent.string());
      script += "\"";
    }
  }
  script += ")";
  return script;
}

}  // namespace

OsascriptFileDialogProvider::OsascriptFileDialogProvider(logging::Logger& logger)
    : log_(logger, "api", "OsascriptFileDialogProvider") {}

PickPathResult OsascriptFileDialogProvider::pick_path(const PickPathRequest& request) {
  PickPathResult result;

  if (access(kOsascriptBinary, X_OK) != 0) {
    result.error_message = "native file dialog is not configured";
    log_.warn("dialog.osascript_missing", {});
    return result;
  }

  const std::string script = request.mode == FileDialogMode::SaveAs
                                 ? build_save_script(request)
                                 : build_open_script(request);
  const auto process =
      run_process({kOsascriptBinary, "-e", script}, kZenityMaxWaitSeconds);
  if (process.timed_out) {
    result.error_message = "file dialog timed out";
    log_.warn("dialog.timeout", {{"timeout_seconds", kZenityMaxWaitSeconds}});
    return result;
  }

  // User cancel is typically exit 1 with "User canceled." on stderr.
  if (process.exit_code == 1) {
    result.cancelled = true;
    return result;
  }

  if (process.exit_code != 0) {
    result.error_message = "file dialog failed";
    log_.warn("dialog.failed", {{"exit_code", process.exit_code}});
    return result;
  }

  const std::string selected = trim(process.stdout_text);
  if (selected.empty()) {
    result.cancelled = true;
    return result;
  }

  auto path = std::filesystem::path(selected);
  if (request.mode == FileDialogMode::SaveAs) {
    path = ensure_pixelanea_extension(std::move(path));
  } else if (!has_pixelanea_extension(path)) {
    result.error_message = "selected file must use the .pixelanea extension";
    return result;
  }

  result.path = std::move(path);
  return result;
}

}  // namespace pixelanea::api
