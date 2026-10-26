import { jwtVerify, SignJWT } from "jose";

import { getJwtSecret } from "./config";

const AUDIENCE = "valetagents-staff-push-cleanup";
const ISSUER = "makkigo";
const PURPOSE = "staff-push-cleanup";
const STAFF_PUSH_CLEANUP_TTL_SECONDS = 400 * 24 * 60 * 60;

interface StaffPushCleanupCapability {
  deviceId: number;
  staffId: number;
  installationHash: string;
}

const createStaffPushCleanupCapability = async ({
  deviceId,
  staffId,
  installationHash,
}: StaffPushCleanupCapability) =>
  new SignJWT({ purpose: PURPOSE, deviceId, staffId, installationHash })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(AUDIENCE)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + STAFF_PUSH_CLEANUP_TTL_SECONDS)
    .sign(getJwtSecret());

const verifyStaffPushCleanupCapability = async (
  token: string,
): Promise<StaffPushCleanupCapability | null> => {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ["HS256"],
      audience: AUDIENCE,
      issuer: ISSUER,
    });
    if (
      payload.purpose !== PURPOSE ||
      !Number.isSafeInteger(payload.deviceId) ||
      !Number.isSafeInteger(payload.staffId) ||
      typeof payload.installationHash !== "string" ||
      !/^[a-f0-9]{64}$/.test(payload.installationHash)
    ) return null;
    return {
      deviceId: payload.deviceId as number,
      staffId: payload.staffId as number,
      installationHash: payload.installationHash,
    };
  } catch {
    return null;
  }
};

export {
  STAFF_PUSH_CLEANUP_TTL_SECONDS,
  createStaffPushCleanupCapability,
  verifyStaffPushCleanupCapability,
};
export type { StaffPushCleanupCapability };
