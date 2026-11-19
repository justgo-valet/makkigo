import { describe, expect, it } from "vitest";

import { takeLoginAttempt } from "./login-rate-limit";

describe("takeLoginAttempt", () => {
  it("15분에 20번까지만 허용하고 창이 지나면 다시 허용한다", () => {
    const now = Date.now();
    for (let attempt = 0; attempt < 20; attempt += 1) expect(takeLoginAttempt("ip", now)).toBe(true);
    expect(takeLoginAttempt("ip", now)).toBe(false);
    expect(takeLoginAttempt("ip", now + 15 * 60 * 1000)).toBe(true);
  });
});
