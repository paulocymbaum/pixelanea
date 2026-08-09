import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStartupDesktopUpdateCheck } from "./useStartupDesktopUpdateCheck";
import { useUiStore } from "@/state/uiStore";

const {
  isDesktopShellMock,
  checkUpdateConnectionMock,
  checkForDesktopUpdatesMock,
} = vi.hoisted(() => ({
  isDesktopShellMock: vi.fn(() => true),
  checkUpdateConnectionMock: vi.fn(),
  checkForDesktopUpdatesMock: vi.fn(),
}));

vi.mock("@/lib/desktop", () => ({
  isDesktopShell: isDesktopShellMock,
  checkUpdateConnection: checkUpdateConnectionMock,
  checkForDesktopUpdates: checkForDesktopUpdatesMock,
}));

describe("useStartupDesktopUpdateCheck", () => {
  beforeEach(() => {
    useUiStore.setState({ apiStatus: "connected", apiVersion: "1.0.0" });
    isDesktopShellMock.mockReturnValue(true);
    checkUpdateConnectionMock.mockReset();
    checkForDesktopUpdatesMock.mockReset();
    checkUpdateConnectionMock.mockResolvedValue({ connected: true, message: "ok" });
    checkForDesktopUpdatesMock.mockResolvedValue({
      currentVersion: "1.0.0",
      latestVersion: "1.2.0",
      mainCommit: "abc",
      updateAvailable: true,
      downloadUrl: "https://example.com/update.exe",
      installKind: "windows_installer",
    });
  });

  it("returns update info when a newer build is available", async () => {
    const { result } = renderHook(() => useStartupDesktopUpdateCheck(true));

    await waitFor(() => {
      expect(result.current?.latestVersion).toBe("1.2.0");
    });
  });

  it("does not check when disabled", async () => {
    renderHook(() => useStartupDesktopUpdateCheck(false));

    await waitFor(() => {
      expect(checkForDesktopUpdatesMock).not.toHaveBeenCalled();
    });
  });
});
