import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma, sendPushToTokens } = vi.hoisted(() => ({
  prisma: {
    notification: { findMany: vi.fn(), updateMany: vi.fn() },
    pushDevice: { deleteMany: vi.fn() },
  },
  sendPushToTokens: vi.fn(),
}));

vi.mock("database", () => ({ prisma }));
vi.mock("./fcm", () => ({ sendPushToTokens }));

const { pushStaffNotifications } = await import("./staff-notification");

const target = (id: number, tokens: string[]) => ({
  id,
  title: "도착 알림",
  body: "업체 · 12가3456 차량이 곧 도착해요",
  staff: { pushDevices: tokens.map((token) => ({ token })) },
});

describe("pushStaffNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("알림이 없으면 아무것도 하지 않는다", async () => {
    await pushStaffNotifications([]);

    expect(prisma.notification.findMany).not.toHaveBeenCalled();
  });

  it("알림 켠 요원의 기기로 보내고 받은 알림만 PUSH 로 기록한다", async () => {
    prisma.notification.findMany.mockResolvedValue([target(1, ["a", "b"]), target(2, ["c"])]);
    sendPushToTokens.mockResolvedValue({ sentCount: 1, sentTokens: ["b"], invalidTokens: ["c"] });

    await pushStaffNotifications([1, 2, 3]);

    expect(prisma.notification.findMany.mock.calls[0]![0].where).toMatchObject({
      id: { in: [1, 2, 3] },
      channel: null,
      staff: {
        deletedAt: null,
        boothMemberships: { some: { status: "APPROVED", notificationsEnabled: true } },
      },
    });
    expect(sendPushToTokens).toHaveBeenCalledWith(["a", "b", "c"], {
      title: "도착 알림",
      body: "업체 · 12가3456 차량이 곧 도착해요",
      link: "/",
    });
    expect(prisma.pushDevice.deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ["c"] } },
    });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1] } },
      data: { channel: "PUSH" },
    });
  });

  it("하나도 못 보내면 알림 내역은 그대로 둔다", async () => {
    prisma.notification.findMany.mockResolvedValue([target(1, [])]);
    sendPushToTokens.mockResolvedValue({ sentCount: 0, sentTokens: [], invalidTokens: [] });

    await pushStaffNotifications([1]);

    expect(prisma.pushDevice.deleteMany).not.toHaveBeenCalled();
    expect(prisma.notification.updateMany).not.toHaveBeenCalled();
  });

  it("발송 오류가 나도 예외를 던지지 않는다", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    prisma.notification.findMany.mockResolvedValue([target(1, ["a"])]);
    sendPushToTokens.mockRejectedValue(new Error("fcm down"));

    await expect(pushStaffNotifications([1])).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
