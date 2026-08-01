import { copy } from "@/content/copy";
import type { useProjectFileActions } from "@/components/project/useProjectFileActions";

export type FileMenuItem = {
  label: string;
  action: () => void;
  disabled?: boolean;
};

type FileActions = ReturnType<typeof useProjectFileActions>;

export type BuildFileMenuItemsParams = {
  fileActions: FileActions;
  onImportImage?: () => void;
  onExportPng: () => void;
};

export function buildFileMenuItems({
  fileActions,
  onImportImage,
  onExportPng,
}: BuildFileMenuItemsParams): FileMenuItem[] {
  return [
    {
      label: copy.fileMenuNew,
      action: fileActions.onNewProject,
      disabled: fileActions.isFileNavigationDisabled,
    },
    {
      label: copy.fileMenuOpen,
      action: fileActions.onOpenProject,
      disabled: fileActions.isFileNavigationDisabled,
    },
    ...(onImportImage
      ? [
          {
            label: copy.fileMenuImport,
            action: onImportImage,
            disabled: fileActions.isFileNavigationDisabled,
          },
        ]
      : []),
    {
      label: copy.fileMenuSave,
      action: fileActions.onSave,
      disabled: !fileActions.canSave,
    },
    {
      label: copy.fileMenuSaveAs,
      action: fileActions.onSaveAs,
      disabled: !fileActions.canSave,
    },
    {
      label: copy.fileMenuExportPng,
      action: onExportPng,
      disabled: !fileActions.canSave,
    },
  ];
}
