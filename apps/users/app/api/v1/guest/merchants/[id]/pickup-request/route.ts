import { pushStaffNotifications } from "@makkigo/push";
import { NextResponse, after } from "next/server";

import { guestPickupRequestSchema } from "@/libs/guest/contracts/guest";
import { getGuestSession, requestGuestPickup } from "@/server/guest/guestValet";

import { MERCHANT_NOT_FOUND, NO_STORE, guestError, startGuestRequest } from "../../../guestRoute";

import type { PickupRequestErrorCode } from "@/libs/valet/contracts/pickupRequest";
import type { NextRequest } from "next/server";

const PICKUP_ERRORS: Record<PickupRequestErrorCode, { message: string; status: number }> = {
  SESSION_NOT_FOUND: {
    message: "맡긴 차량을 찾지 못했어요. 차량 번호를 확인해 주세요.",
    status: 404,
  },
  NOT_PARKED: { message: "아직 주차 완료되지 않은 차량이에요.", status: 409 },
  ALREADY_REQUESTED: { message: "이미 출차 요청을 보냈어요.", status: 409 },
  NO_BOOTH: {
    message: "출차 요청을 받을 부스를 찾을 수 없어요. 요원님께 직접 말씀해 주세요.",
    status: 422,
  },
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const started = await startGuestRequest(request, params, "pickup");
    if ("response" in started) return started.response;

    const body = guestPickupRequestSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return guestError("CONSENT_REQUIRED", "약관 동의와 차량 번호를 확인해 주세요.", 400);
    }

    const result = await requestGuestPickup(started.merchantId, body.data);
    if (!result) return MERCHANT_NOT_FOUND();
    if (!result.ok) {
      const error = PICKUP_ERRORS[result.reason];
      return guestError(result.reason, error.message, error.status);
    }

    after(() => pushStaffNotifications(result.notificationIds, { sound: "valet-alert" }));

    return NextResponse.json(await getGuestSession(started.merchantId, body.data.plateNumber), {
      headers: NO_STORE,
    });
  } catch (error) {
    console.error("Failed to request guest pickup", error);
    return guestError("INTERNAL_SERVER_ERROR", "출차 요청을 보내지 못했어요.", 500);
  }
}
