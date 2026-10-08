import { beforeEach, describe, expect, it } from "vitest";

import { createAccessToken, verifyAccessToken } from "./tokens";

describe("access token audience", () => {
  beforeEach(() => {
    process.env.AUTH_JWT_SECRET = "test-secret-that-is-long-enough-for-hs256";
  });

  it("Staff 토큰은 valetagents에서만 검증된다", async () => {
    const token = await createAccessToken("valetagents", 42);
    await expect(verifyAccessToken("valetagents", token.token)).resolves.toBe(42);
    await expect(verifyAccessToken("users", token.token)).resolves.toBeNull();
  });

  it("고객 토큰은 Staff 인증에 사용할 수 없다", async () => {
    const token = await createAccessToken("users", 42);
    await expect(verifyAccessToken("users", token.token)).resolves.toBe(42);
    await expect(verifyAccessToken("valetagents", token.token)).resolves.toBeNull();
  });
});
