import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { copy } from "@/content/copy";
import { errors } from "@/content/errors";
import { useEditorStore } from "@/state/editorStore";
import { useUiStore } from "@/state/uiStore";
import { StatusBar } from "./StatusBar";

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
      syncStatus: "idle",
      syncError: null,
      frameSyncStatus: "idle",
      paletteSyncStatus: "idle",
      frameSyncError: null,
      paletteSyncError: null,
    });
  });

  it("exposes role=status", () => {
    render(<StatusBar />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows checking message while connection is pending", () => {
    render(<StatusBar />);
    expect(screen.getByText(copy.statusChecking)).toBeInTheDocument();
  });

  it("shows saved status when connected and clean", () => {
    useUiStore.setState({ apiStatus: "connected", apiVersion: "1.0.0" });
    render(<StatusBar />);
    expect(screen.getByText(copy.statusSaved)).toBeInTheDocument();
  });

  it("appends server version only when technical info is on", () => {
    useUiStore.setState({
      apiStatus: "connected",
      apiVersion: "1.0.0",
      showTechnicalInfo: true,
    });
    render(<StatusBar />);
    expect(
      screen.getByText(`${copy.statusSaved} · ${copy.apiVersion("1.0.0")}`),
    ).toBeInTheDocument();
  });

  it("shows unsaved when dirty", () => {
    useUiStore.setState({ apiStatus: "connected", apiVersion: "1.0.0" });
    useEditorStore.setState({ isDirty: true });
    render(<StatusBar />);
    expect(screen.getByText(copy.statusUnsaved)).toBeInTheDocument();
  });

  it("shows saving while syncing", () => {
    useUiStore.setState({ apiStatus: "connected", apiVersion: "1.0.0" });
    useEditorStore.setState({ syncStatus: "syncing" });
    render(<StatusBar />);
    expect(screen.getByText(copy.statusSaving)).toBeInTheDocument();
  });

  it("does not repeat disconnect message when API is disconnected", () => {
    useUiStore.setState({ apiStatus: "disconnected", apiVersion: null });
    render(<StatusBar />);
    expect(screen.queryByText(errors.apiDisconnected)).not.toBeInTheDocument();
  });

  it("shows ready when connected with no project", () => {
    useUiStore.setState({ apiStatus: "connected", apiVersion: null });
    useEditorStore.setState({ projectId: null });
    render(<StatusBar />);
    expect(screen.getByText(copy.statusReady)).toBeInTheDocument();
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
    useUiStore.setState({
      apiStatus: "connected",
      apiVersion: "1.0.0",
      showTechnicalInfo: true,
    });
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
