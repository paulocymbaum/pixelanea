import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchFrame, saveFrame, saveFrameCells } from "./frames";
import { getApiClient } from "./client";

vi.mock("./client", () => ({
  getApiClient: vi.fn(),
}));

describe("frames API", () => {
  const getFrameBinary = vi.fn();
  const putFrameBinary = vi.fn().mockResolvedValue({});
  const patchFrameCells = vi.fn().mockResolvedValue({});
  const putFrame = vi.fn().mockResolvedValue({});
  const getFrame = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getApiClient).mockReturnValue({
      getFrameBinary,
      putFrameBinary,
      patchFrameCells,
      putFrame,
      getFrame,
    } as ReturnType<typeof getApiClient>);
  });

  describe("fetchFrame", () => {
    it("uses binary GET without JSON deserialization", async () => {
      const pixels64 = new Uint8Array(64 * 64);
      pixels64[0] = 2;
      getFrameBinary.mockResolvedValue({
        index: 0,
        width: 64,
        height: 64,
        updatedAt: "2026-08-02T00:00:00Z",
        pixels: pixels64,
      });

      const result = await fetchFrame("project-1", 0);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(getFrameBinary).toHaveBeenCalledWith("project-1", 0);
      expect(getFrame).not.toHaveBeenCalled();
      expect(result.pixels).toBe(pixels64);
      expect(result.pixels[0]).toBe(2);
      expect(result.width).toBe(64);
      expect(result.height).toBe(64);
    });

    it("returns raw byte payloads for 128x128 grids", async () => {
      const pixels128 = new Uint8Array(128 * 128);
      pixels128[10] = 4;
      getFrameBinary.mockResolvedValue({
        index: 3,
        width: 128,
        height: 128,
        updatedAt: "2026-08-02T00:00:00Z",
        pixels: pixels128,
      });

      const result = await fetchFrame("project-1", 3);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(getFrameBinary).toHaveBeenCalledWith("project-1", 3);
      expect(result.pixels.byteLength).toBe(128 * 128);
      expect(result.pixels[10]).toBe(4);
    });
  });

  describe("saveFrame", () => {
    it("uses binary PUT without JSON pixel expansion", async () => {
      const pixels64 = new Uint8Array(64 * 64);
      pixels64[0] = 2;
      await saveFrame("project-1", 0, pixels64);

      expect(putFrameBinary).toHaveBeenCalledWith("project-1", 0, pixels64);
      expect(putFrame).not.toHaveBeenCalled();
    });

    it("sends raw byte payloads for 128x128 grids", async () => {
      const pixels128 = new Uint8Array(128 * 128);
      pixels128[10] = 4;
      await saveFrame("project-1", 3, pixels128);

      expect(putFrameBinary).toHaveBeenCalledWith("project-1", 3, pixels128);
      expect(pixels128.byteLength).toBe(128 * 128);
    });
  });

  describe("saveFrameCells", () => {
    it("PATCHes cell deltas without full grid PUT", async () => {
      const changes = [{ x: 1, y: 2, previous: 0, next: 3 }];
      await saveFrameCells("project-1", 0, changes);

      expect(patchFrameCells).toHaveBeenCalledWith("project-1", 0, changes);
      expect(putFrameBinary).not.toHaveBeenCalled();
    });
  });
});
