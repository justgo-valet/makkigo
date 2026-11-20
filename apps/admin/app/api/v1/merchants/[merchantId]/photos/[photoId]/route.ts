import { NextResponse } from "next/server";

import { apiError } from "@/server/common/apiResponse";
import { logError } from "@/server/common/logError";
import { parseId } from "@/server/common/parseId";
import { requireAdminRequest } from "@/server/common/requireAdminRequest";
import { deleteMerchantPhoto } from "@/server/merchant/merchantPhotos";

import type { NextRequest } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ merchantId: string; photoId: string }> },
) {
  try {
    const access = await requireAdminRequest(request);
    if ("error" in access) return access.error;
    const { merchantId, photoId } = await params;
    const ids = [parseId(merchantId), parseId(photoId)] as const;
    if (!ids[0] || !ids[1] || !(await deleteMerchantPhoto(ids[0], ids[1]))) {
      return apiError("PHOTO_NOT_FOUND", "사진을 찾을 수 없습니다.", 404);
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logError("Failed to delete merchant photo", error);
    return apiError("PHOTO_DELETE_FAILED", "사진을 삭제하지 못했습니다.", 500);
  }
}
