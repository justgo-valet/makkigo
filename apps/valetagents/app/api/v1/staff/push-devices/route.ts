import {
  createStaffPushCleanupCapability,
  verifyStaffPushCleanupCapability,
} from "@makkigo/auth";
import {
  hashPushInstallationSecret,
  PushDeviceInstallationConflictError,
  registerStaffPushDevice,
  removeStaffPushDeviceById,
  removeStaffPushDeviceByInstallationHash,
} from "@makkigo/push";
import { NextResponse } from "next/server";

import {
  pushDeviceCleanupRequestSchema,
  pushDeviceRequestSchema,
} from "@/libs/push/contracts/pushDevices";
import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import {
  STAFF_PUSH_CLEANUP_COOKIE,
  clearStaffPushCleanupCookie,
  setStaffPushCleanupCookie,
} from "@/server/auth/pushCleanupCookie";
import { apiError, NO_STORE_HEADERS } from "@/server/common/apiResponse";

import type { NextRequest } from "next/server";

const readCapability = async (request: NextRequest) => {
  const value = request.cookies.get(STAFF_PUSH_CLEANUP_COOKIE)?.value;
  return value ? verifyStaffPushCleanupCapability(value) : null;
};

// Returns whether a cleanup authority was proven. Zero deleted rows still counts:
// the row is already gone (e.g. a committed request whose response was lost).
const cleanupDevice = async (request: NextRequest, installationSecret?: string) => {
  if (installationSecret) {
    await removeStaffPushDeviceByInstallationHash(hashPushInstallationSecret(installationSecret));
    return true;
  }
  const capability = await readCapability(request);
  if (!capability) return false;
  await removeStaffPushDeviceById(
    capability.staffId,
    capability.deviceId,
    capability.installationHash,
  );
  return true;
};

export async function POST(request: NextRequest) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
    const body = pushDeviceRequestSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return apiError("INVALID_REQUEST", "알림 기기 정보를 확인해주세요.", 400);
    }
    const installationHash = hashPushInstallationSecret(body.data.installationSecret);
    const device = await registerStaffPushDevice(
      staffId,
      body.data.token,
      body.data.platform,
      installationHash,
    );
    const response = new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS });
    setStaffPushCleanupCookie(
      response,
      await createStaffPushCleanupCapability({ deviceId: device.id, staffId, installationHash }),
    );
    return response;
  } catch (error) {
    if (error instanceof PushDeviceInstallationConflictError) {
      return apiError(
        "PUSH_INSTALLATION_CONFLICT",
        "다른 앱 설치에 연결된 알림 토큰입니다.",
        409,
      );
    }
    console.error("Failed to register staff push device", error);
    return apiError("INTERNAL_ERROR", "알림 기기를 등록하지 못했습니다.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
    const body = pushDeviceCleanupRequestSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return apiError("INVALID_REQUEST", "알림 기기를 확인해주세요.", 400);
    }
    const cleaned = await cleanupDevice(request, body.data.installationSecret);
    if (!cleaned && body.data.hasPushDevice) {
      return apiError(
        "PUSH_CLEANUP_PROOF_REQUIRED",
        "이 기기의 푸시 등록을 안전하게 확인하지 못했습니다.",
        409,
      );
    }
    const response = new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS });
    clearStaffPushCleanupCookie(response);
    return response;
  } catch (error) {
    console.error("Failed to remove staff push device", error);
    return apiError("INTERNAL_ERROR", "알림 기기를 삭제하지 못했습니다.", 500);
  }
}
