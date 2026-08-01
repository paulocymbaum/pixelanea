import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { copy } from "@/content/copy";
import { errors } from "@/content/errors";
import { ProjectPathDialog } from "./ProjectPathDialog";

describe("ProjectPathDialog", () => {
  it("shows action-led placeholder and hint copy", () => {
    render(
      <ProjectPathDialog
        open
        onOpenChange={() => {}}
        mode="saveAs"
        onSubmit={() => {}}
      />,
    );

    expect(screen.getByPlaceholderText(copy.projectPathPlaceholder)).toBeInTheDocument();
    expect(screen.getByText(copy.projectPathHint)).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("/home/you/projects/my-art.pixelanea"),
    ).not.toBeInTheDocument();
  });

  it("shows fallback description when native picker is unavailable", () => {
    render(
      <ProjectPathDialog
        open
        onOpenChange={() => {}}
        mode="open"
        isFallback
        onSubmit={() => {}}
      />,
    );

    expect(screen.getByText(copy.projectPathFallbackDescription)).toBeInTheDocument();
    expect(screen.queryByText(copy.projectOpenDescription)).not.toBeInTheDocument();
  });

  it("validates .pixelanea extension before submit", () => {
    const onSubmit = vi.fn();
    render(
      <ProjectPathDialog
        open
        onOpenChange={() => {}}
        mode="open"
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText(copy.projectPathLabel), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByText(copy.projectOpenConfirm));

    expect(screen.getByText(errors.invalidProjectPath)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects non-.pixelanea extensions in open mode", () => {
    const onSubmit = vi.fn();
    render(
      <ProjectPathDialog
        open
        onOpenChange={() => {}}
        mode="open"
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText(copy.projectPathLabel), {
      target: { value: "/tmp/art.png" },
    });
    fireEvent.click(screen.getByText(copy.projectOpenConfirm));

    expect(screen.getByText(errors.invalidProjectPath)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits normalized path", () => {
    const onSubmit = vi.fn();
    render(
      <ProjectPathDialog
        open
        onOpenChange={() => {}}
        mode="saveAs"
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText(copy.projectPathLabel), {
      target: { value: "/tmp/walk.pixelanea" },
    });
    fireEvent.click(screen.getByText(copy.projectSaveConfirm));

    expect(onSubmit).toHaveBeenCalledWith({
      path: "/tmp/walk.pixelanea",
      assetType: "character",
    });
  });

  it("submits selected asset type in saveAs mode", () => {
    const onSubmit = vi.fn();
    render(
      <ProjectPathDialog
        open
        onOpenChange={() => {}}
        mode="saveAs"
        animationAssetTypeEnabled
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByText(copy.projectAssetTypeAdvancedSummary));
    fireEvent.click(screen.getByText(copy.projectAssetTypeBackground));
    fireEvent.change(screen.getByLabelText(copy.projectPathLabel), {
      target: { value: "/tmp/bg.pixelanea" },
    });
    fireEvent.click(screen.getByText(copy.projectSaveConfirm));

    expect(onSubmit).toHaveBeenCalledWith({
      path: "/tmp/bg.pixelanea",
      assetType: "background",
    });
  });

  it("disables animation asset type when only one frame", () => {
    render(
      <ProjectPathDialog
        open
        onOpenChange={() => {}}
        mode="saveAs"
        animationAssetTypeEnabled={false}
        onSubmit={() => {}}
      />,
    );

    expect(
      screen.getByText(copy.projectAssetTypeAnimationDisabledHint),
    ).toBeInTheDocument();
    expect(
      screen.getByText(copy.projectAssetTypeAnimation).closest("button"),
    ).toBeDisabled();
  });

  it("shows opening label while submitting in open mode", () => {
    render(
      <ProjectPathDialog
        open
        onOpenChange={() => {}}
        mode="open"
        onSubmit={() => {}}
        isSubmitting
      />,
    );

    expect(screen.getByText(copy.projectOpening)).toBeInTheDocument();
    expect(screen.getByLabelText(copy.projectPathLabel)).toBeDisabled();
  });
});
