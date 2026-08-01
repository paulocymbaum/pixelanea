import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exportFilename, exportGifFilename, exportSpritesheetFilename } from "@/canvas/exportFrame";
import { useProjectFileActions } from "@/components/project/useProjectFileActions";
import { copy } from "@/content/copy";
import { errors } from "@/content/errors";
import { AppHeader } from "@/shell/AppHeader";
import { useEditorStore } from "@/state/editorStore";
import {
  flushFrameSync,
  resetPersistState,
  scheduleFrameSync,
  setSyncCoordinatorForTests,
} from "@/state/persist";
import { useUiStore } from "@/state/uiStore";
import {
  FakeProjectBackend,
  MATRIX_BUNDLE_PATH,
  MATRIX_GRID,
  MATRIX_PROJECT_ID,
  SERVER_ALREADY_OPEN_MESSAGE,
  SERVER_CHECKSUM_MESSAGE,
  SERVER_CORRUPT_BUNDLE_MESSAGE,
  SERVER_DISK_FULL_MESSAGE,
  SERVER_READ_ONLY_MESSAGE,
  SERVER_TRAVERSAL_MESSAGE,
  editDirtyPalette,
  framePixels,
  installExportCapture,
  paintDirtyPixel,
  pixelAt,
  resetProjectIoStore,
  rgbaAt,
  type ExportCapture,
} from "./projectIoMatrixHarness";

const { backendRef } = vi.hoisted(() => ({
  backendRef: { current: null as FakeProjectBackend | null },
}));

vi.mock("@/api/client", () => ({
  getApiClient: () => {
    if (!backendRef.current) {
      throw new Error("fake project backend not installed");
    }
    return backendRef.current.asApiClient();
  },
}));

function backend(): FakeProjectBackend {
  if (!backendRef.current) {
    throw new Error("fake project backend not installed");
  }
  return backendRef.current;
}

const MENU_NEW = "harness:new";
const MENU_OPEN = "harness:open";
const MENU_SAVE = "harness:save";
const MENU_SAVE_AS = "harness:save-as";

const PATH_A = MATRIX_BUNDLE_PATH;
const PATH_B = "/tmp/pixelanea-qa/copy.pixelanea";

/**
 * Stands in for the File menu so the matrix can drive the real
 * `useProjectFileActions` hook and its real dialogs without Radix menus.
 */
function FileActionsHarness({
  onNewProject = () => {},
  onProjectOpened,
}: {
  onNewProject?: () => void;
  onProjectOpened?: () => void;
}) {
  const actions = useProjectFileActions({ onNewProject, onProjectOpened });
  return (
    <>
      <button type="button" onClick={actions.onNewProject}>
        {MENU_NEW}
      </button>
      <button type="button" onClick={actions.onOpenProject}>
        {MENU_OPEN}
      </button>
      <button type="button" disabled={!actions.canSave} onClick={actions.onSave}>
        {MENU_SAVE}
      </button>
      <button type="button" disabled={!actions.canSave} onClick={actions.onSaveAs}>
        {MENU_SAVE_AS}
      </button>
      {actions.dialogs}
    </>
  );
}

/** Let queued promises and short timers settle inside act(). */
async function settle(ms = 5): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

async function clickSave(): Promise<void> {
  await act(async () => {
    fireEvent.click(screen.getByText(MENU_SAVE));
  });
  await settle();
}

async function saveAs(path: string, assetTypeLabel?: string): Promise<void> {
  fireEvent.click(screen.getByText(MENU_SAVE_AS));
  fireEvent.change(screen.getByLabelText(copy.projectPathLabel), {
    target: { value: path },
  });
  if (assetTypeLabel) {
    fireEvent.click(screen.getByText(assetTypeLabel));
  }
  fireEvent.click(screen.getByText(copy.projectSaveConfirm));
  await act(async () => {
    fireEvent.click(screen.getByText(copy.projectOverwriteConfirm));
  });
  await settle();
}

async function confirmDiscardNavigationIfNeeded(): Promise<void> {
  const discard = screen.queryByText(copy.discardChangesConfirm);
  if (!discard) {
    return;
  }

  await act(async () => {
    fireEvent.click(discard);
  });
  await settle();
}

async function openBundle(path: string): Promise<void> {
  fireEvent.click(screen.getByText(MENU_OPEN));
  await confirmDiscardNavigationIfNeeded();
  fireEvent.change(screen.getByLabelText(copy.projectPathLabel), {
    target: { value: path },
  });
  await act(async () => {
    fireEvent.click(screen.getByText(copy.projectOpenConfirm));
  });
  await settle();
}

async function selectFileMenuItem(label: string): Promise<void> {
  fireEvent.keyDown(screen.getByRole("button", { name: "File" }), { key: "Enter" });
  await act(async () => {
    fireEvent.click(screen.getByRole("menuitem", { name: label }));
  });
  await settle();
}

function callsMatching(prefix: string): string[] {
  return backend().calls.filter((call) => call.startsWith(prefix));
}

describe("QA-004 save / open round-trip matrix", () => {
  let capture: ExportCapture | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    backendRef.current = new FakeProjectBackend();
    setSyncCoordinatorForTests(null);
    useUiStore.setState({ toastMessage: null });
    resetProjectIoStore();
    backend().seedProject();
  });

  afterEach(() => {
    resetPersistState();
    capture?.restore();
    capture = null;
  });

  describe("happy path", () => {
    it("[HP-001] first Save As writes a bundle and confirms the save", async () => {
      resetProjectIoStore({ bundlePath: null });
      paintDirtyPixel(1, 1, 3);
      editDirtyPalette(2, "#123456");

      render(<FileActionsHarness />);
      // Typed without an extension to confirm normalization on submit.
      await saveAs("/tmp/pixelanea-qa/test", copy.projectAssetTypeCharacter);

      const path = "/tmp/pixelanea-qa/test.pixelanea";
      expect(backend().files.has(path)).toBe(true);
      expect(useEditorStore.getState().bundlePath).toBe(path);
      expect(useEditorStore.getState().assetType).toBe("character");
      expect(useUiStore.getState().toastMessage).toBe(copy.projectSavedToast);

      // Pending frame and palette edits are flushed before the bundle is packed.
      expect(backend().bundleFrame(path, 0)[1 * MATRIX_GRID + 1]).toBe(3);
      expect(backend().files.get(path)!.record.palette.colors[2]!.hex).toBe(
        "#123456",
      );
    });

    it("[HP-002] Save over the existing path keeps the newest edits", async () => {
      resetProjectIoStore({ bundlePath: PATH_A });
      paintDirtyPixel(0, 0, 2);

      render(<FileActionsHarness />);
      await clickSave();
      expect(backend().writeCounts.get(PATH_A)).toBe(1);

      paintDirtyPixel(4, 4, 5);
      await clickSave();

      expect(backend().writeCounts.get(PATH_A)).toBe(2);
      expect(backend().files.size).toBe(1);
      expect(backend().bundleFrame(PATH_A, 0)[4 * MATRIX_GRID + 4]).toBe(5);

      backend().simulateSessionRestart();
      await openBundle(PATH_A);

      expect(pixelAt(0, 0)).toBe(2);
      expect(pixelAt(4, 4)).toBe(5);
    });

    it("[HP-003] Save As to a new path leaves the original bundle untouched", async () => {
      resetProjectIoStore({ bundlePath: PATH_A });
      paintDirtyPixel(0, 0, 2);

      render(<FileActionsHarness />);
      await clickSave();

      paintDirtyPixel(7, 7, 4);
      await saveAs(PATH_B);

      expect(backend().bundleFrame(PATH_A, 0)[7 * MATRIX_GRID + 7]).toBe(0);
      expect(backend().bundleFrame(PATH_B, 0)[7 * MATRIX_GRID + 7]).toBe(4);
      expect(backend().bundleFrame(PATH_B, 0)[0]).toBe(2);
      expect(useEditorStore.getState().bundlePath).toBe(PATH_B);
      expect(backend().writeCounts.get(PATH_A)).toBe(1);
    });

    it("[HP-004] opening an existing bundle restores frames, palette, and settings", async () => {
      const saved = framePixels(MATRIX_GRID, MATRIX_GRID, 0);
      saved[3 * MATRIX_GRID + 3] = 2;
      backend().seedBundleFile(PATH_A, {
        id: "saved-project",
        name: "Walk cycle",
        frameCount: 4,
        fps: 12,
        assetType: "animation",
        paletteColors: ["#000000", "#FF0000", "#00FF00"],
        frames: { 0: saved },
      });

      render(<FileActionsHarness />);
      await openBundle(PATH_A);

      const state = useEditorStore.getState();
      expect(state.projectId).toBe("saved-project");
      expect(state.projectName).toBe("Walk cycle");
      expect(state.frameCount).toBe(4);
      expect(state.gridWidth).toBe(MATRIX_GRID);
      expect(state.gridHeight).toBe(MATRIX_GRID);
      expect(state.paletteColors).toEqual(["#000000", "#FF0000", "#00FF00"]);
      expect(state.assetType).toBe("animation");
      expect(state.bundlePath).toBe(PATH_A);
      expect(pixelAt(3, 3)).toBe(2);
      expect(state.isDirty).toBe(false);
      expect(state.undoStack).toHaveLength(0);
    });

    it("[HP-005] round-trip keeps pixels, frames, palette, fps, and loop", async () => {
      const frame0 = framePixels(MATRIX_GRID, MATRIX_GRID, 0);
      frame0[0] = 1;
      const frame1 = framePixels(MATRIX_GRID, MATRIX_GRID, 2);
      const frame2 = framePixels(MATRIX_GRID, MATRIX_GRID, 3);

      backendRef.current = new FakeProjectBackend();
      backend().seedProject({
        frameCount: 3,
        fps: 12,
        frames: { 0: frame0, 1: frame1, 2: frame2 },
      });
      resetProjectIoStore({
        bundlePath: null,
        frameCount: 3,
        pixels: frame0,
        animationFps: 12,
        animationLoop: false,
      });
      editDirtyPalette(3, "#ABCDEF");

      render(<FileActionsHarness />);
      await saveAs(PATH_A);

      // New session: server handles are gone and the editor is back to defaults.
      backend().simulateSessionRestart();
      resetProjectIoStore({
        projectId: null,
        projectName: "",
        pixels: framePixels(MATRIX_GRID, MATRIX_GRID, 0),
      });

      await openBundle(PATH_A);

      const state = useEditorStore.getState();
      expect(state.frameCount).toBe(3);
      expect(pixelAt(0, 0)).toBe(1);
      expect(state.paletteColors[3]).toBe("#ABCDEF");
      expect(backend().liveFrame(MATRIX_PROJECT_ID, 1)).toEqual([...frame1]);
      expect(backend().liveFrame(MATRIX_PROJECT_ID, 2)).toEqual([...frame2]);
      expect(state.frameSyncStatus).toBe("idle");

      // Animation settings are part of the project and must survive the round-trip.
      expect({ fps: state.animationFps, loop: state.animationLoop }).toEqual({
        fps: 12,
        loop: false,
      });
    });

    it("[HP-006] asset type chosen at save time survives a reopen", async () => {
      resetProjectIoStore({ bundlePath: null });

      render(<FileActionsHarness />);
      await saveAs(PATH_A, copy.projectAssetTypeProp);

      expect(useEditorStore.getState().assetType).toBe("prop");
      expect(backend().files.get(PATH_A)!.assetType).toBe("prop");

      backend().simulateSessionRestart();
      resetProjectIoStore({ assetType: "character" });
      await openBundle(PATH_A);

      expect(useEditorStore.getState().assetType).toBe("prop");
    });

    it("[HP-007] Export PNG writes the current frame at grid resolution", async () => {
      const pixels = framePixels(MATRIX_GRID, MATRIX_GRID, 0);
      pixels[2 * MATRIX_GRID + 1] = 1;
      resetProjectIoStore({
        projectName: "My Art",
        pixels,
        paletteColors: ["#000000", "#FF0000", "#00FF00"],
      });
      capture = installExportCapture();

      render(<AppHeader onNewProject={() => {}} />);
      await selectFileMenuItem(copy.fileMenuExportPng);

      expect(capture.downloads).toHaveLength(1);
      const png = capture.downloads[0]!;
      expect(png.filename).toBe(exportFilename("My Art", 0));
      expect(png.blobType).toBe("image/png");
      expect(png.width).toBe(MATRIX_GRID);
      expect(png.height).toBe(MATRIX_GRID);
      expect(rgbaAt(png, 1, 2)).toEqual([255, 0, 0, 255]);
      expect(rgbaAt(png, 0, 0)).toEqual([0, 0, 0, 0]);
    });

    it("[HP-008] Export spritesheet lays every frame into one image", async () => {
      const frame0 = framePixels(MATRIX_GRID, MATRIX_GRID, 1);
      const frame1 = framePixels(MATRIX_GRID, MATRIX_GRID, 2);
      const frame2 = framePixels(MATRIX_GRID, MATRIX_GRID, 1);

      backendRef.current = new FakeProjectBackend();
      backend().seedProject({
        frameCount: 3,
        frames: { 0: frame0, 1: frame1, 2: frame2 },
      });
      resetProjectIoStore({
        projectName: "Walk cycle",
        frameCount: 3,
        pixels: frame0,
        paletteColors: ["#000000", "#FF0000", "#00FF00"],
      });
      capture = installExportCapture();

      render(<AppHeader onNewProject={() => {}} />);
      await selectFileMenuItem(copy.fileMenuExportSpritesheet);

      expect(capture.downloads).toHaveLength(1);
      const sheet = capture.downloads[0]!;
      expect(sheet.filename).toBe(exportSpritesheetFilename("Walk cycle"));
      expect(sheet.width).toBe(MATRIX_GRID * 3);
      expect(sheet.height).toBe(MATRIX_GRID);
      expect(rgbaAt(sheet, 0, 0)).toEqual([255, 0, 0, 255]);
      expect(rgbaAt(sheet, MATRIX_GRID, 0)).toEqual([0, 255, 0, 255]);
      expect(rgbaAt(sheet, MATRIX_GRID * 2, 0)).toEqual([255, 0, 0, 255]);
    });

    it("[HP-009] Export GIF sends the project fps and loop setting", async () => {
      backendRef.current = new FakeProjectBackend();
      backend().seedProject({ frameCount: 3 });
      resetProjectIoStore({
        projectName: "Walk cycle",
        frameCount: 3,
        animationFps: 12,
        animationLoop: false,
      });
      capture = installExportCapture();

      render(<AppHeader onNewProject={() => {}} />);
      await selectFileMenuItem(copy.fileMenuExportGif);

      expect(backend().gifRequests).toEqual([
        { projectId: MATRIX_PROJECT_ID, body: { fps: 12, loop: false } },
      ]);
      expect(capture.downloads).toHaveLength(1);
      expect(capture.downloads[0]!.filename).toBe(exportGifFilename("Walk cycle"));
      expect(capture.downloads[0]!.blobType).toBe("image/gif");
      expect(useEditorStore.getState().frameSyncStatus).toBe("idle");
    });

    it.skip("[HP-010] cross-machine round-trip", () => {
      // Needs two machines (or a VM) plus a real filesystem copy — Playwright /
      // manual gate. Bundle-level integrity is covered by
      // server/tests/bundle_io_test.cpp and by [HP-005].
    });
  });

  describe("race conditions", () => {
    it("[RACE-001] save waits for the in-flight frame PUT and packs the newest pixels", async () => {
      resetProjectIoStore({ bundlePath: PATH_A });

      let gatedOnce = false;
      backend().beforeFrameWrite = async () => {
        if (!gatedOnce) {
          gatedOnce = true;
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      };

      paintDirtyPixel(1, 1, 2);
      const inFlight = flushFrameSync();
      paintDirtyPixel(2, 2, 3);

      render(<FileActionsHarness />);
      await act(async () => {
        fireEvent.click(screen.getByText(MENU_SAVE));
        await inFlight;
      });
      await settle(30);

      expect(backend().bundleFrame(PATH_A, 0)[2 * MATRIX_GRID + 2]).toBe(3);
      expect(backend().bundleFrame(PATH_A, 0)[1 * MATRIX_GRID + 1]).toBe(2);
      expect(callsMatching("saveProject")).toHaveLength(1);

      const lastPut = backend().calls.lastIndexOf(`putFrame:${MATRIX_PROJECT_ID}:0`);
      const saveAt = backend().calls.indexOf(
        `saveProject:${MATRIX_PROJECT_ID}:${PATH_A}`,
      );
      expect(lastPut).toBeGreaterThanOrEqual(0);
      expect(lastPut).toBeLessThan(saveAt);
    });

    it("[RACE-002] opening another file with unsaved edits protects that work", async () => {
      const other = framePixels(MATRIX_GRID, MATRIX_GRID, 0);
      other[5 * MATRIX_GRID + 5] = 4;
      backend().seedBundleFile(PATH_B, {
        id: "other-project",
        name: "Other project",
        frames: { 0: other },
      });

      resetProjectIoStore({ bundlePath: PATH_A });
      paintDirtyPixel(0, 0, 7);
      scheduleFrameSync();

      render(<FileActionsHarness />);
      await openBundle(PATH_B);
      await settle(30);

      // No mixed project state: everything comes from the newly opened bundle.
      const state = useEditorStore.getState();
      expect(state.projectId).toBe("other-project");
      expect(state.projectName).toBe("Other project");
      expect(state.bundlePath).toBe(PATH_B);
      expect(pixelAt(5, 5)).toBe(4);
      expect(pixelAt(0, 0)).toBe(0);
      expect(state.isDirty).toBe(false);
      expect(state.undoStack).toHaveLength(0);

      // The unsaved stroke must be either persisted or confirmed away first.
      const persistedBeforeOpen = callsMatching("putFrame").length > 0;
      const promptShown = screen.queryAllByRole("dialog").length > 0;
      expect(persistedBeforeOpen || promptShown).toBe(true);
    });

    it("[RACE-003] confirming overwrite twice writes the bundle once", async () => {
      resetProjectIoStore({ bundlePath: null });
      backend().seedBundleFile(PATH_A, { id: "stale-project" });
      paintDirtyPixel(1, 1, 2);

      let releaseSave: (() => void) | undefined;
      backend().beforeSave = () =>
        new Promise<void>((resolve) => {
          releaseSave = resolve;
        });

      render(<FileActionsHarness />);
      fireEvent.click(screen.getByText(MENU_SAVE_AS));
      fireEvent.change(screen.getByLabelText(copy.projectPathLabel), {
        target: { value: PATH_A },
      });
      fireEvent.click(screen.getByText(copy.projectSaveConfirm));

      const confirm = screen.getByText(copy.projectOverwriteConfirm);
      await act(async () => {
        fireEvent.click(confirm);
      });

      // The first write is still in flight, so the confirm must not fire again.
      expect(confirm).toBeDisabled();
      await act(async () => {
        fireEvent.click(confirm);
      });

      releaseSave?.();
      await settle();

      expect(backend().writeCounts.get(PATH_A)).toBe(1);
      expect(callsMatching("saveProject")).toHaveLength(1);

      // A single complete write: the bundle still holds a full frame buffer.
      const packed = backend().bundleFrame(PATH_A, 0);
      expect(packed).toHaveLength(MATRIX_GRID * MATRIX_GRID);
      expect(packed[1 * MATRIX_GRID + 1]).toBe(2);
    });

    it("[RACE-004] opening the just-saved path without closing is blocked clearly", async () => {
      resetProjectIoStore({ bundlePath: PATH_A });
      paintDirtyPixel(2, 2, 3);

      render(<FileActionsHarness />);
      await clickSave();
      await openBundle(PATH_A);

      // Server still holds the project, so the reload is refused, not half-done.
      expect(screen.getByText(SERVER_ALREADY_OPEN_MESSAGE)).toBeInTheDocument();
      const state = useEditorStore.getState();
      expect(state.projectId).toBe(MATRIX_PROJECT_ID);
      expect(state.bundlePath).toBe(PATH_A);
      expect(pixelAt(2, 2)).toBe(3);
      expect(state.frameCount).toBe(1);
    });
  });

  describe("edge cases", () => {
    it("[EDGE-001] a minimal one-frame bundle opens without error", async () => {
      backend().seedBundleFile(PATH_A, {
        id: "minimal-project",
        name: "Minimal",
        frameCount: 1,
      });

      render(<FileActionsHarness />);
      await openBundle(PATH_A);

      const state = useEditorStore.getState();
      expect(state.projectId).toBe("minimal-project");
      expect(state.frameCount).toBe(1);
      expect(state.paletteColors).toHaveLength(6);
      expect(state.pixels.every((value) => value === 0)).toBe(true);
      expect(screen.queryByText(errors.openProjectFailed)).toBeNull();
      expect(state.frameSyncStatus).toBe("idle");
    });

    it.skip("[EDGE-002] schema migration on open", () => {
      // Migration runs in C++ (MigrationRunner::apply_all inside
      // ProjectRepository::open_from_bundle) and is not reachable from the web
      // layer. Covered by server/tests/migration_runner_test.cpp.
    });

    it("[EDGE-003] unicode and long paths round-trip through save and open", async () => {
      const unicodePath = `/tmp/pixelanea-qa/日本語-スプライト-${"a".repeat(80)}.pixelanea`;
      resetProjectIoStore({ bundlePath: null });
      paintDirtyPixel(6, 6, 5);

      render(<FileActionsHarness />);
      await saveAs(unicodePath);

      expect(backend().files.has(unicodePath)).toBe(true);
      expect(useEditorStore.getState().bundlePath).toBe(unicodePath);

      backend().simulateSessionRestart();
      resetProjectIoStore({
        pixels: framePixels(MATRIX_GRID, MATRIX_GRID, 0),
      });
      await openBundle(unicodePath);

      expect(pixelAt(6, 6)).toBe(5);
      expect(useEditorStore.getState().bundlePath).toBe(unicodePath);
    });

    it("[EDGE-004] off-palette pixels warn before export and export on confirm", async () => {
      const pixels = framePixels(MATRIX_GRID, MATRIX_GRID, 0);
      pixels[0] = 9;
      resetProjectIoStore({
        projectName: "Off palette",
        pixels,
        paletteColors: ["#000000", "#FF0000", "#00FF00"],
      });
      capture = installExportCapture();

      render(<AppHeader onNewProject={() => {}} />);
      await selectFileMenuItem(copy.fileMenuExportPng);

      expect(screen.getByText(copy.exportOffPaletteTitle)).toBeInTheDocument();
      expect(
        screen.getByText(copy.exportOffPaletteDescription(1, 1)),
      ).toBeInTheDocument();
      expect(capture.downloads).toHaveLength(0);

      await act(async () => {
        fireEvent.click(screen.getByText(copy.exportOffPaletteConfirm));
      });
      await settle();

      expect(capture.downloads).toHaveLength(1);
      expect(capture.downloads[0]!.filename).toBe(
        exportFilename("Off palette", 0),
      );
    });

    it("[EDGE-005] starting a new project with unsaved edits asks first", async () => {
      const onNewProject = vi.fn();
      resetProjectIoStore({ bundlePath: null });
      paintDirtyPixel(1, 1, 2);

      render(<FileActionsHarness onNewProject={() => onNewProject()} />);
      await act(async () => {
        fireEvent.click(screen.getByText(MENU_NEW));
      });

      expect(onNewProject).not.toHaveBeenCalled();
      expect(screen.queryAllByRole("dialog").length).toBeGreaterThan(0);
    });
  });

  describe("error handling", () => {
    it("[ERR-001] a corrupt bundle reports plainly and loads nothing", async () => {
      backend().bundleFaults.set(PATH_A, "corrupt");
      resetProjectIoStore({ bundlePath: null });
      paintDirtyPixel(3, 3, 2);

      render(<FileActionsHarness />);
      await openBundle(PATH_A);

      expect(screen.getByText(SERVER_CORRUPT_BUNDLE_MESSAGE)).toBeInTheDocument();
      expect(SERVER_CORRUPT_BUNDLE_MESSAGE).toBe(errors.openProjectFailed);

      const state = useEditorStore.getState();
      expect(state.projectId).toBe(MATRIX_PROJECT_ID);
      expect(state.bundlePath).toBeNull();
      expect(pixelAt(3, 3)).toBe(2);
      expect(screen.getByText(copy.projectOpenTitle)).toBeInTheDocument();
    });

    it("[ERR-002] a checksum mismatch fails validation without a partial load", async () => {
      backend().seedBundleFile(PATH_A, { id: "tampered-project" });
      backend().bundleFaults.set(PATH_A, "checksum");
      resetProjectIoStore();

      render(<FileActionsHarness />);
      await openBundle(PATH_A);

      expect(screen.getByText(SERVER_CHECKSUM_MESSAGE)).toBeInTheDocument();
      expect(useEditorStore.getState().projectId).toBe(MATRIX_PROJECT_ID);
      expect(useEditorStore.getState().projectName).toBe("Matrix project");
      expect(callsMatching("getFrame")).toHaveLength(0);
    });

    it("[ERR-003] a bundle entry escaping the target directory is rejected", async () => {
      backend().seedBundleFile(PATH_A, { id: "malicious-project" });
      backend().bundleFaults.set(PATH_A, "traversal");
      resetProjectIoStore();

      render(<FileActionsHarness />);
      await openBundle(PATH_A);

      expect(screen.getByText(SERVER_TRAVERSAL_MESSAGE)).toBeInTheDocument();
      expect(useEditorStore.getState().projectId).toBe(MATRIX_PROJECT_ID);
      expect(callsMatching("getProject")).toHaveLength(0);
    });

    it("[ERR-004] saving into a read-only location fails and keeps the project", async () => {
      backend().readOnlyPrefixes = ["/readonly/"];
      resetProjectIoStore({ bundlePath: null });
      paintDirtyPixel(1, 1, 2);

      render(<FileActionsHarness />);
      await saveAs("/readonly/blocked.pixelanea");

      expect(screen.getByText(SERVER_READ_ONLY_MESSAGE)).toBeInTheDocument();
      expect(backend().files.has("/readonly/blocked.pixelanea")).toBe(false);
      expect(useEditorStore.getState().bundlePath).toBeNull();
      expect(useEditorStore.getState().projectId).toBe(MATRIX_PROJECT_ID);
      expect(pixelAt(1, 1)).toBe(2);
      // Documents that the overwrite confirm stays on top of the error.
      expect(screen.getByText(copy.projectOverwriteTitle)).toBeInTheDocument();
    });

    it("[ERR-005] a non-.pixelanea selection cannot silently open", async () => {
      resetProjectIoStore();

      render(<FileActionsHarness />);
      fireEvent.click(screen.getByText(MENU_OPEN));
      fireEvent.change(screen.getByLabelText(copy.projectPathLabel), {
        target: { value: "   " },
      });
      fireEvent.click(screen.getByText(copy.projectOpenConfirm));
      expect(screen.getByText(errors.invalidProjectPath)).toBeInTheDocument();
      expect(callsMatching("openProject")).toHaveLength(0);

      fireEvent.change(screen.getByLabelText(copy.projectPathLabel), {
        target: { value: "/tmp/pixelanea-qa/art.png" },
      });
      await act(async () => {
        fireEvent.click(screen.getByText(copy.projectOpenConfirm));
      });
      await settle();

      // The dialog appends the extension, so the server is the one that refuses.
      expect(callsMatching("openProject")).toEqual([
        "openProject:/tmp/pixelanea-qa/art.png.pixelanea",
      ]);
      expect(screen.getByText(SERVER_CORRUPT_BUNDLE_MESSAGE)).toBeInTheDocument();
      expect(useEditorStore.getState().projectId).toBe(MATRIX_PROJECT_ID);
    });

    it("[ERR-006] a full disk surfaces the failure and keeps the project open", async () => {
      resetProjectIoStore({ bundlePath: PATH_A });
      paintDirtyPixel(2, 2, 4);
      backend().diskFull = true;

      render(<FileActionsHarness />);
      await clickSave();

      const state = useEditorStore.getState();
      expect(state.frameSyncStatus).toBe("error");
      expect(state.frameSyncError).toBe(SERVER_DISK_FULL_MESSAGE);
      expect(backend().files.has(PATH_A)).toBe(false);
      expect(state.projectId).toBe(MATRIX_PROJECT_ID);
      expect(pixelAt(2, 2)).toBe(4);
      expect(useUiStore.getState().toastMessage).toBeNull();
    });
  });
});
