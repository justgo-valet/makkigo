import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("database", () => ({ prisma: {} }));

import { issueStaffTokens } from "./staff-tokens";
import { createRefreshToken } from "./tokens";

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (date: Date) => Math.round((date.getTime() - Date.now()) / DAY_MS);

describe("refresh token lifetime", () => {
  beforeEach(() => {
    process.env.AUTH_JWT_SECRET = "test-secret-that-is-long-enough-for-hs256";
  });

  it("요원은 90일, 그 밖의 계정은 30일 동안 로그인이 이어진다", async () => {
    const create = vi.fn().mockResolvedValue({});
    const { refreshToken } = await issueStaffTokens(7, null, {
      staffRefreshToken: { create },
    } as unknown as Parameters<typeof issueStaffTokens>[2]);

    expect(daysFromNow(refreshToken.expiresAt)).toBe(90);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ staffId: 7, expiresAt: refreshToken.expiresAt }),
    });
    expect(daysFromNow(createRefreshToken().expiresAt)).toBe(30);
  });
});
