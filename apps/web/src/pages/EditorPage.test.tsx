import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useEditorStore } from "@/state/editorStore";
import { useUiStore } from "@/state/uiStore";
import { stubCanvasEnvironment } from "@/test/canvas-mocks";
import { EditorPage } from "./EditorPage";

describe("EditorPage", () => {
  beforeEach(() => {
    stubCanvasEnvironment();
    useEditorStore.setState({ projectId: "proj-1", projectName: "Test" });
    useUiStore.setState({ apiStatus: "connected", apiVersion: "1.0.0" });
  });

  it("mounts editor shell inside TooltipProvider", () => {
    render(<EditorPage onNewProject={() => {}} />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Tools" })).toBeInTheDocument();
    expect(screen.getByLabelText("Pixel canvas")).toBeInTheDocument();
  });
});
