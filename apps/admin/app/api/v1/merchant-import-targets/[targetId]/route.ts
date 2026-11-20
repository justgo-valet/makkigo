import { NextResponse } from "next/server";

import { apiError } from "@/server/common/apiResponse";
import { logError } from "@/server/common/logError";
import { parseId } from "@/server/common/parseId";
import { requireAdminRequest } from "@/server/common/requireAdminRequest";
import { deleteMerchantImportTarget } from "@/server/merchantImport/merchantImport";

import type { NextRequest } from "next/server";

type Context = { params: Promise<{ targetId: string }> };

export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    const access = await requireAdminRequest(request);
    if ("error" in access) return access.error;
    const targetId = parseId((await params).targetId);
    if (!targetId || !(await deleteMerchantImportTarget(targetId))) {
      return apiError("IMPORT_TARGET_NOT_FOUND", "수집 대상을 찾을 수 없습니다.", 404);
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logError("Failed to delete merchant import target", error);
    return apiError("IMPORT_TARGET_DELETE_FAILED", "수집 대상을 삭제하지 못했습니다.", 500);
  }
}
