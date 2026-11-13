import { describe, expect, it } from "vitest";

import { hasExitCompletedNotice, shouldWatchExit } from "@/features/home/exitCompletion";

import type { NotificationItem } from "@/libs/notification/contracts/notifications";
import type { CurrentSession } from "@/libs/valet/contracts/currentSession";

const notice = (overrides: Partial<NotificationItem>): NotificationItem => ({
  id: 1,
  type: "PICKUP_COMPLETED",
  title: "출차 완료",
  body: "12가 3456 차량의 출차가 완료됐어요",
  valetSessionId: 7,
  readAt: null,
  createdAt: "2026-11-13T10:00:00.000Z",
  ...overrides,
});

describe("shouldWatchExit", () => {
  it("차를 맡긴 뒤부터 출차 완료를 지켜본다", () => {
    expect(shouldWatchExit({ status: "PARKED" } as CurrentSession)).toBe(true);
    expect(shouldWatchExit({ status: "PICKUP_REQUESTED" } as CurrentSession)).toBe(true);
    expect(shouldWatchExit({ status: "PICKUP_PREPARING" } as CurrentSession)).toBe(true);
  });

  it("도착 알림만 보낸 세션은 지켜보지 않는다", () => {
    expect(shouldWatchExit({ status: "ARRIVING" } as CurrentSession)).toBe(false);
  });
});

describe("hasExitCompletedNotice", () => {
  it("지켜보던 세션의 출차 완료 알림이 있으면 완료로 본다", () => {
    expect(hasExitCompletedNotice([notice({})], 7)).toBe(true);
  });

  it("다른 세션이나 다른 종류의 알림은 완료로 보지 않는다", () => {
    expect(hasExitCompletedNotice([notice({ valetSessionId: 8 })], 7)).toBe(false);
    expect(hasExitCompletedNotice([notice({ type: "PARKED" })], 7)).toBe(false);
    expect(hasExitCompletedNotice([], 7)).toBe(false);
  });
});
