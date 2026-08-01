import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/content/copy";
import { errors } from "@/content/errors";
import { useUiStore } from "@/state/uiStore";
import { ConnectionBanner } from "./ConnectionBanner";

const checkHealthMock = vi.hoisted(() => vi.fn());

vi.mock("@/api/health", () => ({
  checkHealth: checkHealthMock,
}));

describe("ConnectionBanner", () => {
  beforeEach(() => {
    useUiStore.setState({ apiStatus: "connected", apiVersion: "1.0.0" });
    checkHealthMock.mockReset();
  });

  it("is hidden when API is connected", () => {
    render(<ConnectionBanner />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("is hidden while API status is checking", () => {
    useUiStore.setState({ apiStatus: "checking", apiVersion: null });
    render(<ConnectionBanner />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows disconnected message and retry when API is disconnected", () => {
    useUiStore.setState({ apiStatus: "disconnected", apiVersion: null });
    render(<ConnectionBanner />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(errors.apiDisconnected)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: copy.connectionBannerRetry }),
    ).toBeInTheDocument();
  });

  it("retry runs checkHealth and updates apiStatus on success", async () => {
    useUiStore.setState({ apiStatus: "disconnected", apiVersion: null });
    checkHealthMock.mockResolvedValue({
      ok: true,
      health: { status: "ok", version: "2.0.0" },
    });

    render(<ConnectionBanner />);
    fireEvent.click(
      screen.getByRole("button", { name: copy.connectionBannerRetry }),
    );

    expect(useUiStore.getState().apiStatus).toBe("checking");

    await vi.waitFor(() => {
      expect(checkHealthMock).toHaveBeenCalledTimes(1);
    });
    await vi.waitFor(() => {
      expect(useUiStore.getState().apiStatus).toBe("connected");
    });
    expect(useUiStore.getState().apiVersion).toBe("2.0.0");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("retry leaves banner visible when health check fails", async () => {
    useUiStore.setState({ apiStatus: "disconnected", apiVersion: null });
    checkHealthMock.mockResolvedValue({ ok: false, message: "down" });

    render(<ConnectionBanner />);
    fireEvent.click(
      screen.getByRole("button", { name: copy.connectionBannerRetry }),
    );

    await vi.waitFor(() => {
      expect(checkHealthMock).toHaveBeenCalledTimes(1);
    });
    await vi.waitFor(() => {
      expect(useUiStore.getState().apiStatus).toBe("disconnected");
    });
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
