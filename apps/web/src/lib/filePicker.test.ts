import { describe, expect, it, vi } from "vitest";
import {
  pickProjectPath,
  type FilePickerTiers,
  type PickProjectPathInput,
  type PickProjectPathResult,
} from "./filePicker";

function input(overrides: Partial<PickProjectPathInput> = {}): PickProjectPathInput {
  return {
    mode: "open",
    ...overrides,
  };
}

function tiers(
  overrides: Partial<FilePickerTiers>,
): PickProjectPathOptions["tiers"] {
  return overrides;
}

type PickProjectPathOptions = Parameters<typeof pickProjectPath>[1];

describe("pickProjectPath", () => {
  it("returns the server tier result when available", async () => {
    const tryServerDialog = vi.fn(async () => success("/tmp/a.pixelanea"));
    const tryFileSystemAccess = vi.fn(async () => null);
    const tryFallbackDialog = vi.fn(async () => failure("fallback"));

    const result = await pickProjectPath(input(), {
      tiers: tiers({ tryServerDialog, tryFileSystemAccess, tryFallbackDialog }),
    });

    expect(result).toEqual({ ok: true, path: "/tmp/a.pixelanea" });
    expect(tryServerDialog).toHaveBeenCalledOnce();
    expect(tryFileSystemAccess).not.toHaveBeenCalled();
    expect(tryFallbackDialog).not.toHaveBeenCalled();
  });

  it("falls through to FSA when the server tier is unavailable", async () => {
    const tryServerDialog = vi.fn(async () => null);
    const tryFileSystemAccess = vi.fn(async () => success("/tmp/b.pixelanea"));
    const tryFallbackDialog = vi.fn(async () => failure("fallback"));

    const result = await pickProjectPath(input({ mode: "saveAs" }), {
      tiers: tiers({ tryServerDialog, tryFileSystemAccess, tryFallbackDialog }),
    });

    expect(result).toEqual({ ok: true, path: "/tmp/b.pixelanea" });
    expect(tryServerDialog).toHaveBeenCalledOnce();
    expect(tryFileSystemAccess).toHaveBeenCalledOnce();
    expect(tryFallbackDialog).not.toHaveBeenCalled();
  });

  it("uses the fallback dialog when earlier tiers decline", async () => {
    const tryServerDialog = vi.fn(async () => null);
    const tryFileSystemAccess = vi.fn(async () => null);
    const tryFallbackDialog = vi.fn(async () => success("/tmp/c.pixelanea"));

    const result = await pickProjectPath(input(), {
      tiers: tiers({ tryServerDialog, tryFileSystemAccess, tryFallbackDialog }),
    });

    expect(result).toEqual({ ok: true, path: "/tmp/c.pixelanea" });
    expect(tryServerDialog).toHaveBeenCalledOnce();
    expect(tryFileSystemAccess).toHaveBeenCalledOnce();
    expect(tryFallbackDialog).toHaveBeenCalledOnce();
  });

  it("propagates server cancellation without trying later tiers", async () => {
    const tryServerDialog = vi.fn(
      async (): Promise<PickProjectPathResult> => ({ ok: false, cancelled: true }),
    );
    const tryFileSystemAccess = vi.fn(async () => success("/tmp/ignored.pixelanea"));
    const tryFallbackDialog = vi.fn(async () => success("/tmp/ignored.pixelanea"));

    const result = await pickProjectPath(input(), {
      tiers: tiers({ tryServerDialog, tryFileSystemAccess, tryFallbackDialog }),
    });

    expect(result).toEqual({ ok: false, cancelled: true });
    expect(tryFileSystemAccess).not.toHaveBeenCalled();
    expect(tryFallbackDialog).not.toHaveBeenCalled();
  });
});

function success(path: string): PickProjectPathResult {
  return { ok: true, path };
}

function failure(message: string): PickProjectPathResult {
  return { ok: false, cancelled: false, message };
}
