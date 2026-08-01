import { beforeEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/content/copy";
import { notifyExportSuccess } from "./exportNotify";

const showToastMock = vi.hoisted(() => vi.fn());

vi.mock("@/state/uiStore", () => ({
  useUiStore: {
    getState: () => ({ showToast: showToastMock }),
  },
}));

describe("notifyExportSuccess", () => {
  beforeEach(() => {
    showToastMock.mockReset();
  });

  it("shows PNG export toast with filename", () => {
    notifyExportSuccess("my-art-frame-1.png");

    expect(showToastMock).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenCalledWith(
      copy.exportPngSuccessToast("my-art-frame-1.png"),
    );
  });
});
