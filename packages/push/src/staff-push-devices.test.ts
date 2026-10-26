import { beforeEach, describe, expect, it, vi } from "vitest";

const transaction = {
  pushDevice: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};
const prisma = {
  pushDevice: { deleteMany: vi.fn() },
  $transaction: vi.fn((callback: (client: typeof transaction) => unknown) => callback(transaction)),
};

vi.mock("database", () => ({ prisma, Prisma: {} }));

const {
  PushDeviceInstallationConflictError,
  hashPushInstallationSecret,
  registerStaffPushDevice,
  removeStaffPushDeviceById,
  removeStaffPushDeviceByInstallationHash,
} = await import("./staff-push-devices");

describe("staff push devices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transaction.pushDevice.findUnique.mockResolvedValue(null);
    transaction.pushDevice.create.mockResolvedValue({ id: 11 });
    transaction.pushDevice.update.mockResolvedValue({ id: 11 });
  });

  it("creates one row bound to the installation hash", async () => {
    await registerStaffPushDevice(7, "token", "ANDROID", "a".repeat(64));

    expect(transaction.pushDevice.create).toHaveBeenCalledWith({
      data: {
        staffId: 7,
        token: "token",
        platform: "ANDROID",
        installationHash: "a".repeat(64),
      },
    });
  });

  it("retries and transfers accounts on the same installation row", async () => {
    transaction.pushDevice.findUnique
      .mockResolvedValueOnce({ id: 11 })
      .mockResolvedValueOnce({ id: 11, staffId: 6, installationHash: "a".repeat(64) });

    await registerStaffPushDevice(7, "new", "IOS", "a".repeat(64));

    expect(transaction.pushDevice.update).toHaveBeenCalledWith({
      where: { id: 11 },
      data: { staffId: 7, userId: null, token: "new", platform: "IOS" },
    });
  });

  it("rejects a token already bound to another installation", async () => {
    transaction.pushDevice.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 22, staffId: 7, installationHash: "b".repeat(64) });

    await expect(
      registerStaffPushDevice(7, "token", "IOS", "a".repeat(64)),
    ).rejects.toBeInstanceOf(PushDeviceInstallationConflictError);
    expect(transaction.pushDevice.update).not.toHaveBeenCalled();
    expect(transaction.pushDevice.create).not.toHaveBeenCalled();
  });

  it("never displaces another bound installation during rotation", async () => {
    transaction.pushDevice.findUnique
      .mockResolvedValueOnce({ id: 11 })
      .mockResolvedValueOnce({ id: 22, staffId: 7, installationHash: "b".repeat(64) });

    await expect(
      registerStaffPushDevice(7, "token", "IOS", "a".repeat(64)),
    ).rejects.toBeInstanceOf(PushDeviceInstallationConflictError);
    expect(transaction.pushDevice.delete).not.toHaveBeenCalled();
    expect(transaction.pushDevice.update).not.toHaveBeenCalled();
  });

  it("migrates only a same-account legacy unbound token row", async () => {
    transaction.pushDevice.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 22, staffId: 7, installationHash: null });

    await registerStaffPushDevice(7, "token", "IOS", "a".repeat(64));

    expect(transaction.pushDevice.update).toHaveBeenCalledWith({
      where: { id: 22 },
      data: {
        staffId: 7,
        userId: null,
        platform: "IOS",
        installationHash: "a".repeat(64),
      },
    });
  });

  it("keeps cleanup authority row-scoped or installation-scoped", async () => {
    await removeStaffPushDeviceById(7, 11, "a".repeat(64));
    await removeStaffPushDeviceByInstallationHash("a".repeat(64));

    expect(prisma.pushDevice.deleteMany).toHaveBeenNthCalledWith(1, {
      where: { id: 11, staffId: 7, installationHash: "a".repeat(64) },
    });
    expect(prisma.pushDevice.deleteMany).toHaveBeenNthCalledWith(2, {
      where: { installationHash: "a".repeat(64) },
    });
  });

  it("retains the legacy staff-and-token cleanup API for existing callers", async () => {
    const { removeStaffPushDevice } = await import("./staff-push-devices");
    await removeStaffPushDevice(7, "legacy-token");
    expect(prisma.pushDevice.deleteMany).toHaveBeenCalledWith({
      where: { staffId: 7, token: "legacy-token" },
    });
  });

  it("hashes installation secrets without exposing them in persistence", () => {
    expect(hashPushInstallationSecret("installation-secret")).toMatch(/^[a-f0-9]{64}$/);
  });
});
