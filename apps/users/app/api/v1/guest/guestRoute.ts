import { NextResponse } from "next/server";

import { guestMerchantIdSchema } from "@/libs/guest/contracts/guest";
import { takeGuestRequest } from "@/server/guest/rateLimit";

import type { GuestRequestKind } from "@/server/guest/rateLimit";
import type { NextRequest } from "next/server";

const NO_STORE = { "Cache-Control": "no-store" };

const guestError = (code: string, message: string, status: number) =>
  NextResponse.json({ code, message }, { status, headers: NO_STORE });

const MERCHANT_NOT_FOUND = () => guestError("MERCHANT_NOT_FOUND", "사용할 수 없는 QR 이에요.", 404);

const startGuestRequest = async (
  request: NextRequest,
  params: Promise<{ id: string }>,
  kind: GuestRequestKind = "read",
): Promise<{ merchantId: number } | { response: NextResponse }> => {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!takeGuestRequest(kind, key)) {
    return {
      response: guestError("TOO_MANY_REQUESTS", "잠시 후 다시 시도해 주세요.", 429),
    };
  }

  const merchantId = guestMerchantIdSchema.safeParse((await params).id);
  return merchantId.success ? { merchantId: merchantId.data } : { response: MERCHANT_NOT_FOUND() };
};

export { MERCHANT_NOT_FOUND, NO_STORE, guestError, startGuestRequest };
