import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./Dialog";

describe("Dialog", () => {
  it("renders title and description when open", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Save project</DialogTitle>
          <DialogDescription>Choose where to save your work.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    expect(
      screen.getByRole("heading", { name: "Save project" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Choose where to save your work."),
    ).toBeInTheDocument();
  });

  it("renders close control with accessible label", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Delete project</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });
});
