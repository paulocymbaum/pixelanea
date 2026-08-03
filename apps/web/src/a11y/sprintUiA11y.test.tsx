import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FrameStripPlaceholder } from "@/components/frames/FrameStripPlaceholder";
import { PaletteSectionRail } from "@/components/palette/PaletteSectionRail";
import { TooltipProvider } from "@/components/ui";
import { UnsavedChangesDialog } from "@/components/project/UnsavedChangesDialog";
import { copy } from "@/content/copy";
import { useEditorStore } from "@/state/editorStore";
import { useUiStore } from "@/state/uiStore";
import { StatusBar } from "@/shell/StatusBar";

describe("Sprint UI accessibility (S1-909)", () => {
  describe("StatusBar", () => {
    beforeEach(() => {
      useUiStore.setState({
        apiStatus: "checking",
        apiVersion: null,
        showTechnicalInfo: false,
      });
      useEditorStore.setState({
        hoverCell: null,
        projectId: "p1",
        isDirty: false,
        isPaletteDirty: false,
        frameSyncStatus: "idle",
        paletteSyncStatus: "idle",
        frameSyncError: null,
        paletteSyncError: null,
      });
    });

    it("exposes status region and hover cell label for assistive tech", () => {
      render(<StatusBar />);

      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByLabelText("Hovered cell")).toBeInTheDocument();
    });
  });

  describe("UnsavedChangesDialog", () => {
    it("exposes dialog title, description, and action buttons", () => {
      render(
        <UnsavedChangesDialog
          open
          onOpenChange={() => {}}
          onDiscard={() => {}}
        />,
      );

      expect(
        screen.getByRole("heading", { name: copy.discardChangesTitle }),
      ).toBeInTheDocument();
      expect(screen.getByText(copy.discardChangesBody)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: copy.discardChangesCancel }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: copy.discardChangesConfirm }),
      ).toBeInTheDocument();
    });

    it("closes on Escape (Radix dialog)", async () => {
      const onOpenChange = vi.fn();
      render(
        <UnsavedChangesDialog
          open
          onOpenChange={onOpenChange}
          onDiscard={() => {}}
        />,
      );

      fireEvent.keyDown(document, { key: "Escape" });

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("exposes focusable action buttons inside dialog", () => {
      render(
        <UnsavedChangesDialog
          open
          onOpenChange={() => {}}
          onDiscard={() => {}}
        />,
      );

      const cancel = screen.getByRole("button", {
        name: copy.discardChangesCancel,
      });
      const discard = screen.getByRole("button", {
        name: copy.discardChangesConfirm,
      });

      cancel.focus();
      expect(cancel).toHaveFocus();
      discard.focus();
      expect(discard).toHaveFocus();
    });
  });

  describe("FrameStripPlaceholder", () => {
    it("labels the strip region and exposes keyboard-reachable CTA", () => {
      render(<FrameStripPlaceholder />);

      expect(screen.getByLabelText(copy.frameStripLabel)).toBeInTheDocument();

      const cta = screen.getByRole("button", {
        name: copy.frameStripAddFramesCta,
      });
      cta.focus();
      expect(cta).toHaveFocus();

      fireEvent.click(cta);

      expect(
        screen.getByRole("heading", { name: copy.frameDuplicateTitle }),
      ).toBeInTheDocument();
    });

    it("closes duplicate dialog on Escape", async () => {
      render(<FrameStripPlaceholder />);

      fireEvent.click(
        screen.getByRole("button", { name: copy.frameStripAddFramesCta }),
      );
      expect(
        screen.getByRole("heading", { name: copy.frameDuplicateTitle }),
      ).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });

      await waitFor(() => {
        expect(
          screen.queryByRole("heading", { name: copy.frameDuplicateTitle }),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("PaletteSectionRail", () => {
    it("exposes section tabs with aria-current on the active tab", () => {
      render(
        <TooltipProvider>
          <PaletteSectionRail />
        </TooltipProvider>,
      );

      const swatches = screen.getByRole("button", {
        name: copy.palettePanelSectionSwatches,
      });
      expect(swatches).toHaveAttribute("aria-current", "true");

      fireEvent.click(
        screen.getByRole("button", { name: copy.palettePanelSectionShading }),
      );

      expect(swatches).not.toHaveAttribute("aria-current");
      expect(
        screen.getByRole("button", { name: copy.palettePanelSectionShading }),
      ).toHaveAttribute("aria-current", "true");
    });
  });
});
