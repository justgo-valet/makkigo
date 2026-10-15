import { registerUserPushDevice, removeUserPushDevice } from "@makkigo/push";
import { NextResponse } from "next/server";

import {
  pushDeviceRequestSchema,
  removePushDeviceRequestSchema,
} from "@/libs/push/contracts/pushDevices";
import { getCurrentUserId } from "@/server/auth/getCurrentUserId";

import type { NextRequest } from "next/server";

const ERROR_MESSAGES = {
  UNAUTHORIZED: "로그인이 필요합니다.",
  INVALID_REQUEST: "알림 기기 정보를 확인해주세요.",
  REGISTER_FAILED: "알림 기기를 등록하지 못했습니다.",
  REMOVE_FAILED: "알림 기기를 삭제하지 못했습니다.",
} as const;

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json({ message: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    const body = pushDeviceRequestSchema.safeParse(await request.json().catch(() => null));

    if (!body.success) {
      return NextResponse.json({ message: ERROR_MESSAGES.INVALID_REQUEST }, { status: 400 });
    }

    await registerUserPushDevice(userId, body.data.token, body.data.platform);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to register push device", error);

    return NextResponse.json({ message: ERROR_MESSAGES.REGISTER_FAILED }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json({ message: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    const body = removePushDeviceRequestSchema.safeParse(await request.json().catch(() => null));

    if (!body.success) {
      return NextResponse.json({ message: ERROR_MESSAGES.INVALID_REQUEST }, { status: 400 });
    }

    await removeUserPushDevice(userId, body.data.token);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to remove push device", error);

    return NextResponse.json({ message: ERROR_MESSAGES.REMOVE_FAILED }, { status: 500 });
  }
}
