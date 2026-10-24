import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ create: vi.fn(), verify: vi.fn() }));
const push = vi.hoisted(() => ({
  hash: vi.fn(),
  register: vi.fn(),
  removeId: vi.fn(),
  removeHash: vi.fn(),
  conflict: class extends Error {},
}));
const session = vi.hoisted(() => ({ staffId: vi.fn() }));

vi.mock("@makkigo/auth", () => ({
  STAFF_PUSH_CLEANUP_TTL_SECONDS: 400 * 24 * 60 * 60,
  createStaffPushCleanupCapability: auth.create,
  verifyStaffPushCleanupCapability: auth.verify,
}));
vi.mock("@makkigo/push", () => ({
  hashPushInstallationSecret: push.hash,
  registerStaffPushDevice: push.register,
  removeStaffPushDeviceById: push.removeId,
  removeStaffPushDeviceByInstallationHash: push.removeHash,
  PushDeviceInstallationConflictError: push.conflict,
}));
vi.mock("@/server/auth/getCurrentStaffId", () => ({ getCurrentStaffId: session.staffId }));

import { NextRequest } from "next/server";

import { DELETE, POST } from "./route";

const secret = "a".repeat(43);
const request = (method: "POST" | "DELETE", body: unknown, cookie?: string) =>
  new NextRequest("http://localhost/api/v1/staff/push-devices", {
    method,
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie: `makkigo_staff_push_cleanup=${cookie}` } : {}),
    },
    body: JSON.stringify(body),
  });

describe("staff push device route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.staffId.mockResolvedValue(7);
    push.hash.mockReturnValue("b".repeat(64));
    auth.create.mockResolvedValue("signed-capability");
    auth.verify.mockResolvedValue(null);
    push.register.mockResolvedValue({ id: 11 });
    push.removeId.mockResolvedValue({ count: 1 });
    push.removeHash.mockResolvedValue({ count: 1 });
  });

  it("binds registration to the pre-created installation and returns row backup proof", async () => {
    const response = await POST(request("POST", {
      token: "token",
      platform: "IOS",
      installationSecret: secret,
    }));

    expect(response.status).toBe(204);
    expect(push.register).toHaveBeenCalledWith(7, "token", "IOS", "b".repeat(64));
    expect(auth.create).toHaveBeenCalledWith({
      deviceId: 11,
      staffId: 7,
      installationHash: "b".repeat(64),
    });
    expect(response.headers.getSetCookie()[0]).toContain("makkigo_staff_push_cleanup=signed-capability");
    expect(response.headers.getSetCookie()[0]).toContain("HttpOnly");
    expect(response.headers.getSetCookie()[0]).toContain("Path=/api/v1");
    expect(response.headers.getSetCookie()[0]).toContain("SameSite=lax");
  });

  it("cleans by signed row proof when local storage is unavailable", async () => {
    auth.verify.mockResolvedValue({
      deviceId: 11,
      staffId: 7,
      installationHash: "b".repeat(64),
    });
    const response = await DELETE(request("DELETE", { hasPushDevice: false }, "proof"));
    expect(response.status).toBe(204);
    expect(push.removeId).toHaveBeenCalledWith(7, 11, "b".repeat(64));
    expect(push.removeHash).not.toHaveBeenCalled();
  });

  it("cleans by installation authority after the signed proof expires", async () => {
    const response = await DELETE(request("DELETE", {
      hasPushDevice: true,
      installationSecret: secret,
    }));
    expect(response.status).toBe(204);
    expect(push.removeHash).toHaveBeenCalledWith("b".repeat(64));
  });

  it("does not silently complete when both cleanup authorities are missing", async () => {
    const response = await DELETE(request("DELETE", { hasPushDevice: true }));
    expect(response.status).toBe(409);
    expect(push.removeId).not.toHaveBeenCalled();
    expect(push.removeHash).not.toHaveBeenCalled();
  });

  it("completes a retry after a committed removal lost its response", async () => {
    push.removeHash.mockResolvedValue({ count: 0 });
    const response = await DELETE(request("DELETE", {
      hasPushDevice: true,
      installationSecret: secret,
    }));
    expect(response.status).toBe(204);
    expect(push.removeHash).toHaveBeenCalledWith("b".repeat(64));
  });
});
