import { revokeStaffRefreshToken, verifyStaffPushCleanupCapability } from "@makkigo/auth";
import {
  hashPushInstallationSecret,
  removeStaffPushDeviceById,
  removeStaffPushDeviceByInstallationHash,
} from "@makkigo/push";
import { NextResponse } from "next/server";

import { pushDeviceCleanupRequestSchema } from "@/libs/push/contracts/pushDevices";
import { clearAuthCookies, REFRESH_TOKEN_COOKIE } from "@/server/auth/authCookies";
import {
  STAFF_PUSH_CLEANUP_COOKIE,
  clearStaffPushCleanupCookie,
} from "@/server/auth/pushCleanupCookie";

import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  try {
    const body = pushDeviceCleanupRequestSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return NextResponse.json({ message: "알림 기기를 확인해주세요." }, { status: 400 });
    }
    // A proven authority is enough even when no row is deleted: the row is already
    // gone (e.g. a committed logout whose response was lost), so retries succeed.
    let cleaned = false;
    if (body.data.installationSecret) {
      await removeStaffPushDeviceByInstallationHash(
        hashPushInstallationSecret(body.data.installationSecret),
      );
      cleaned = true;
    } else {
      const cleanupToken = request.cookies.get(STAFF_PUSH_CLEANUP_COOKIE)?.value;
      const capability = cleanupToken
        ? await verifyStaffPushCleanupCapability(cleanupToken)
        : null;
      if (capability) {
        await removeStaffPushDeviceById(
          capability.staffId,
          capability.deviceId,
          capability.installationHash,
        );
        cleaned = true;
      }
    }
    if (body.data.hasPushDevice && !cleaned) {
      return NextResponse.json(
        { message: "이 기기의 푸시 등록을 안전하게 확인하지 못했습니다." },
        { status: 409 },
      );
    }
    if (refreshToken) await revokeStaffRefreshToken(refreshToken);
  } catch (error) {
    console.error("Failed to logout staff", error);
    return NextResponse.json({ message: "로그아웃을 처리하지 못했습니다." }, { status: 500 });
  }
  const response = new NextResponse(null, { status: 204 });
  clearAuthCookies(response);
  clearStaffPushCleanupCookie(response);
  return response;
}
