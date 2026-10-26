import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ verify: vi.fn(), revoke: vi.fn() }));
const push = vi.hoisted(() => ({ hash: vi.fn(), removeId: vi.fn(), removeHash: vi.fn() }));

vi.mock("@makkigo/auth", () => ({
  verifyStaffPushCleanupCapability: auth.verify,
  revokeStaffRefreshToken: auth.revoke,
}));
vi.mock("@makkigo/push", () => ({
  hashPushInstallationSecret: push.hash,
  removeStaffPushDeviceById: push.removeId,
  removeStaffPushDeviceByInstallationHash: push.removeHash,
}));

import { NextRequest } from "next/server";

import { POST } from "./route";

const secret = "a".repeat(43);
const callPost = (body: unknown, cleanup = "cleanup-proof") => POST(new NextRequest(
  "http://localhost/api/v1/auth/logout",
  {
    method: "POST",
    headers: {
      cookie: `makkigo_staff_refresh_token=refresh-token${cleanup ? `; makkigo_staff_push_cleanup=${cleanup}` : ""}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  },
));

describe("POST /api/v1/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.verify.mockResolvedValue(null);
    auth.revoke.mockResolvedValue(undefined);
    push.hash.mockReturnValue("b".repeat(64));
    push.removeId.mockResolvedValue({ count: 1 });
    push.removeHash.mockResolvedValue({ count: 1 });
  });

  it("removes the exact row from signed HttpOnly authority", async () => {
    auth.verify.mockResolvedValue({
      deviceId: 11,
      staffId: 7,
      installationHash: "b".repeat(64),
    });
    const response = await callPost({ hasPushDevice: false });
    expect(response.status).toBe(204);
    expect(push.removeId).toHaveBeenCalledWith(7, 11, "b".repeat(64));
    expect(auth.revoke).toHaveBeenCalledWith("refresh-token");
  });

  it("uses stable installation authority after auth and signed proof expiry", async () => {
    const response = await callPost({ hasPushDevice: true, installationSecret: secret }, "");
    expect(response.status).toBe(204);
    expect(push.removeHash).toHaveBeenCalledWith("b".repeat(64));
  });

  it("prioritizes a valid installation secret over a stale signed owner capability", async () => {
    auth.verify.mockResolvedValue({
      deviceId: 11,
      staffId: 6,
      installationHash: "c".repeat(64),
    });
    const response = await callPost({ hasPushDevice: true, installationSecret: secret });

    expect(response.status).toBe(204);
    expect(push.removeHash).toHaveBeenCalledWith("b".repeat(64));
    expect(push.removeId).not.toHaveBeenCalled();
  });

  it("does not delete by an unowned raw token or silently clear missing authority", async () => {
    const response = await callPost({ hasPushDevice: true }, "");
    expect(response.status).toBe(409);
    expect(push.removeId).not.toHaveBeenCalled();
    expect(push.removeHash).not.toHaveBeenCalled();
    expect(auth.revoke).not.toHaveBeenCalled();
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("completes a retry after a committed logout lost its response", async () => {
    push.removeHash.mockResolvedValue({ count: 0 });
    const response = await callPost({ hasPushDevice: true, installationSecret: secret }, "");
    expect(response.status).toBe(204);
    expect(push.removeHash).toHaveBeenCalledWith("b".repeat(64));
    expect(auth.revoke).toHaveBeenCalledWith("refresh-token");
  });

  it("completes when the signed row was already removed or rebound", async () => {
    auth.verify.mockResolvedValue({
      deviceId: 11,
      staffId: 7,
      installationHash: "b".repeat(64),
    });
    push.removeId.mockResolvedValue({ count: 0 });
    const response = await callPost({ hasPushDevice: true });
    expect(response.status).toBe(204);
    expect(push.removeId).toHaveBeenCalledWith(7, 11, "b".repeat(64));
  });

  it("keeps credentials retryable when cleanup fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    auth.verify.mockResolvedValue({
      deviceId: 11,
      staffId: 7,
      installationHash: "b".repeat(64),
    });
    push.removeHash.mockRejectedValue(new Error("database unavailable"));
    const response = await callPost({ hasPushDevice: true, installationSecret: secret });
    expect(response.status).toBe(500);
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(auth.revoke).not.toHaveBeenCalled();
  });
});
