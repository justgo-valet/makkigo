import { beforeEach, describe, expect, it } from "vitest";

import {
  createStaffPushCleanupCapability,
  verifyStaffPushCleanupCapability,
} from "./staff-push-cleanup";

describe("staff push cleanup capability", () => {
  beforeEach(() => {
    process.env.AUTH_JWT_SECRET = "test-secret-that-is-long-enough-for-hs256";
  });

  it("round-trips a purpose-bound staff device row", async () => {
    const capability = { deviceId: 11, staffId: 7, installationHash: "a".repeat(64) };
    const token = await createStaffPushCleanupCapability(capability);
    await expect(verifyStaffPushCleanupCapability(token)).resolves.toEqual({
      ...capability,
    });
  });

  it("rejects malformed or unrelated credentials", async () => {
    await expect(verifyStaffPushCleanupCapability("invalid")).resolves.toBeNull();
  });
});
