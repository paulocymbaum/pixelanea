import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/content/copy";
import { useSessionStore } from "@/state/sessionStore";
import { NewProjectPage } from "./NewProjectPage";

const { createBlankProjectMock, loadProjectIntoEditorMock } = vi.hoisted(() => ({
  createBlankProjectMock: vi.fn(),
  loadProjectIntoEditorMock: vi.fn(),
}));

vi.mock("@/api/projects", () => ({
  createBlankProject: createBlankProjectMock,
}));

vi.mock("@/hooks/useLoadProject", () => ({
  loadProjectIntoEditor: loadProjectIntoEditorMock,
}));

describe("NewProjectPage", () => {
  beforeEach(() => {
    useSessionStore.setState({
      hasVisited: false,
      lastEntryPath: "blank",
      lastResolution: 32,
      lastCanvasSize: { width: 32, height: 32 },
      lastFrameCount: 1,
    });
    createBlankProjectMock.mockReset();
    loadProjectIntoEditorMock.mockReset();
    createBlankProjectMock.mockResolvedValue({
      ok: true,
      project: { id: "proj-1", name: "Untitled", width: 32, height: 32 },
    });
    loadProjectIntoEditorMock.mockResolvedValue({ ok: true, data: {} });
  });

  it("renders two equal entry cards", () => {
    render(<NewProjectPage onOpenEditor={() => {}} onStartImport={() => {}} />);
    expect(screen.getByText(copy.newProjectBlankTitle)).toBeInTheDocument();
    expect(screen.getByText(copy.newProjectImportTitle)).toBeInTheDocument();
  });

  it("shows resolution presets when blank is selected", () => {
    render(<NewProjectPage onOpenEditor={() => {}} onStartImport={() => {}} />);
    fireEvent.click(screen.getByText(copy.newProjectBlankTitle));
    expect(screen.getByText(copy.newProjectResolutionLabel)).toBeInTheDocument();
    expect(screen.getByText("Sprite")).toBeInTheDocument();
    expect(screen.getByText(copy.customCanvasSizeLabel)).toBeInTheDocument();
    expect(screen.queryByText(copy.newProjectAnimationFrames(8))).not.toBeInTheDocument();
  });

  it("creates a blank project with frameCount 1 from the panel CTA", async () => {
    const onOpenEditor = vi.fn();
    render(
      <NewProjectPage onOpenEditor={onOpenEditor} onStartImport={() => {}} />,
    );
    fireEvent.click(screen.getByText(copy.newProjectBlankTitle));
    fireEvent.click(screen.getByText("Icon"));
    fireEvent.click(screen.getByText(copy.newProjectCreateBlank));

    await vi.waitFor(() => {
      expect(createBlankProjectMock).toHaveBeenCalledWith(
        expect.objectContaining({ width: 16, height: 16, frameCount: 1 }),
      );
    });
    await vi.waitFor(() => {
      expect(onOpenEditor).toHaveBeenCalledWith("blank");
    });
  });

  it("creates an 8-frame project from the blank panel quick-start chip", async () => {
    const onOpenEditor = vi.fn();
    render(
      <NewProjectPage onOpenEditor={onOpenEditor} onStartImport={() => {}} />,
    );
    fireEvent.click(screen.getByText(copy.newProjectBlankTitle));
    fireEvent.click(screen.getByText(copy.newProjectQuickStart8(32, 32)));

    await vi.waitFor(() => {
      expect(createBlankProjectMock).toHaveBeenCalledWith(
        expect.objectContaining({ width: 32, height: 32, frameCount: 8 }),
      );
    });
    await vi.waitFor(() => {
      expect(onOpenEditor).toHaveBeenCalledWith("blank");
    });
  });

  it("creates a blank project with custom canvas size", async () => {
    const onOpenEditor = vi.fn();
    render(
      <NewProjectPage onOpenEditor={onOpenEditor} onStartImport={() => {}} />,
    );
    fireEvent.click(screen.getByText(copy.newProjectBlankTitle));
    fireEvent.click(screen.getByText(copy.customCanvasSizeLabel));
    fireEvent.change(screen.getByLabelText(copy.customCanvasSizeWidthLabel), {
      target: { value: "48" },
    });
    fireEvent.change(screen.getByLabelText(copy.customCanvasSizeHeightLabel), {
      target: { value: "64" },
    });
    fireEvent.click(screen.getByText(copy.customCanvasSizeConfirm));
    fireEvent.click(screen.getByText(copy.newProjectCreateBlank));

    await vi.waitFor(() => {
      expect(createBlankProjectMock).toHaveBeenCalledWith(
        expect.objectContaining({ width: 48, height: 64, frameCount: 1 }),
      );
    });
  });

  it("shows quick start chips when user has visited before", () => {
    useSessionStore.setState({
      hasVisited: true,
      lastCanvasSize: { width: 32, height: 32 },
    });
    render(<NewProjectPage onOpenEditor={() => {}} onStartImport={() => {}} />);
    expect(
      screen.getByText(copy.newProjectQuickStart(32, 32)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(copy.newProjectQuickStart8(32, 32)),
    ).toBeInTheDocument();
  });

  it("8-frame quick-start chip calls API with frameCount 8", async () => {
    useSessionStore.setState({
      hasVisited: true,
      lastCanvasSize: { width: 32, height: 32 },
    });
    render(<NewProjectPage onOpenEditor={() => {}} onStartImport={() => {}} />);
    fireEvent.click(screen.getByText(copy.newProjectQuickStart8(32, 32)));

    await vi.waitFor(() => {
      expect(createBlankProjectMock).toHaveBeenCalledWith(
        expect.objectContaining({ width: 32, height: 32, frameCount: 8 }),
      );
    });
  });
});
