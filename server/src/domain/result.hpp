#pragma once

#include <optional>
#include <string>
#include <utility>

namespace pixelanea::domain {

template <typename T>
class Result {
 public:
  static Result ok(T value) { return Result(std::move(value), {}); }
  static Result fail(std::string message) { return Result({}, std::move(message)); }

  bool has_value() const { return value_.has_value(); }
  const T& value() const { return *value_; }
  T& value() { return *value_; }
  const std::string& error() const { return error_; }

 private:
  Result(std::optional<T> value, std::string error)
      : value_(std::move(value)), error_(std::move(error)) {}

  std::optional<T> value_;
  std::string error_;
};

class VoidResult {
 public:
  static VoidResult ok() { return VoidResult(true, {}); }
  static VoidResult fail(std::string message) { return VoidResult(false, std::move(message)); }

  bool has_value() const { return ok_; }
  const std::string& error() const { return error_; }

 private:
  VoidResult(bool ok, std::string error) : ok_(ok), error_(std::move(error)) {}

  bool ok_;
  std::string error_;
};

}  // namespace pixelanea::domain
