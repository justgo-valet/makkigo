import { NextResponse } from "next/server";

import { guestSessionRequestSchema } from "@/libs/guest/contracts/guest";
import { getGuestSession } from "@/server/guest/guestValet";

import { NO_STORE, guestError, startGuestRequest } from "../../../guestRoute";

import type { NextRequest } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const started = await startGuestRequest(request, params);
    if ("response" in started) return started.response;

    const body = guestSessionRequestSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return guestError("INVALID_PLATE_NUMBER", "차량 번호를 다시 확인해 주세요.", 400);
    }

    const result = await getGuestSession(started.merchantId, body.data.plateNumber);
    if (!result) {
      return guestError(
        "SESSION_NOT_FOUND",
        "맡긴 차량을 찾지 못했어요. 차량 번호를 확인해 주세요.",
        404,
      );
    }

    return NextResponse.json(result, { headers: NO_STORE });
  } catch (error) {
    console.error("Failed to get guest valet session", error);
    return guestError("INTERNAL_SERVER_ERROR", "차량 정보를 불러오지 못했어요.", 500);
  }
}
