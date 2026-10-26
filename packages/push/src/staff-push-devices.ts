import { createHash } from "node:crypto";

import { prisma } from "database";

import type { DevicePlatform, Prisma } from "database";

const hashPushInstallationSecret = (secret: string) =>
  createHash("sha256").update(secret).digest("hex");

class PushDeviceInstallationConflictError extends Error {
  constructor() {
    super("The push token is already bound to another installation");
    this.name = "PushDeviceInstallationConflictError";
  }
}

const registerStaffPushDevice = async (
  staffId: number,
  token: string,
  platform: DevicePlatform,
  installationHash: string,
) =>
  prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
    const installed = await transaction.pushDevice.findUnique({
      where: { installationHash },
      select: { id: true },
    });
    const tokenDevice = await transaction.pushDevice.findUnique({
      where: { token },
      select: { id: true, staffId: true, installationHash: true },
    });
    if (installed) {
      if (tokenDevice && tokenDevice.id !== installed.id) {
        if (tokenDevice.installationHash !== null || tokenDevice.staffId !== staffId) {
          throw new PushDeviceInstallationConflictError();
        }
        await transaction.pushDevice.delete({ where: { id: tokenDevice.id } });
      }
      return transaction.pushDevice.update({
        where: { id: installed.id },
        data: { staffId, userId: null, token, platform },
      });
    }
    if (tokenDevice) {
      if (tokenDevice.installationHash !== null || tokenDevice.staffId !== staffId) {
        throw new PushDeviceInstallationConflictError();
      }
      return transaction.pushDevice.update({
        where: { id: tokenDevice.id },
        data: { staffId, userId: null, platform, installationHash },
      });
    }
    return transaction.pushDevice.create({
      data: { staffId, token, platform, installationHash },
    });
  });

const removeStaffPushDeviceById = (
  staffId: number,
  deviceId: number,
  installationHash: string,
) => prisma.pushDevice.deleteMany({ where: { id: deviceId, staffId, installationHash } });

const removeStaffPushDeviceByInstallationHash = (installationHash: string) =>
  prisma.pushDevice.deleteMany({ where: { installationHash } });

const removeStaffPushDevice = (staffId: number, token: string) =>
  prisma.pushDevice.deleteMany({ where: { staffId, token } });

export {
  PushDeviceInstallationConflictError,
  hashPushInstallationSecret,
  registerStaffPushDevice,
  removeStaffPushDevice,
  removeStaffPushDeviceById,
  removeStaffPushDeviceByInstallationHash,
};
