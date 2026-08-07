import { describe, expect, it } from "vitest";
import { copy } from "@/content/copy";
import {
  mapInstallErrorMessage,
  shouldOfferReleasePage,
} from "./updateErrorMapping";

describe("updateErrorMapping", () => {
  it("maps ERROR_UAC prefix to Windows copy", () => {
    expect(
      mapInstallErrorMessage("ERROR_UAC: blocked", "permission_denied", "windows_installer"),
    ).toBe(copy.updateErrorUac);
  });

  it("maps ERROR_PERMISSION prefix to permission copy", () => {
    expect(mapInstallErrorMessage("ERROR_PERMISSION: pkexec failed")).toBe(
      copy.updateErrorPermission,
    );
  });

  it("maps ERROR_GATEKEEPER prefix to Gatekeeper copy", () => {
    expect(mapInstallErrorMessage("ERROR_GATEKEEPER: dmg failed")).toBe(
      copy.updateErrorGatekeeper,
    );
  });

  it("maps ERROR_PARTIAL prefix to partial install copy", () => {
    expect(mapInstallErrorMessage("ERROR_PARTIAL: copy failed")).toBe(
      copy.updateErrorPartial,
    );
  });

  it("offers release page on platform install errors", () => {
    expect(
      shouldOfferReleasePage("error", "permission_denied", copy.updateErrorPermission),
    ).toBe(true);
    expect(shouldOfferReleasePage("up_to_date", null, "")).toBe(false);
  });
});
