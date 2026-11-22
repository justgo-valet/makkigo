import { describe, expect, it } from "vitest";

import { isInvalidTokenError, platformSound } from "./fcm";

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

describe("platformSound", () => {
  it("음성 알림음은 앱에 든 Android 채널 · iOS 소리 파일로 보낸다", () => {
    expect(platformSound("valet-arrival")).toEqual({
      androidChannelId: "makkigo_valet_arrival",
      iosSound: "valet_arrival.caf",
    });
    expect(platformSound("valet-pickup")).toEqual({
      androidChannelId: "makkigo_valet_pickup",
      iosSound: "valet_pickup.caf",
    });
    expect(platformSound("user-pickup-completed")).toEqual({
      androidChannelId: "makkigo_user_pickup_completed",
      iosSound: "user_pickup_completed.caf",
    });
  });

  it("지정하지 않으면 기본 채널 · 기본 알림음", () => {
    expect(platformSound("default")).toEqual({ androidChannelId: "makkigo_default", iosSound: "default" });
  });
});
