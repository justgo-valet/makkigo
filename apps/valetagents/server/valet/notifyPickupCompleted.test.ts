import { beforeEach, describe, expect, it, vi } from "vitest";

const sendUserNotification = vi.hoisted(() => vi.fn());

vi.mock("@makkigo/push", () => ({ sendUserNotification }));

import { notifyPickupCompleted } from "./notifyPickupCompleted";

describe("notifyPickupCompleted", () => {
  beforeEach(() => sendUserNotification.mockReset());

  it("출차 완료는 \"차량이 준비되었습니다\" 음성 알림음으로 보낸다", async () => {
    await notifyPickupCompleted({ userId: 1, valetSessionId: 2, plateNumber: "12가3456", merchantName: "마끼고 식당" });

    expect(sendUserNotification).toHaveBeenCalledWith({
      userId: 1,
      type: "PICKUP_COMPLETED",
      valetSessionId: 2,
      title: "출차 완료",
      body: "마끼고 식당 · 12가3456 차량의 출차가 완료됐어요",
      sound: "user-pickup-completed",
    });
  });
});
