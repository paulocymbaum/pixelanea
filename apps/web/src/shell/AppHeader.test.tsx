import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { copy } from "@/content/copy";
import { useEditorStore } from "@/state/editorStore";
import { useSessionStore } from "@/state/sessionStore";
import { AppHeader } from "./AppHeader";

describe("AppHeader", () => {
  beforeEach(() => {
    useEditorStore.setState({ projectName: "Untitled project" });
    useSessionStore.setState({ theme: "light" });
    document.documentElement.classList.remove("dark");
  });

  it("renders banner with app name and project title", () => {
    render(<AppHeader />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText(copy.appName)).toBeInTheDocument();
    expect(screen.getByText("Untitled project")).toBeInTheDocument();
  });

  it("exposes header menu triggers for File, Edit, and View", () => {
    render(<AppHeader />);

    expect(screen.getByRole("button", { name: "File" })).toHaveAttribute(
      "aria-haspopup",
      "menu",
    );
    expect(screen.getByRole("button", { name: "Edit" })).toHaveAttribute(
      "aria-haspopup",
      "menu",
    );
    expect(screen.getByRole("button", { name: "View" })).toHaveAttribute(
      "aria-haspopup",
      "menu",
    );
  });

  it("toggles theme via header control", () => {
    render(<AppHeader />);

    fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(useSessionStore.getState().theme).toBe("dark");
  });
});
