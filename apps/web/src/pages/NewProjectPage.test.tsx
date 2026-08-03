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

vi.mock("@/lib/loadProject", () => ({
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

  it("shows animation hint on the blank card before expanding", () => {
    render(<NewProjectPage onOpenEditor={() => {}} onStartImport={() => {}} />);
    expect(screen.getByText(copy.newProjectBlankAnimationHint)).toBeInTheDocument();
  });

  it("applies matching entry card styles to blank and import paths", () => {
    render(<NewProjectPage onOpenEditor={() => {}} onStartImport={() => {}} />);

    const blankCard = screen
      .getByText(copy.newProjectBlankTitle)
      .closest("button");
    const importCard = screen
      .getByText(copy.newProjectImportTitle)
      .closest("button");

    expect(blankCard).toBeTruthy();
    expect(importCard).toBeTruthy();
    expect(blankCard?.className).toBe(importCard?.className);
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

  it("shows prominent open-existing card when handler is provided", () => {
    const onOpenExisting = vi.fn();
    render(
      <NewProjectPage
        onOpenEditor={() => {}}
        onStartImport={() => {}}
        onOpenExisting={onOpenExisting}
      />,
    );

    const openCard = screen.getByRole("button", {
      name: new RegExp(copy.newProjectOpenExisting),
    });
    expect(openCard).toBeInTheDocument();
    expect(
      screen.getByText(copy.newProjectOpenExistingDescription),
    ).toBeInTheDocument();

    fireEvent.click(openCard);
    expect(onOpenExisting).toHaveBeenCalledTimes(1);
  });

  it("hides open-existing card when handler is not provided", () => {
    render(<NewProjectPage onOpenEditor={() => {}} onStartImport={() => {}} />);
    expect(
      screen.queryByText(copy.newProjectOpenExistingDescription),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: copy.newProjectOpenExisting }),
    ).not.toBeInTheDocument();
  });

  it("open-existing card matches blank and import entry card styling", () => {
    render(
      <NewProjectPage
        onOpenEditor={() => {}}
        onStartImport={() => {}}
        onOpenExisting={() => {}}
      />,
    );

    const openCard = screen
      .getByText(copy.newProjectOpenExisting)
      .closest("button");
    const blankCard = screen
      .getByText(copy.newProjectBlankTitle)
      .closest("button");

    expect(openCard).toBeTruthy();
    expect(blankCard).toBeTruthy();
    expect(openCard?.className).toContain("rounded-panel");
    expect(openCard?.className).toContain("border-2");
    expect(openCard?.className).toContain("bg-elevated");
    expect(blankCard?.className).toContain("rounded-panel");
    expect(blankCard?.className).toContain("border-2");
  });
});
