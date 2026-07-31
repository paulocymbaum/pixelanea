import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { copy } from "@/content/copy";
import { errors } from "@/content/errors";
import { useEditorStore } from "@/state/editorStore";
import { useUiStore } from "@/state/uiStore";
import { StatusBar } from "./StatusBar";

describe("StatusBar", () => {
  beforeEach(() => {
    useUiStore.setState({ apiStatus: "checking", apiVersion: null });
    useEditorStore.setState({ hoverCell: null });
  });

  it("exposes role=status", () => {
    render(<StatusBar />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows checking message", () => {
    render(<StatusBar />);
    expect(screen.getByText("Checking API…")).toBeInTheDocument();
  });

  it("shows connected message with version", () => {
    useUiStore.setState({ apiStatus: "connected", apiVersion: "1.0.0" });
    render(<StatusBar />);
    expect(
      screen.getByText(`${copy.apiConnected} · ${copy.apiVersion("1.0.0")}`),
    ).toBeInTheDocument();
  });

  it("shows disconnected message", () => {
    useUiStore.setState({ apiStatus: "disconnected", apiVersion: null });
    render(<StatusBar />);
    expect(screen.getByText(errors.apiDisconnected)).toBeInTheDocument();
  });

  it("shows hover cell coordinates", () => {
    useEditorStore.setState({ hoverCell: { x: 3, y: 5 } });
    render(<StatusBar />);
    expect(screen.getByText(copy.hoverCell(3, 5))).toBeInTheDocument();
  });

  it("shows dash when no hover cell", () => {
    render(<StatusBar />);
    expect(screen.getByText(copy.hoverCellNone)).toBeInTheDocument();
  });

  it("shows hex and palette index when technical info enabled", () => {
    useUiStore.setState({ showTechnicalInfo: true });
    const pixels = new Uint8Array(32 * 32);
    pixels[4 * 32 + 2] = 2;
    useEditorStore.setState({
      hoverCell: { x: 2, y: 4 },
      gridWidth: 32,
      pixels,
      paletteColors: ["#000000", "#FF0000", "#00FF00"],
    });

    render(<StatusBar />);
    expect(
      screen.getByText(copy.hoverCellTechnical(2, 4, "#00FF00", 2)),
    ).toBeInTheDocument();
  });
});
