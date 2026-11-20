import { merchantImportTargetBodySchema } from "@/libs/merchantImport/contracts";
import { apiError, privateJson } from "@/server/common/apiResponse";
import { logError } from "@/server/common/logError";
import { requireAdminRequest } from "@/server/common/requireAdminRequest";
import { createMerchantImportTarget } from "@/server/merchantImport/merchantImport";

import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const access = await requireAdminRequest(request);
    if ("error" in access) return access.error;
    const body = merchantImportTargetBodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError("INVALID_INPUT", "지역과 업종을 확인해 주세요.", 400);
    return privateJson({ id: await createMerchantImportTarget(body.data) }, { status: 201 });
  } catch (error) {
    logError("Failed to create merchant import target", error);
    return apiError("IMPORT_TARGET_SAVE_FAILED", "수집 대상을 저장하지 못했습니다.", 500);
  }
}
