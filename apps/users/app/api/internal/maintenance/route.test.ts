import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const maintenance = vi.hoisted(() => ({ runMaintenance: vi.fn() }));

vi.mock("@/server/maintenance/runMaintenance", () => maintenance);

import { NextRequest } from "next/server";

import { POST } from "./route";

const JOB_TOKEN = "a".repeat(32);

const callPost = (body: unknown, token: string | null = JOB_TOKEN) =>
  POST(
    new NextRequest("http://users:3001/api/internal/maintenance", {
      method: "POST",
      headers: {
        ...(token !== null && { Authorization: `Bearer ${token}` }),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }),
  );

const successResult = (dryRun: boolean) => ({
  ok: true,
  dryRun,
  withdrawnUsers: { purged: 2, remaining: 0 },
  expiredAuthRecords: { refreshTokens: 3, loginCodes: 1 },
  oldLocationUseLogs: 4,
});

describe("POST /api/internal/maintenance", () => {
  beforeEach(() => {
    vi.stubEnv("USERS_INTERNAL_JOB_TOKEN", JOB_TOKEN);
    maintenance.runMaintenance.mockImplementation(async ({ dryRun }) => successResult(dryRun));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("rejects requests without the job token", async () => {
    expect((await callPost({}, null)).status).toBe(401);
    expect((await callPost({}, "b".repeat(32))).status).toBe(401);
    expect(maintenance.runMaintenance).not.toHaveBeenCalled();
  });

  it("rejects every request when the configured token is too short", async () => {
    vi.stubEnv("USERS_INTERNAL_JOB_TOKEN", "short");

    expect((await callPost({}, "short")).status).toBe(401);
    expect(maintenance.runMaintenance).not.toHaveBeenCalled();
  });

  it("rejects unknown body fields", async () => {
    expect((await callPost({ dryRun: false, extra: true })).status).toBe(400);
  });

  it("runs maintenance and returns each job result", async () => {
    const response = await callPost({});

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(successResult(false));
    expect(maintenance.runMaintenance).toHaveBeenCalledWith({ dryRun: false });
  });

  it("passes dry runs through", async () => {
    await callPost({ dryRun: true });

    expect(maintenance.runMaintenance).toHaveBeenCalledWith({ dryRun: true });
  });

  it("responds 500 when a job failed", async () => {
    maintenance.runMaintenance.mockResolvedValue({ ...successResult(false), ok: false });

    expect((await callPost({})).status).toBe(500);
  });
});
