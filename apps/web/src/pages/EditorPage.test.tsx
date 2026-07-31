import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/content/copy";
import { useEditorStore } from "@/state/editorStore";
import { useUiStore } from "@/state/uiStore";
import { stubCanvasEnvironment } from "@/test/canvas-mocks";
import { EditorPage } from "./EditorPage";

const { checkHealthMock } = vi.hoisted(() => ({
  checkHealthMock: vi.fn(),
}));

vi.mock("@/api/health", () => ({
  checkHealth: checkHealthMock,
}));

describe("EditorPage", () => {
  beforeEach(() => {
    stubCanvasEnvironment();
    useEditorStore.setState({ projectId: "proj-1", projectName: "Test" });
    useUiStore.setState({ apiStatus: "checking", apiVersion: null });
    checkHealthMock.mockReset();
    checkHealthMock.mockResolvedValue({
      ok: true,
      health: { status: "ok", version: "1.0.0" },
    });
  });

  it("mounts editor shell inside TooltipProvider", () => {
    render(<EditorPage onNewProject={() => {}} />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Tools" })).toBeInTheDocument();
    expect(screen.getByLabelText("Pixel canvas")).toBeInTheDocument();
  });

  it("checks API health on mount and updates status bar", async () => {
    render(<EditorPage onNewProject={() => {}} />);

    await waitFor(() => {
      expect(checkHealthMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(
        screen.getByText(`${copy.apiConnected} · ${copy.apiVersion("1.0.0")}`),
      ).toBeInTheDocument();
    });
  });
});
