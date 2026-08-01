import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/content/copy";
import { useProjectFileActions } from "./useProjectFileActions";

const {
  saveProjectToBundleMock,
  flushAllSyncMock,
  showToastMock,
  editorState,
} = vi.hoisted(() => ({
  saveProjectToBundleMock: vi.fn(),
  flushAllSyncMock: vi.fn(),
  showToastMock: vi.fn(),
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
  openProjectFromBundle: vi.fn(),
  saveProjectToBundle: saveProjectToBundleMock,
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

vi.mock("@/hooks/useLoadProject", () => ({
  loadProjectIntoEditor: vi.fn(),
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
      {actions.dialogs}
    </>
  );
}

describe("useProjectFileActions", () => {
  beforeEach(() => {
    saveProjectToBundleMock.mockReset();
    flushAllSyncMock.mockReset();
    showToastMock.mockReset();
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
});
