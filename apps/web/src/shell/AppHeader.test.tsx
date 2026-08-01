import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/content/copy";
import { useEditorStore } from "@/state/editorStore";
import { useSessionStore } from "@/state/sessionStore";
import { useUiStore } from "@/state/uiStore";
import { AppHeader } from "./AppHeader";

const fileActionsMock = vi.hoisted(() => ({
  onNewProject: vi.fn(),
  onOpenProject: vi.fn(),
  onSave: vi.fn(),
  onSaveAs: vi.fn(),
  canSave: true,
  dialogs: null,
}));

vi.mock("@/components/project/useProjectFileActions", () => ({
  useProjectFileActions: () => fileActionsMock,
}));

describe("AppHeader", () => {
  beforeEach(() => {
    useEditorStore.setState({
      projectName: "Untitled project",
      projectId: "p1",
      isDirty: false,
      isPaletteDirty: false,
      syncStatus: "idle",
      syncError: null,
      frameSyncStatus: "idle",
      paletteSyncStatus: "idle",
      frameSyncError: null,
      paletteSyncError: null,
    });
    useUiStore.setState({ apiStatus: "connected", apiVersion: "1.0.0" });
    useSessionStore.setState({ theme: "light" });
    document.documentElement.classList.remove("dark");
    fileActionsMock.onNewProject.mockReset();
    fileActionsMock.onOpenProject.mockReset();
    fileActionsMock.onSave.mockReset();
    fileActionsMock.onSaveAs.mockReset();
    fileActionsMock.canSave = true;
  });

  it("renders banner with app name and project title", () => {
    render(<AppHeader onNewProject={() => {}} />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText(copy.appName)).toBeInTheDocument();
    expect(screen.getByText("Untitled project")).toBeInTheDocument();
  });

  it("exposes header menu triggers for File, Edit, and View", () => {
    render(<AppHeader onNewProject={() => {}} />);

    expect(screen.getByRole("button", { name: "File" })).toHaveAttribute(
      "aria-haspopup",
      "menu",
    );
    expect(screen.getByRole("button", { name: "Edit" })).toHaveAttribute(
      "aria-haspopup",
      "menu",
    );
    expect(screen.getByRole("button", { name: "View" })).toHaveAttribute(
      "aria-haspopup",
      "menu",
    );
  });

  it("passes onNewProject to file actions hook", () => {
    const onNewProject = vi.fn();
    render(<AppHeader onNewProject={onNewProject} />);

    expect(onNewProject).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "File" })).toBeInTheDocument();
  });

  it("toggles theme via header control", () => {
    render(<AppHeader onNewProject={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(useSessionStore.getState().theme).toBe("dark");
  });

  it("shows unsaved indicator next to project name when dirty", () => {
    useEditorStore.setState({ isDirty: true });
    render(<AppHeader onNewProject={() => {}} />);

    expect(
      screen.getByText(`· ${copy.statusUnsavedIndicator}`),
    ).toBeInTheDocument();
  });

  it("hides unsaved indicator when clean", () => {
    render(<AppHeader onNewProject={() => {}} />);

    expect(
      screen.queryByText(`· ${copy.statusUnsavedIndicator}`),
    ).not.toBeInTheDocument();
  });
});
