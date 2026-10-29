import {
  boothMerchantPageSchema,
  boothMerchantReviewBodySchema,
} from "@/libs/booth/contracts/booth-merchants";
import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { listBoothMerchants } from "@/server/booth/listBoothMerchants";
import { reviewBoothMerchants } from "@/server/booth/reviewBoothMerchants";
import { apiError, NO_STORE_HEADERS, privateJson } from "@/server/common/apiResponse";
import { getProtectedStaffAccess } from "@/server/onboarding/getProtectedStaffAccess";

import type { NextRequest } from "next/server";

const ERROR_RESPONSES = {
  BOOTH_NOT_FOUND: { status: 404, message: "부스를 찾을 수 없습니다." },
  BOOTH_MANAGER_REQUIRED: { status: 403, message: "부스 관리자만 업체를 관리할 수 있습니다." },
  MERCHANT_NOT_FOUND: { status: 404, message: "업체를 찾을 수 없습니다." },
  MERCHANT_ALREADY_APPROVED: { status: 409, message: "이미 등록된 업체는 거절할 수 없습니다." },
  MERCHANT_CHANGED: {
    status: 409,
    message: "등록 상태가 바뀌었습니다. 목록을 다시 확인해 주세요.",
  },
} as const;

const parseBoothId = (value: string) => {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boothId: string }> },
) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);

    const access = await getProtectedStaffAccess(staffId);
    if (!access.ok) {
      const status = access.reason === "AUTH_REQUIRED" ? 401 : 403;
      return apiError(access.reason, "업체 온보딩을 완료해 주세요.", status);
    }

    const boothId = parseBoothId((await params).boothId);
    if (!boothId) return apiError("INVALID_REQUEST", "올바른 부스 ID가 필요합니다.", 400);

    const page = boothMerchantPageSchema.safeParse(request.nextUrl.searchParams.get("page") ?? 1);
    if (!page.success) return apiError("INVALID_PAGE", "올바른 페이지 번호가 필요합니다.", 400);

    const imageBaseUrl = process.env.IMAGE_BASE_URL;
    if (!imageBaseUrl) throw new Error("IMAGE_BASE_URL is required");

    const result = await listBoothMerchants(staffId, boothId, page.data, imageBaseUrl);
    if (!result.ok) {
      const error = ERROR_RESPONSES[result.reason];
      return apiError(result.reason, error.message, error.status);
    }

    return privateJson(result.value);
  } catch (error) {
    console.error("Failed to list booth merchants", error);
    return apiError("INTERNAL_ERROR", "업체 목록을 불러오지 못했습니다.", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ boothId: string }> },
) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);

    const access = await getProtectedStaffAccess(staffId);
    if (!access.ok) {
      const status = access.reason === "AUTH_REQUIRED" ? 401 : 403;
      return apiError(access.reason, "업체 온보딩을 완료해 주세요.", status);
    }

    const boothId = parseBoothId((await params).boothId);
    if (!boothId) return apiError("INVALID_REQUEST", "올바른 부스 ID가 필요합니다.", 400);

    const body = boothMerchantReviewBodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError("INVALID_REQUEST", "요청 본문이 올바르지 않습니다.", 400);

    const result = await reviewBoothMerchants(staffId, boothId, body.data);
    if (!result.ok) {
      const error = ERROR_RESPONSES[result.reason];
      return apiError(result.reason, error.message, error.status);
    }

    return new Response(null, { status: 204, headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Failed to review booth merchants", error);
    return apiError("INTERNAL_ERROR", "업체 등록 상태를 바꾸지 못했습니다.", 500);
  }
}
