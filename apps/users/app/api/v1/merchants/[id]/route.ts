import { NextResponse } from "next/server";

import { merchantIdSchema } from "@/libs/merchant/contracts/merchantDetail";
import { getCurrentUserId } from "@/server/auth/getCurrentUserId";
import { getMerchantDetail } from "@/server/merchant/getMerchantDetail";

import type { MerchantDetail } from "@/libs/merchant/contracts/merchantDetail";
import type { NextRequest } from "next/server";

const ERROR_MESSAGES = {
  UNAUTHORIZED: "로그인이 필요합니다.",
  MERCHANT_NOT_FOUND: "업체를 찾을 수 없습니다.",
  INTERNAL_SERVER_ERROR: "업체 정보를 불러오지 못했습니다.",
} as const;

const notFound = () =>
  NextResponse.json(
    { code: "MERCHANT_NOT_FOUND", message: ERROR_MESSAGES.MERCHANT_NOT_FOUND },
    { status: 404 },
  );

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json({ message: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    const merchantId = merchantIdSchema.safeParse((await params).id);

    if (!merchantId.success) return notFound();

    const merchant = await getMerchantDetail(merchantId.data);

    if (!merchant) return notFound();

    return NextResponse.json<MerchantDetail>(merchant);
  } catch (error) {
    console.error("Failed to get merchant detail", error);

    return NextResponse.json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
