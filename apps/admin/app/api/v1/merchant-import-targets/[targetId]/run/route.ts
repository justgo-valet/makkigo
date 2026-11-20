import { apiError, privateJson } from "@/server/common/apiResponse";
import { logError } from "@/server/common/logError";
import { parseId } from "@/server/common/parseId";
import { requireAdminRequest } from "@/server/common/requireAdminRequest";
import { runMerchantImport } from "@/server/merchantImport/merchantImport";
import { hasPublicDataServiceKey } from "@/server/merchantImport/publicDataStores";

import type { NextRequest } from "next/server";

type Context = { params: Promise<{ targetId: string }> };

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const access = await requireAdminRequest(request);
    if ("error" in access) return access.error;
    if (!hasPublicDataServiceKey()) {
      return apiError("PUBLIC_DATA_KEY_MISSING", "공공데이터 서비스키가 아직 설정되지 않아 수집할 수 없습니다.", 503);
    }
    const targetId = parseId((await params).targetId);
    const result = targetId ? await runMerchantImport(targetId) : null;
    if (!result) return apiError("IMPORT_TARGET_NOT_FOUND", "수집 대상을 찾을 수 없습니다.", 404);
    return privateJson({ result });
  } catch (error) {
    logError("Failed to run merchant import", error);
    return apiError("IMPORT_RUN_FAILED", "수집하지 못했습니다.", 500);
  }
}
