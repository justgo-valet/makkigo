import { describe, expect, it } from "vitest";

import { isInvalidTokenError } from "./fcm";

describe("isInvalidTokenError", () => {
  it("앱 삭제 · 잘못된 토큰이면 지울 토큰으로 본다", () => {
    expect(isInvalidTokenError("messaging/registration-token-not-registered")).toBe(true);
    expect(isInvalidTokenError("messaging/invalid-registration-token")).toBe(true);
  });

  it("일시적인 오류는 토큰을 남긴다", () => {
    expect(isInvalidTokenError("messaging/internal-error")).toBe(false);
    expect(isInvalidTokenError("messaging/server-unavailable")).toBe(false);
    expect(isInvalidTokenError(undefined)).toBe(false);
  });
});
