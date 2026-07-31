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
  set(PIXELANEA_SQLITE_LIB unofficial::sqlite3::sqlite3)
  set(PIXELANEA_HTTPLIB_LIB httplib::httplib)
  set(PIXELANEA_JSON_LIB nlohmann_json::nlohmann_json)
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

  FetchContent_MakeAvailable(sqlite3_amalgamation cpp_httplib nlohmann_json)

  add_library(pixelanea_sqlite STATIC ${sqlite3_amalgamation_SOURCE_DIR}/sqlite3.c)
  target_include_directories(pixelanea_sqlite PUBLIC ${sqlite3_amalgamation_SOURCE_DIR})
  target_compile_definitions(pixelanea_sqlite PRIVATE SQLITE_THREADSAFE=1)

  set(PIXELANEA_SQLITE_LIB pixelanea_sqlite)
  set(PIXELANEA_HTTPLIB_LIB httplib::httplib)
  set(PIXELANEA_JSON_LIB nlohmann_json::nlohmann_json)
endif()

set(PIXELANEA_DB_SOURCES
  src/db/connection.cpp
  src/db/migration_runner.cpp
  src/db/pixel_blob_codec.cpp
  src/db/project_repository.cpp
  src/db/frame_repository.cpp
  src/db/palette_repository.cpp
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

if(NOT USE_VCPKG)
  target_include_directories(
    pixelanea_db
    PUBLIC ${sqlite3_amalgamation_SOURCE_DIR}
  )
endif()

set(PIXELANEA_SERVER_SOURCES
  src/main.cpp
  src/api/api_server.cpp
  src/logging/http_request_log.cpp
)

add_executable(pixelanea-server ${PIXELANEA_SERVER_SOURCES})
target_link_libraries(
  pixelanea-server
  PRIVATE
    pixelanea_db
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
  )
  target_link_libraries(
    pixelanea_tests
    PRIVATE
      pixelanea_db
      Catch2::Catch2WithMain
  )

  list(APPEND CMAKE_MODULE_PATH ${catch2_SOURCE_DIR}/extras)
  include(Catch)
  catch_discover_tests(pixelanea_tests)
endif()
