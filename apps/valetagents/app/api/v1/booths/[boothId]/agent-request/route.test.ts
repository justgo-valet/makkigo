import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const auth = vi.hoisted(() => ({ getCurrentStaffId: vi.fn() }));
const requestService = vi.hoisted(() => ({ saveAgentRequest: vi.fn() }));

vi.mock("@/server/auth/getCurrentStaffId", () => ({
  getCurrentStaffId: auth.getCurrentStaffId,
}));
vi.mock("@/server/booth/saveAgentRequest", () => ({
  saveAgentRequest: requestService.saveAgentRequest,
}));

import { NextRequest } from "next/server";

import { PUT } from "./route";

const callPut = (body: unknown, boothId = "3") =>
  PUT(
    new NextRequest("http://localhost/api/v1/booths/3/agent-request", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ boothId }) },
  );

describe("PUT /api/v1/booths/:boothId/agent-request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.getCurrentStaffId.mockResolvedValue(7);
  });

  it("requires authentication and marks the response private", async () => {
    auth.getCurrentStaffId.mockResolvedValue(null);

    const response = await callPut({ workStartTime: "09:00", workEndTime: "18:00" });

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({ code: "AUTH_REQUIRED" });
  });

  it.each([
    [{ workStartTime: "09:00" }, "INVALID_REQUEST"],
    [{ workStartTime: "09:00", workEndTime: "18:00", status: "APPROVED" }, "INVALID_REQUEST"],
    [{ workStartTime: "9:00", workEndTime: "18:00" }, "INVALID_WORK_TIME"],
    [{ workStartTime: "09:00", workEndTime: "09:00" }, "INVALID_WORK_TIME"],
  ] as const)("rejects invalid payload %# with %s", async (body, code) => {
    const response = await callPut(body);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code });
    expect(requestService.saveAgentRequest).not.toHaveBeenCalled();
  });

  it("returns 201 only for a newly created row", async () => {
    requestService.saveAgentRequest.mockResolvedValue({
      ok: true,
      value: {
        outcome: "CREATED",
        request: {
          id: 9,
          status: "REQUESTED",
          workStartTime: "22:00",
          workEndTime: "06:00",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          booth: {
            id: 3,
            name: "강남 부스",
            address: "서울 강남구",
            addressDetail: null,
            feePolicy: null,
          },
        },
      },
    });

    const response = await callPut({ workStartTime: "22:00", workEndTime: "06:00" });

    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(requestService.saveAgentRequest).toHaveBeenCalledWith(7, 3, {
      workStartTime: "22:00",
      workEndTime: "06:00",
    });
  });

  it("maps an approval race to a conflict without replaying the mutation", async () => {
    requestService.saveAgentRequest.mockResolvedValue({
      ok: false,
      reason: "ALREADY_APPROVED",
    });

    const response = await callPut({ workStartTime: "09:00", workEndTime: "18:00" });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "ALREADY_APPROVED" });
    expect(requestService.saveAgentRequest).toHaveBeenCalledTimes(1);
  });
});
