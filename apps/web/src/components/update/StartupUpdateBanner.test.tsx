import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StartupUpdateBanner } from "./StartupUpdateBanner";
import { copy } from "@/content/copy";
import type { UpdateCheckResult } from "@/lib/desktop";

const sampleUpdate: UpdateCheckResult = {
  currentVersion: "1.0.0",
  latestVersion: "1.2.0",
  mainCommit: "abc1234",
  updateAvailable: true,
  downloadUrl: "https://example.com/update.exe",
  installKind: "windows_installer",
};

describe("StartupUpdateBanner", () => {
  it("renders update message and actions", () => {
    const onInstall = vi.fn();
    const onDismiss = vi.fn();

    render(
      <StartupUpdateBanner
        updateInfo={sampleUpdate}
        onInstall={onInstall}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByText(copy.startupUpdateBannerTitle)).toBeInTheDocument();
    expect(screen.getByText(copy.updateDialogInstall)).toBeInTheDocument();
    expect(screen.getByText(copy.updateDialogLater)).toBeInTheDocument();

    fireEvent.click(screen.getByText(copy.updateDialogInstall));
    expect(onInstall).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText(copy.updateDialogLater));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
