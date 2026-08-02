import "@/test/fixtures/fileActionsMock";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/content/copy";
import { useEditorStore } from "@/state/editorStore";
import { useSessionStore } from "@/state/sessionStore";
import { useUiStore } from "@/state/uiStore";
import {
  exportFrameToPngMock,
  fileActionsMock,
  notifyExportSuccessMock,
  resetFileActionsMock,
} from "@/test/fixtures/fileActionsMock";
import { AppHeader } from "./AppHeader";

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
    resetFileActionsMock();
  });

  it("renders banner with app name and project title", () => {
    render(<AppHeader onNewProject={() => {}} />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText(copy.appName)).toBeInTheDocument();
    expect(screen.getByText("Untitled project")).toBeInTheDocument();
  });

  it("shows basename with full path in title tooltip", () => {
    const fullPath = "/tmp/pixelanea-qa/walk.pixelanea";
    useEditorStore.setState({
      bundlePath: fullPath,
    });

    render(<AppHeader onNewProject={() => {}} />);

    expect(screen.getByText("walk.pixelanea")).toBeInTheDocument();
    expect(screen.queryByText(fullPath)).not.toBeInTheDocument();
    expect(screen.getByTitle(fullPath)).toBeInTheDocument();
  });

  it("exposes header menu triggers for File and View", () => {
    render(<AppHeader onNewProject={() => {}} />);

    expect(screen.getByRole("button", { name: "File" })).toHaveAttribute(
      "aria-haspopup",
      "menu",
    );
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View" })).toHaveAttribute(
      "aria-haspopup",
      "menu",
    );
  });

  it("shows Export submenu with PNG, spritesheet, and GIF", async () => {
    render(<AppHeader onNewProject={() => {}} />);

    fireEvent.keyDown(screen.getByRole("button", { name: "File" }), {
      key: "Enter",
    });

    fireEvent.click(
      await screen.findByRole("menuitem", { name: copy.fileMenuExport }),
    );

    expect(
      await screen.findByRole("menuitem", { name: copy.fileMenuExportPng }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: copy.fileMenuExportSpritesheet }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: copy.fileMenuExportGif }),
    ).toBeInTheDocument();
  });

  it("shows Import image when onImportImage is provided", async () => {
    const onImportImage = vi.fn();
    render(<AppHeader onNewProject={() => {}} onImportImage={onImportImage} />);

    fireEvent.keyDown(screen.getByRole("button", { name: "File" }), {
      key: "Enter",
    });

    const item = await screen.findByRole("menuitem", {
      name: copy.fileMenuImport,
    });
    fireEvent.click(item);
    expect(onImportImage).toHaveBeenCalledTimes(1);
  });

  it("hides Import image when onImportImage is omitted", async () => {
    render(<AppHeader onNewProject={() => {}} />);

    fireEvent.keyDown(screen.getByRole("button", { name: "File" }), {
      key: "Enter",
    });

    expect(
      screen.queryByRole("menuitem", { name: copy.fileMenuImport }),
    ).not.toBeInTheDocument();
  });

  it("passes onNewProject to file actions hook", () => {
    const onNewProject = vi.fn();
    render(<AppHeader onNewProject={onNewProject} />);

    expect(onNewProject).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "File" })).toBeInTheDocument();
  });

  it("toggles theme via header control", () => {
    render(<AppHeader onNewProject={() => {}} />);

    fireEvent.click(
      screen.getByRole("button", { name: copy.themeToggleAriaLabel }),
    );

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(useSessionStore.getState().theme).toBe("dark");
  });

  it("shows Theme label text for large breakpoints", () => {
    render(<AppHeader onNewProject={() => {}} />);

    const label = screen.getByText(copy.themeToggleLabel);
    expect(label).toHaveClass("hidden", "lg:inline");
    expect(
      screen.getByRole("button", { name: copy.themeToggleAriaLabel }),
    ).toContainElement(label);
  });

  it("shows unsaved dot indicator next to project name when dirty", () => {
    useEditorStore.setState({ isDirty: true });
    render(<AppHeader onNewProject={() => {}} />);

    expect(
      screen.getByLabelText(copy.statusUnsaved),
    ).toBeInTheDocument();
  });

  it("hides unsaved indicator when clean", () => {
    render(<AppHeader onNewProject={() => {}} />);

    expect(
      screen.queryByLabelText(copy.statusUnsaved),
    ).not.toBeInTheDocument();
  });

  it("shows primary Save button in header chrome", () => {
    render(<AppHeader onNewProject={() => {}} />);

    const saveButtons = screen.getAllByRole("button", {
      name: copy.fileMenuSave,
    });
    expect(saveButtons.length).toBeGreaterThanOrEqual(1);
    expect(saveButtons[0]).toBeInTheDocument();
  });

  it("calls onSave when header Save is clicked", () => {
    render(<AppHeader onNewProject={() => {}} />);

    const saveButton = screen.getAllByRole("button", {
      name: copy.fileMenuSave,
    })[0];
    fireEvent.click(saveButton);

    expect(fileActionsMock.onSave).toHaveBeenCalledTimes(1);
  });

  it("disables header Save when canSave is false", () => {
    fileActionsMock.canSave = false;
    render(<AppHeader onNewProject={() => {}} />);

    const saveButton = screen.getAllByRole("button", {
      name: copy.fileMenuSave,
    })[0];
    expect(saveButton).toBeDisabled();
  });

  it("disables header Save while save is in flight", () => {
    fileActionsMock.isSaving = true;
    render(<AppHeader onNewProject={() => {}} />);

    const saveButton = screen.getAllByRole("button", {
      name: copy.fileMenuSave,
    })[0];
    expect(saveButton).toBeDisabled();
  });

  it("notifies export success after Export PNG", async () => {
    useEditorStore.setState({
      projectName: "My Art",
      activeFrameIndex: 0,
      gridWidth: 8,
      gridHeight: 8,
      pixels: new Uint8Array(64),
      paletteColors: ["#000000", "#ffffff"],
    });

    render(<AppHeader onNewProject={() => {}} />);

    fireEvent.keyDown(screen.getByRole("button", { name: "File" }), {
      key: "Enter",
    });

    fireEvent.click(
      await screen.findByRole("menuitem", { name: copy.fileMenuExport }),
    );

    const exportItem = await screen.findByRole("menuitem", {
      name: copy.fileMenuExportPng,
    });
    fireEvent.click(exportItem);

    await waitFor(() => {
      expect(exportFrameToPngMock).toHaveBeenCalledTimes(1);
    });
    expect(notifyExportSuccessMock).toHaveBeenCalledTimes(1);
    expect(notifyExportSuccessMock).toHaveBeenCalledWith(
      "My-Art-frame-1.png",
      "png",
    );
  });
});
