import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/content/copy";
import { errors } from "@/content/errors";
import { useProjectFileActions } from "./useProjectFileActions";

const {
  saveProjectToBundleMock,
  openProjectFromBundleMock,
  loadProjectIntoEditorMock,
  flushAllSyncMock,
  showToastMock,
  pickProjectPathMock,
  editorState,
} = vi.hoisted(() => ({
  saveProjectToBundleMock: vi.fn(),
  openProjectFromBundleMock: vi.fn(),
  loadProjectIntoEditorMock: vi.fn(),
  flushAllSyncMock: vi.fn(),
  showToastMock: vi.fn(),
  pickProjectPathMock: vi.fn(),
  editorState: {
    projectId: "project-1",
    bundlePath: "/tmp/current.pixelanea",
    assetType: "character" as const,
    frameCount: 1,
    isDirty: false,
    isPaletteDirty: false,
    syncStatus: "idle" as const,
    setBundlePath: vi.fn(),
    setAssetType: vi.fn(),
    setFrameSyncStatus: vi.fn(),
  },
}));

vi.mock("@/api/projects", () => ({
  openProjectFromBundle: openProjectFromBundleMock,
  saveProjectToBundle: saveProjectToBundleMock,
}));

vi.mock("@/lib/filePicker", () => ({
  pickProjectPath: pickProjectPathMock,
}));

vi.mock("@/state/persist", () => ({
  flushAllSync: flushAllSyncMock,
}));

vi.mock("@/state/uiStore", () => ({
  useUiStore: (selector: (state: { showToast: typeof showToastMock }) => unknown) =>
    selector({ showToast: showToastMock }),
}));

vi.mock("@/state/editorStore", () => ({
  useEditorStore: (selector: (state: typeof editorState) => unknown) =>
    selector(editorState),
}));

vi.mock("@/lib/loadProject", () => ({
  loadProjectIntoEditor: loadProjectIntoEditorMock,
}));

vi.mock("./OverwriteConfirmDialog", () => ({
  OverwriteConfirmDialog: () => null,
}));

vi.mock("./ProjectPathDialog", () => ({
  ProjectPathDialog: () => null,
}));

function FileActionsHarness({
  onNewProject = vi.fn(),
}: {
  onNewProject?: () => void;
}) {
  const actions = useProjectFileActions({ onNewProject });
  return (
    <>
      <button type="button" onClick={actions.onNewProject}>
        harness:new
      </button>
      <button type="button" onClick={actions.onOpenProject}>
        harness:open
      </button>
      <button type="button" onClick={actions.onSaveAs}>
        harness:save-as
      </button>
      {actions.dialogs}
    </>
  );
}

describe("useProjectFileActions", () => {
  beforeEach(() => {
    saveProjectToBundleMock.mockReset();
    openProjectFromBundleMock.mockReset();
    loadProjectIntoEditorMock.mockReset();
    flushAllSyncMock.mockReset();
    showToastMock.mockReset();
    pickProjectPathMock.mockReset();
    editorState.setBundlePath.mockReset();
    editorState.setAssetType.mockReset();
    editorState.setFrameSyncStatus.mockReset();
    editorState.projectId = "project-1";
    editorState.bundlePath = "/tmp/current.pixelanea";
    editorState.assetType = "character";
    editorState.frameCount = 1;
    editorState.isDirty = false;
    editorState.isPaletteDirty = false;
    editorState.syncStatus = "idle";
    flushAllSyncMock.mockResolvedValue(undefined);
    saveProjectToBundleMock.mockResolvedValue({
      ok: true,
      path: "/tmp/current.pixelanea",
    });
    pickProjectPathMock.mockResolvedValue({
      ok: true,
      path: "/tmp/picked.pixelanea",
    });
    openProjectFromBundleMock.mockResolvedValue({
      ok: true,
      project: { id: "project-2" },
    });
    loadProjectIntoEditorMock.mockResolvedValue({ ok: true });
  });

  it("passes current asset type when saving to existing bundle path", async () => {
    const { result } = renderHook(() =>
      useProjectFileActions({ onNewProject: vi.fn() }),
    );

    await act(async () => {
      await result.current.onSave();
    });

    expect(saveProjectToBundleMock).toHaveBeenCalledWith(
      "project-1",
      "/tmp/current.pixelanea",
      "character",
    );
  });

  it("updates store asset type after successful save with new type", async () => {
    editorState.assetType = "prop";
    saveProjectToBundleMock.mockResolvedValue({
      ok: true,
      path: "/tmp/prop.pixelanea",
    });

    const { result } = renderHook(() =>
      useProjectFileActions({ onNewProject: vi.fn() }),
    );

    await act(async () => {
      await result.current.onSave();
    });

    expect(saveProjectToBundleMock).toHaveBeenCalledWith(
      "project-1",
      "/tmp/current.pixelanea",
      "prop",
    );
    expect(editorState.setAssetType).toHaveBeenCalledWith("prop");
  });

  it("skips the discard dialog when the project is clean", () => {
    const onNewProject = vi.fn();
    render(<FileActionsHarness onNewProject={onNewProject} />);

    fireEvent.click(screen.getByText("harness:new"));

    expect(onNewProject).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(copy.discardChangesTitle)).not.toBeInTheDocument();
  });

  it("prompts before starting a new project when frame edits are dirty", () => {
    const onNewProject = vi.fn();
    editorState.isDirty = true;
    render(<FileActionsHarness onNewProject={onNewProject} />);

    fireEvent.click(screen.getByText("harness:new"));

    expect(onNewProject).not.toHaveBeenCalled();
    expect(screen.getByText(copy.discardChangesTitle)).toBeInTheDocument();
  });

  it("keeps the editor open when the discard dialog is cancelled", () => {
    const onNewProject = vi.fn();
    editorState.isDirty = true;
    render(<FileActionsHarness onNewProject={onNewProject} />);

    fireEvent.click(screen.getByText("harness:new"));
    fireEvent.click(screen.getByText(copy.discardChangesCancel));

    expect(onNewProject).not.toHaveBeenCalled();
    expect(screen.queryByText(copy.discardChangesTitle)).not.toBeInTheDocument();
  });

  it("navigates after the user discards dirty work", () => {
    const onNewProject = vi.fn();
    editorState.isDirty = true;
    render(<FileActionsHarness onNewProject={onNewProject} />);

    fireEvent.click(screen.getByText("harness:new"));
    fireEvent.click(screen.getByText(copy.discardChangesConfirm));

    expect(onNewProject).toHaveBeenCalledTimes(1);
  });

  it("prompts before opening another project when edits are dirty", () => {
    editorState.isDirty = true;
    render(<FileActionsHarness />);

    fireEvent.click(screen.getByText("harness:open"));

    expect(screen.getByText(copy.discardChangesTitle)).toBeInTheDocument();
  });

  it("blocks file navigation while sync is in flight", () => {
    const onNewProject = vi.fn();
    editorState.isDirty = true;
    editorState.syncStatus = "syncing";
    const { result } = renderHook(() =>
      useProjectFileActions({ onNewProject }),
    );

    act(() => {
      result.current.onNewProject();
    });

    expect(onNewProject).not.toHaveBeenCalled();
    expect(result.current.isFileNavigationDisabled).toBe(true);
  });

  it("opens projects from the native picker without showing the fallback dialog", async () => {
    const { result } = renderHook(() =>
      useProjectFileActions({ onNewProject: vi.fn() }),
    );

    await act(async () => {
      await result.current.onOpenProject();
    });

    expect(pickProjectPathMock).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "open", defaultPath: "/tmp/current.pixelanea" }),
      expect.any(Object),
    );
    expect(openProjectFromBundleMock).toHaveBeenCalledWith("/tmp/picked.pixelanea");
    expect(loadProjectIntoEditorMock).toHaveBeenCalled();
  });

  it("does not toast when the picker is cancelled", async () => {
    pickProjectPathMock.mockResolvedValue({ ok: false, cancelled: true });
    const { result } = renderHook(() =>
      useProjectFileActions({ onNewProject: vi.fn() }),
    );

    await act(async () => {
      await result.current.onOpenProject();
    });

    expect(showToastMock).not.toHaveBeenCalled();
    expect(openProjectFromBundleMock).not.toHaveBeenCalled();
  });

  it("toasts picker errors without opening the project", async () => {
    pickProjectPathMock.mockResolvedValue({
      ok: false,
      cancelled: false,
      message: errors.filePickerUnavailable,
    });
    const { result } = renderHook(() =>
      useProjectFileActions({ onNewProject: vi.fn() }),
    );

    await act(async () => {
      await result.current.onOpenProject();
    });

    expect(showToastMock).toHaveBeenCalledWith(errors.filePickerUnavailable);
    expect(openProjectFromBundleMock).not.toHaveBeenCalled();
  });

  it("uses the native picker for save as", async () => {
    const { result } = renderHook(() =>
      useProjectFileActions({ onNewProject: vi.fn() }),
    );

    await act(async () => {
      await result.current.onSaveAs();
    });

    expect(pickProjectPathMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "saveAs",
        defaultPath: "/tmp/current.pixelanea",
        defaultName: "current",
      }),
      expect.any(Object),
    );
  });

  it("uses the native picker when saving without a bundle path", async () => {
    editorState.bundlePath = null;
    const { result } = renderHook(() =>
      useProjectFileActions({ onNewProject: vi.fn() }),
    );

    await act(async () => {
      await result.current.onSave();
    });

    expect(pickProjectPathMock).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "saveAs" }),
      expect.any(Object),
    );
    expect(saveProjectToBundleMock).not.toHaveBeenCalled();
  });

  it("blocks save while sync is in flight", async () => {
    editorState.syncStatus = "syncing";
    const { result } = renderHook(() =>
      useProjectFileActions({ onNewProject: vi.fn() }),
    );

    expect(result.current.canSave).toBe(false);

    await act(async () => {
      await result.current.onSave();
    });

    expect(saveProjectToBundleMock).not.toHaveBeenCalled();
    expect(pickProjectPathMock).not.toHaveBeenCalled();
  });

  it("blocks save as while sync is in flight", async () => {
    editorState.syncStatus = "syncing";
    const { result } = renderHook(() =>
      useProjectFileActions({ onNewProject: vi.fn() }),
    );

    await act(async () => {
      await result.current.onSaveAs();
    });

    expect(pickProjectPathMock).not.toHaveBeenCalled();
  });

  it("does not prompt to discard while sync is in flight", () => {
    const onNewProject = vi.fn();
    editorState.isDirty = true;
    editorState.syncStatus = "syncing";
    render(<FileActionsHarness onNewProject={onNewProject} />);

    fireEvent.click(screen.getByText("harness:new"));

    expect(onNewProject).not.toHaveBeenCalled();
    expect(screen.queryByText(copy.discardChangesTitle)).not.toBeInTheDocument();
  });
});
