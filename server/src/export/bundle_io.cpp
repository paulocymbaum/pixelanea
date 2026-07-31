#include "export/bundle_io.hpp"

#include "export/path_safety.hpp"
#include "export/sha256.hpp"

#include <zip.h>

#include <cstring>
#include <fstream>
#include <vector>

namespace pixelanea::bundle {

namespace {

std::string checksum_for_file(const std::filesystem::path& path) {
  const std::string hex = sha256_hex_file(path);
  if (hex.empty()) {
    return {};
  }
  return "sha256:" + hex;
}

std::string zip_error_message(zip_t* archive) {
  const char* message = zip_strerror(archive);
  return message ? message : "zip error";
}

domain::VoidResult add_file_to_archive(zip_t* archive, const std::filesystem::path& file_path,
                                         const std::string& entry_name) {
  zip_source_t* source = zip_source_file(archive, file_path.string().c_str(), 0, -1);
  if (!source) {
    return domain::VoidResult::fail("could not read file for bundle: " + entry_name);
  }

  const zip_int64_t index =
      zip_file_add(archive, entry_name.c_str(), source, ZIP_FL_OVERWRITE | ZIP_FL_ENC_UTF_8);
  if (index < 0) {
    zip_source_free(source);
    return domain::VoidResult::fail("could not add file to bundle: " + entry_name);
  }
  return domain::VoidResult::ok();
}

}  // namespace

domain::VoidResult pack_bundle(const PackBundleParams& params,
                                 const std::filesystem::path& output_path) {
  if (!std::filesystem::is_regular_file(params.db_path)) {
    return domain::VoidResult::fail("project database not found");
  }
  if (output_path.empty()) {
    return domain::VoidResult::fail("bundle path is required");
  }

  BundleManifest manifest = manifest_from_project(params.project);
  const std::string db_checksum = checksum_for_file(params.db_path);
  if (db_checksum.empty()) {
    return domain::VoidResult::fail("could not compute project database checksum");
  }
  manifest.checksums[kDbEntryName] = db_checksum;

  const auto temp_path = output_path.string() + ".tmp";
  std::error_code ec;
  std::filesystem::remove(temp_path, ec);

  int error = 0;
  zip_t* archive = zip_open(temp_path.c_str(), ZIP_CREATE | ZIP_TRUNCATE, &error);
  if (!archive) {
    zip_error_t zip_error;
    zip_error_init_with_code(&zip_error, error);
    const std::string message = zip_error_strerror(&zip_error);
    zip_error_fini(&zip_error);
    return domain::VoidResult::fail("could not create bundle: " + message);
  }

  const auto manifest_json = serialize_manifest_json(manifest);
  zip_source_t* manifest_source =
      zip_source_buffer(archive, manifest_json.data(), manifest_json.size(), 0);
  if (!manifest_source) {
    zip_close(archive);
    std::filesystem::remove(temp_path, ec);
    return domain::VoidResult::fail("could not create bundle manifest");
  }
  if (zip_file_add(archive, kManifestEntryName, manifest_source,
                    ZIP_FL_OVERWRITE | ZIP_FL_ENC_UTF_8) < 0) {
    zip_source_free(manifest_source);
    zip_close(archive);
    std::filesystem::remove(temp_path, ec);
    return domain::VoidResult::fail("could not add manifest to bundle");
  }

  const auto add_db = add_file_to_archive(archive, params.db_path, kDbEntryName);
  if (!add_db.has_value()) {
    zip_close(archive);
    std::filesystem::remove(temp_path, ec);
    return add_db;
  }

  if (zip_close(archive) < 0) {
    std::filesystem::remove(temp_path, ec);
    return domain::VoidResult::fail("could not finalize bundle");
  }

  std::filesystem::rename(temp_path, output_path, ec);
  if (ec) {
    std::filesystem::remove(temp_path, ec);
    return domain::VoidResult::fail("could not write bundle to destination");
  }
  return domain::VoidResult::ok();
}

domain::Result<UnpackBundleResult> unpack_bundle(const std::filesystem::path& bundle_path,
                                                   const std::filesystem::path& extract_dir) {
  if (!std::filesystem::is_regular_file(bundle_path)) {
    return domain::Result<UnpackBundleResult>::fail(
        "Couldn't open this file. Is it a .pixelanea project?");
  }

  int error = 0;
  zip_t* archive = zip_open(bundle_path.string().c_str(), ZIP_RDONLY, &error);
  if (!archive) {
    return domain::Result<UnpackBundleResult>::fail(
        "Couldn't open this file. Is it a .pixelanea project?");
  }

  std::error_code ec;
  std::filesystem::create_directories(extract_dir, ec);
  if (ec) {
    zip_close(archive);
    return domain::Result<UnpackBundleResult>::fail("could not prepare bundle extraction directory");
  }

  const zip_int64_t entry_count = zip_get_num_entries(archive, 0);
  for (zip_int64_t index = 0; index < entry_count; ++index) {
    const char* name = zip_get_name(archive, index, ZIP_FL_ENC_UTF_8);
    if (!name) {
      zip_close(archive);
      return domain::Result<UnpackBundleResult>::fail(zip_error_message(archive));
    }

    const auto destination = resolve_safe_entry_path(extract_dir, name);
    if (!destination.has_value()) {
      zip_close(archive);
      return domain::Result<UnpackBundleResult>::fail(destination.error());
    }

    zip_stat_t stat{};
    if (zip_stat_index(archive, index, 0, &stat) < 0) {
      zip_close(archive);
      return domain::Result<UnpackBundleResult>::fail(zip_error_message(archive));
    }

    const std::size_t name_length = std::strlen(name);
    if ((stat.valid & ZIP_STAT_SIZE) && stat.size == 0 && name_length > 0 &&
        name[name_length - 1] == '/') {
      std::filesystem::create_directories(destination.value(), ec);
      continue;
    }

    zip_file_t* file = zip_fopen_index(archive, index, 0);
    if (!file) {
      zip_close(archive);
      return domain::Result<UnpackBundleResult>::fail(zip_error_message(archive));
    }

    std::filesystem::create_directories(destination.value().parent_path(), ec);
    std::ofstream output(destination.value(), std::ios::binary);
    if (!output) {
      zip_fclose(file);
      zip_close(archive);
      return domain::Result<UnpackBundleResult>::fail("could not extract bundle file");
    }

    std::vector<char> buffer(64 * 1024);
    zip_int64_t bytes_read = 0;
    while ((bytes_read = zip_fread(file, buffer.data(), buffer.size())) > 0) {
      output.write(buffer.data(), bytes_read);
    }
    zip_fclose(file);
    if (bytes_read < 0 || !output) {
      zip_close(archive);
      return domain::Result<UnpackBundleResult>::fail("could not extract bundle file");
    }
  }

  zip_close(archive);

  const auto manifest_path = extract_dir / kManifestEntryName;
  if (!std::filesystem::is_regular_file(manifest_path)) {
    return domain::Result<UnpackBundleResult>::fail(
        "Couldn't open this file. Is it a .pixelanea project?");
  }

  std::ifstream manifest_input(manifest_path);
  const std::string manifest_text((std::istreambuf_iterator<char>(manifest_input)),
                                  std::istreambuf_iterator<char>());
  auto manifest = parse_manifest_json(manifest_text);
  if (!manifest.has_value()) {
    return domain::Result<UnpackBundleResult>::fail(manifest.error());
  }

  const auto validated = validate_manifest(manifest.value());
  if (!validated.has_value()) {
    return domain::Result<UnpackBundleResult>::fail(validated.error());
  }

  const auto checksums = verify_checksums(extract_dir, manifest.value());
  if (!checksums.has_value()) {
    return domain::Result<UnpackBundleResult>::fail(checksums.error());
  }

  const auto db_path = extract_dir / kDbEntryName;
  if (!std::filesystem::is_regular_file(db_path)) {
    return domain::Result<UnpackBundleResult>::fail(
        "Couldn't open this file. Is it a .pixelanea project?");
  }

  UnpackBundleResult result;
  result.extract_dir = extract_dir;
  result.db_path = db_path;
  result.manifest = std::move(manifest.value());
  return domain::Result<UnpackBundleResult>::ok(std::move(result));
}

}  // namespace pixelanea::bundle
