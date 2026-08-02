import { features } from "@/content/features";
import { copy } from "@/content/copy";
import type { useProjectFileActions } from "@/components/project/useProjectFileActions";

export type FileMenuLeaf = {
  type: "item";
  label: string;
  action: () => void;
  disabled?: boolean;
};

export type FileMenuSubmenu = {
  type: "submenu";
  label: string;
  items: FileMenuLeaf[];
  disabled?: boolean;
};

export type FileMenuSeparator = {
  type: "separator";
};

export type FileMenuEntry = FileMenuLeaf | FileMenuSubmenu | FileMenuSeparator;

type FileActions = ReturnType<typeof useProjectFileActions>;

export type BuildFileMenuItemsParams = {
  fileActions: FileActions;
  onImportImage?: () => void;
  onExportPng: () => void;
  onExportSpritesheet?: () => void;
  onExportGif?: () => void;
};

export function buildFileMenuItems({
  fileActions,
  onImportImage,
  onExportPng,
  onExportSpritesheet,
  onExportGif,
}: BuildFileMenuItemsParams): FileMenuEntry[] {
  const exportDisabled = !fileActions.canSave;
  const exportItems: FileMenuLeaf[] = [
    {
      type: "item",
      label: copy.fileMenuExportPng,
      action: onExportPng,
      disabled: exportDisabled,
    },
  ];

  if (features.exportSpritesheet && onExportSpritesheet) {
    exportItems.push({
      type: "item",
      label: copy.fileMenuExportSpritesheet,
      action: onExportSpritesheet,
      disabled: exportDisabled,
    });
  }

  if (features.exportGif && onExportGif) {
    exportItems.push({
      type: "item",
      label: copy.fileMenuExportGif,
      action: onExportGif,
      disabled: exportDisabled,
    });
  }

  const entries: FileMenuEntry[] = [
    {
      type: "item",
      label: copy.fileMenuNew,
      action: fileActions.onNewProject,
      disabled: fileActions.isFileNavigationDisabled,
    },
    {
      type: "item",
      label: copy.fileMenuOpen,
      action: fileActions.onOpenProject,
      disabled: fileActions.isFileNavigationDisabled,
    },
    ...(onImportImage
      ? [
          {
            type: "item" as const,
            label: copy.fileMenuImport,
            action: onImportImage,
            disabled: fileActions.isFileNavigationDisabled,
          },
        ]
      : []),
    {
      type: "item",
      label: copy.fileMenuSave,
      action: fileActions.onSave,
      disabled: !fileActions.canSave,
    },
    {
      type: "item",
      label: copy.fileMenuSaveAs,
      action: fileActions.onSaveAs,
      disabled: !fileActions.canSave,
    },
    {
      type: "submenu",
      label: copy.fileMenuExport,
      disabled: exportDisabled,
      items: exportItems,
    },
  ];

  return entries;
}
