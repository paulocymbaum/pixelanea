import { vi } from "vitest";

export const fileActionsMock = {
  onNewProject: vi.fn(),
  onOpenProject: vi.fn(),
  onSave: vi.fn(),
  onSaveAs: vi.fn(),
  canSave: true,
  isSaving: false,
  dialogs: null as null,
};

export const exportFrameToPngMock = vi.fn();
export const notifyExportSuccessMock = vi.fn();

vi.mock("@/components/project/useProjectFileActions", () => ({
  useProjectFileActions: () => fileActionsMock,
}));

vi.mock("@/canvas/exportFrame", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/canvas/exportFrame")>();
  return {
    ...actual,
    exportFrameToPng: exportFrameToPngMock,
  };
});

vi.mock("@/lib/exportNotify", () => ({
  notifyExportSuccess: notifyExportSuccessMock,
}));

export function resetFileActionsMock(): void {
  fileActionsMock.onNewProject.mockReset();
  fileActionsMock.onOpenProject.mockReset();
  fileActionsMock.onSave.mockReset();
  fileActionsMock.onSaveAs.mockReset();
  fileActionsMock.canSave = true;
  fileActionsMock.isSaving = false;
  exportFrameToPngMock.mockReset();
  notifyExportSuccessMock.mockReset();
}
