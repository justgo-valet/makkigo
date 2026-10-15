import { NextResponse } from "next/server";

import { MERCHANT_SEARCH_QUERY_MAX_LENGTH } from "@/libs/merchant/contracts/merchants";
import { getCurrentUserId } from "@/server/auth/getCurrentUserId";
import { searchMerchants } from "@/server/merchant/searchMerchants";

import type { MerchantsResponse } from "@/libs/merchant/contracts/merchants";
import type { NextRequest } from "next/server";

const ERROR_MESSAGES = {
  UNAUTHORIZED: "로그인이 필요합니다.",
  QUERY_REQUIRED: "검색어를 입력해 주세요.",
  QUERY_TOO_LONG: `검색어는 ${MERCHANT_SEARCH_QUERY_MAX_LENGTH}자 이하로 입력해 주세요.`,
  INTERNAL_SERVER_ERROR: "업체를 검색하지 못했습니다.",
} as const;

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json({ message: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    const query = request.nextUrl.searchParams.get("q")?.trim();

    if (!query) {
      return NextResponse.json({ message: ERROR_MESSAGES.QUERY_REQUIRED }, { status: 400 });
    }

    if (query.length > MERCHANT_SEARCH_QUERY_MAX_LENGTH) {
      return NextResponse.json({ message: ERROR_MESSAGES.QUERY_TOO_LONG }, { status: 400 });
    }

    return NextResponse.json<MerchantsResponse>(await searchMerchants(query));
  } catch (error) {
    console.error("Failed to search merchants", error);

    return NextResponse.json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
