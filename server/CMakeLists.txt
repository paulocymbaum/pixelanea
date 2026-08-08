cmake_minimum_required(VERSION 3.24)
project(pixelanea-server VERSION 1.0.0 LANGUAGES CXX C)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(PIXELANEA_MIGRATIONS_DIR "${CMAKE_CURRENT_SOURCE_DIR}/db/migrations")

include(FetchContent)

set(USE_VCPKG OFF)
if(DEFINED CMAKE_TOOLCHAIN_FILE AND CMAKE_TOOLCHAIN_FILE MATCHES "vcpkg")
  set(USE_VCPKG ON)
endif()

if(USE_VCPKG)
  find_package(unofficial-sqlite3 CONFIG REQUIRED)
  find_package(httplib CONFIG REQUIRED)
  find_package(nlohmann_json CONFIG REQUIRED)
  find_package(libzip CONFIG REQUIRED)
  set(PIXELANEA_SQLITE_LIB unofficial::sqlite3::sqlite3)
  set(PIXELANEA_HTTPLIB_LIB httplib::httplib)
  set(PIXELANEA_JSON_LIB nlohmann_json::nlohmann_json)
  set(PIXELANEA_ZIP_LIB libzip::zip)
else()
  message(STATUS "vcpkg toolchain not detected; using FetchContent dependencies")

  FetchContent_Declare(
    sqlite3_amalgamation
    URL https://www.sqlite.org/2024/sqlite-amalgamation-3460100.zip
  )

  FetchContent_Declare(
    cpp_httplib
    GIT_REPOSITORY https://github.com/yhirose/cpp-httplib.git
    GIT_TAG v0.18.3
    GIT_SHALLOW TRUE
  )

  FetchContent_Declare(
    nlohmann_json
    GIT_REPOSITORY https://github.com/nlohmann/json.git
    GIT_TAG v3.11.3
    GIT_SHALLOW TRUE
  )

  # Commit hashes require a full clone — GIT_SHALLOW cannot checkout arbitrary SHAs.
  FetchContent_Declare(
    stb
    GIT_REPOSITORY https://github.com/nothings/stb.git
    GIT_TAG 31c1ad37456438565541f4919958214b6e762fb4
  )

  FetchContent_Declare(
    zlib
    GIT_REPOSITORY https://github.com/madler/zlib.git
    GIT_TAG v1.3.1
    GIT_SHALLOW TRUE
  )

  FetchContent_Declare(
    libzip
    GIT_REPOSITORY https://github.com/nih-at/libzip.git
    GIT_TAG v1.11.2
    GIT_SHALLOW TRUE
  )

  set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
  set(BUILD_TOOLS OFF CACHE BOOL "" FORCE)
  set(BUILD_REGRESS OFF CACHE BOOL "" FORCE)
  set(BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
  set(BUILD_DOC OFF CACHE BOOL "" FORCE)
  set(ENABLE_OPENSSL OFF CACHE BOOL "" FORCE)
  set(ENABLE_BZIP2 OFF CACHE BOOL "" FORCE)
  set(ENABLE_LZMA OFF CACHE BOOL "" FORCE)
  set(ENABLE_ZSTD OFF CACHE BOOL "" FORCE)
  set(ENABLE_COMMONCRYPTO OFF CACHE BOOL "" FORCE)
  set(ENABLE_GNUTLS OFF CACHE BOOL "" FORCE)
  set(ENABLE_MBEDTLS OFF CACHE BOOL "" FORCE)

  FetchContent_MakeAvailable(sqlite3_amalgamation cpp_httplib nlohmann_json stb zlib libzip)

  add_library(pixelanea_sqlite STATIC ${sqlite3_amalgamation_SOURCE_DIR}/sqlite3.c)
  target_include_directories(pixelanea_sqlite PUBLIC ${sqlite3_amalgamation_SOURCE_DIR})
  target_compile_definitions(pixelanea_sqlite PRIVATE SQLITE_THREADSAFE=1)

  set(PIXELANEA_SQLITE_LIB pixelanea_sqlite)
  set(PIXELANEA_HTTPLIB_LIB httplib::httplib)
  set(PIXELANEA_JSON_LIB nlohmann_json::nlohmann_json)
  set(PIXELANEA_ZIP_LIB zip)
endif()

set(PIXELANEA_DB_SOURCES
  src/db/connection.cpp
  src/db/migration_runner.cpp
  src/db/pixel_blob_codec.cpp
  src/db/project_repository.cpp
  src/db/frame_repository.cpp
  src/db/palette_repository.cpp
  src/domain/pixel_grid_merge.cpp
  src/domain/selection_ops.cpp
  src/logging/json_line_logger.cpp
  src/logging/scoped_logger.cpp
)

add_library(pixelanea_db STATIC ${PIXELANEA_DB_SOURCES})
target_include_directories(pixelanea_db PUBLIC src)
target_compile_definitions(
  pixelanea_db
  PUBLIC PIXELANEA_MIGRATIONS_DIR="${PIXELANEA_MIGRATIONS_DIR}"
)
target_link_libraries(
  pixelanea_db
  PUBLIC
    ${PIXELANEA_SQLITE_LIB}
    ${PIXELANEA_JSON_LIB}
)

  FetchContent_Declare(
    gifenc
    GIT_REPOSITORY https://github.com/lecram/gifenc.git
    GIT_TAG 87acd487dfa2f2a638eec751a1d6c2fff60822da
  )
FetchContent_MakeAvailable(gifenc)

set(PIXELANEA_BUNDLE_SOURCES
  src/export/sha256.cpp
  src/export/manifest.cpp
  src/export/path_safety.cpp
  src/export/bundle_io.cpp
)

add_library(pixelanea_bundle STATIC ${PIXELANEA_BUNDLE_SOURCES})
target_include_directories(pixelanea_bundle PUBLIC src)
target_link_libraries(
  pixelanea_bundle
  PUBLIC
    ${PIXELANEA_JSON_LIB}
    ${PIXELANEA_ZIP_LIB}
)

target_link_libraries(pixelanea_db PUBLIC pixelanea_bundle)

if(NOT USE_VCPKG)
  target_include_directories(
    pixelanea_db
    PUBLIC ${sqlite3_amalgamation_SOURCE_DIR}
  )
endif()

if(USE_VCPKG)
  # Commit hashes require a full clone — GIT_SHALLOW cannot checkout arbitrary SHAs.
  FetchContent_Declare(
    stb
    GIT_REPOSITORY https://github.com/nothings/stb.git
    GIT_TAG 31c1ad37456438565541f4919958214b6e762fb4
  )
  FetchContent_MakeAvailable(stb)
endif()

set(PIXELANEA_IMAGE_SOURCES
  src/image/color_utils.cpp
  src/image/decode.cpp
  src/image/downscale.cpp
  src/image/flatten_alpha.cpp
  src/image/quantize.cpp
  src/image/remove_background.cpp
  src/image/pixelate.cpp
)

add_library(pixelanea_image STATIC ${PIXELANEA_IMAGE_SOURCES})
target_include_directories(pixelanea_image PUBLIC src ${stb_SOURCE_DIR})
target_compile_definitions(pixelanea_image PUBLIC STBI_NO_THREAD_LOCALS)

set(PIXELANEA_EXPORT_SOURCES
  src/export/gif_encoder.cpp
  ${gifenc_SOURCE_DIR}/gifenc.c
)

add_library(pixelanea_export STATIC ${PIXELANEA_EXPORT_SOURCES})
target_include_directories(
  pixelanea_export
  PUBLIC
    src
    ${gifenc_SOURCE_DIR}
)
target_link_libraries(
  pixelanea_export
  PUBLIC
    pixelanea_image
)

set(PIXELANEA_SERVER_SOURCES
  src/main.cpp
  src/api/api_server.cpp
  src/api/api_http_helpers.cpp
  src/api/api_json_serializers.cpp
  src/api/api_request_parsers.cpp
  src/api/base64.cpp
  src/api/health_handlers.cpp
  src/api/project_handlers.cpp
  src/api/palette_handlers.cpp
  src/api/frame_handlers.cpp
  src/api/compute_handlers.cpp
  src/api/import_handlers.cpp
  src/api/export_handlers.cpp
  src/api/file_dialog_handlers.cpp
  src/api/web_static.cpp
  src/logging/http_request_log.cpp
)

if(NOT WIN32)
  list(APPEND PIXELANEA_SERVER_SOURCES src/api/zenity_file_dialog_provider.cpp)
endif()

add_executable(pixelanea-server ${PIXELANEA_SERVER_SOURCES})
target_link_libraries(
  pixelanea-server
  PRIVATE
    pixelanea_db
    pixelanea_image
    pixelanea_export
    ${PIXELANEA_HTTPLIB_LIB}
)

if(UNIX AND NOT APPLE)
  target_link_libraries(pixelanea-server PRIVATE pthread)
  target_link_libraries(pixelanea_db PUBLIC pthread)
endif()

option(BUILD_TESTING "Build unit tests" ON)

if(BUILD_TESTING)
  enable_testing()

  FetchContent_Declare(
    Catch2
    GIT_REPOSITORY https://github.com/catchorg/Catch2.git
    GIT_TAG v3.5.4
    GIT_SHALLOW TRUE
  )
  FetchContent_MakeAvailable(Catch2)

  add_executable(
    pixelanea_tests
    tests/pixel_blob_codec_test.cpp
    tests/migration_runner_test.cpp
    tests/repository_test.cpp
    tests/frame_binary_api_test.cpp
    tests/pixel_grid_merge_test.cpp
    tests/selection_ops_test.cpp
    tests/selection_compute_api_test.cpp
    tests/pixelate_pipeline_test.cpp
    tests/bundle_io_test.cpp
    tests/gif_encoder_test.cpp
    tests/file_dialog_test.cpp
    src/api/api_server.cpp
    src/api/api_http_helpers.cpp
    src/api/api_json_serializers.cpp
    src/api/api_request_parsers.cpp
    src/api/base64.cpp
    src/api/health_handlers.cpp
    src/api/project_handlers.cpp
    src/api/palette_handlers.cpp
    src/api/frame_handlers.cpp
  src/api/compute_handlers.cpp
    src/api/import_handlers.cpp
    src/api/export_handlers.cpp
    src/logging/http_request_log.cpp
    src/api/file_dialog_handlers.cpp
  )
  target_link_libraries(
    pixelanea_tests
    PRIVATE
      pixelanea_db
      pixelanea_image
      pixelanea_bundle
      pixelanea_export
      ${PIXELANEA_HTTPLIB_LIB}
      Catch2::Catch2WithMain
  )

  list(APPEND CMAKE_MODULE_PATH ${catch2_SOURCE_DIR}/extras)
  include(Catch)
  catch_discover_tests(pixelanea_tests)
endif()
