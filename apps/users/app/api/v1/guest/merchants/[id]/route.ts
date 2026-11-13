import { NextResponse } from "next/server";

import { getGuestMerchant } from "@/server/guest/guestValet";

import { MERCHANT_NOT_FOUND, NO_STORE, guestError, startGuestRequest } from "../../guestRoute";

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const started = await startGuestRequest(request, params);
    if ("response" in started) return started.response;

    const body = await getGuestMerchant(started.merchantId);
    if (!body) return MERCHANT_NOT_FOUND();

    return NextResponse.json(body, { headers: NO_STORE });
  } catch (error) {
    console.error("Failed to get guest merchant", error);
    return guestError("INTERNAL_SERVER_ERROR", "업체 정보를 불러오지 못했어요.", 500);
  }
}
