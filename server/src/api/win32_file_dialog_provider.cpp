#include "api/win32_file_dialog_provider.hpp"

#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#include <shobjidl.h>

#include <string>

namespace pixelanea::api {

namespace {

class ComScope {
 public:
  ComScope() : hr_(CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED)) {
    if (hr_ == RPC_E_CHANGED_MODE) {
      hr_ = S_OK;
      initialized_here_ = false;
    } else {
      initialized_here_ = SUCCEEDED(hr_);
    }
  }

  ~ComScope() {
    if (initialized_here_) {
      CoUninitialize();
    }
  }

  HRESULT status() const { return hr_; }

 private:
  HRESULT hr_;
  bool initialized_here_ = false;
};

std::filesystem::path default_folder(const PickPathRequest& request) {
  if (!request.default_path || request.default_path->empty()) {
    return {};
  }
  const auto parent = request.default_path->parent_path();
  if (parent.empty()) {
    return {};
  }
  return parent;
}

}  // namespace

Win32FileDialogProvider::Win32FileDialogProvider(logging::Logger& logger)
    : log_(logger, "api", "Win32FileDialogProvider") {}

PickPathResult Win32FileDialogProvider::pick_path(const PickPathRequest& request) {
  PickPathResult result;

  ComScope com;
  if (FAILED(com.status())) {
    result.error_message = "file dialog failed";
    log_.warn("dialog.com_init_failed", {{"hr", static_cast<int>(com.status())}});
    return result;
  }

  IFileDialog* dialog = nullptr;
  const CLSID clsid =
      request.mode == FileDialogMode::SaveAs ? CLSID_FileSaveDialog : CLSID_FileOpenDialog;
  HRESULT hr = CoCreateInstance(clsid, nullptr, CLSCTX_INPROC_SERVER, IID_PPV_ARGS(&dialog));
  if (FAILED(hr) || dialog == nullptr) {
    result.error_message = "file dialog failed";
    log_.warn("dialog.create_failed", {{"hr", static_cast<int>(hr)}});
    return result;
  }

  const wchar_t* title = request.mode == FileDialogMode::SaveAs
                             ? L"Save Pixelanea Project"
                             : L"Open Pixelanea Project";
  dialog->SetTitle(title);

  COMDLG_FILTERSPEC filters[] = {
      {L"Pixelanea projects", L"*.pixelanea"},
      {L"All files", L"*.*"},
  };
  dialog->SetFileTypes(2, filters);
  dialog->SetDefaultExtension(L"pixelanea");

  std::wstring save_name;
  if (request.mode == FileDialogMode::SaveAs) {
    save_name = std::filesystem::path(default_save_filename(request)).wstring();
    dialog->SetFileName(save_name.c_str());
  }

  const auto folder = default_folder(request);
  std::wstring folder_wide;
  if (!folder.empty()) {
    folder_wide = folder.wstring();
    IShellItem* folder_item = nullptr;
    if (SUCCEEDED(SHCreateItemFromParsingName(folder_wide.c_str(), nullptr,
                                              IID_PPV_ARGS(&folder_item)))) {
      dialog->SetDefaultFolder(folder_item);
      folder_item->Release();
    }
  }

  hr = dialog->Show(nullptr);
  if (hr == HRESULT_FROM_WIN32(ERROR_CANCELLED)) {
    dialog->Release();
    result.cancelled = true;
    return result;
  }
  if (FAILED(hr)) {
    dialog->Release();
    result.error_message = "file dialog failed";
    log_.warn("dialog.show_failed", {{"hr", static_cast<int>(hr)}});
    return result;
  }

  IShellItem* item = nullptr;
  hr = dialog->GetResult(&item);
  dialog->Release();
  if (FAILED(hr) || item == nullptr) {
    result.cancelled = true;
    return result;
  }

  PWSTR file_path = nullptr;
  hr = item->GetDisplayName(SIGDN_FILESYSPATH, &file_path);
  item->Release();
  if (FAILED(hr) || file_path == nullptr) {
    result.error_message = "file dialog failed";
    return result;
  }

  auto path = std::filesystem::path(file_path);
  CoTaskMemFree(file_path);

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
