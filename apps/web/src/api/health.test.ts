import { ApiError } from "@pixelanea/api-client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errors } from "@/content/errors";
import { getApiClient } from "./client";
import { checkHealth } from "./health";

vi.mock("./client");

describe("checkHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok when health succeeds", async () => {
    vi.mocked(getApiClient).mockReturnValue({
      getHealth: vi.fn().mockResolvedValue({ status: "ok", version: "1.0.0" }),
    } as unknown as ReturnType<typeof getApiClient>);

    const result = await checkHealth();

    expect(result).toEqual({
      ok: true,
      health: { status: "ok", version: "1.0.0" },
    });
  });

  it("returns apiCheckFailed on ApiError", async () => {
    vi.mocked(getApiClient).mockReturnValue({
      getHealth: vi.fn().mockRejectedValue(new ApiError(500, "fail")),
    } as unknown as ReturnType<typeof getApiClient>);

    const result = await checkHealth();

    expect(result).toEqual({ ok: false, message: errors.apiCheckFailed });
  });

  it("returns apiDisconnected on network error", async () => {
    vi.mocked(getApiClient).mockReturnValue({
      getHealth: vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    } as unknown as ReturnType<typeof getApiClient>);

    const result = await checkHealth();

    expect(result).toEqual({ ok: false, message: errors.apiDisconnected });
  });
});
