import { randomUUID } from "node:crypto";

import { updateBoothInfoRequestSchema } from "@/libs/booth/contracts/booth-info";
import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { updateBoothInfo } from "@/server/booth/boothInfo";
import { getBoothManagerFailure } from "@/server/booth/boothManager";
import { readBoundedJson } from "@/server/booth/readBoothRegistration";
import { boothPhotoKeys, createBoothPhotoStorage } from "@/server/booth/s3BoothPhotoStorage";
import { apiError, NO_STORE_HEADERS } from "@/server/common/apiResponse";

import type { NextRequest } from "next/server";

const ERROR_RESPONSES = {
  BOOTH_NOT_FOUND: { status: 404, message: "부스를 찾을 수 없습니다." },
  BOOTH_MANAGER_REQUIRED: { status: 403, message: "부스 관리자만 부스 정보를 바꿀 수 있습니다." },
  PHOTO_NOT_FOUND: { status: 409, message: "부스 사진이 바뀌었습니다. 화면을 새로 고친 뒤 다시 시도해 주세요." },
} as const;

const parseBoothId = (value: string) => {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
};

const isSameOrigin = (request: Request) => {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host");
  return origin !== null && host !== null && URL.parse(origin)?.host === host;
};

const deleteKeys = async (
  storage: () => ReturnType<typeof createBoothPhotoStorage>,
  keys: string[],
  message: string,
  staffId: number,
) => {
  if (keys.length === 0) return;
  const results = await Promise.allSettled(keys.map((key) => storage().delete(key)));
  if (results.some((result) => result.status === "rejected")) console.error(message, { staffId, keys });
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ boothId: string }> },
) {
  try {
    if (!isSameOrigin(request)) return apiError("INVALID_ORIGIN", "요청을 확인할 수 없습니다.", 403);
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);

    const boothId = parseBoothId((await params).boothId);
    if (!boothId) return apiError("INVALID_REQUEST", "올바른 부스 ID가 필요합니다.", 400);

    const json = await readBoundedJson(request);
    if (!json.ok) {
      const status = json.reason === "REQUEST_TOO_LARGE" ? 413 : json.reason === "REQUEST_TIMEOUT" ? 408 : 400;
      return apiError(json.reason, "요청 본문이 올바르지 않습니다.", status);
    }
    const body = updateBoothInfoRequestSchema.safeParse(json.value);
    if (!body.success) return apiError("INVALID_REQUEST", "부스 정보를 확인해 주세요.", 400);

    const managerFailure = await getBoothManagerFailure(staffId, boothId);
    if (managerFailure) {
      const error = ERROR_RESPONSES[managerFailure];
      return apiError(managerFailure, error.message, error.status);
    }

    const { photoUploads, ...info } = body.data;
    let photoStorage: ReturnType<typeof createBoothPhotoStorage> | undefined;
    const storage = () => (photoStorage ??= createBoothPhotoStorage());
    const photoPaths: string[] = [];
    const stagingKeys: string[] = [];
    const candidateFinalKeys: string[] = [];
    try {
      for (const upload of photoUploads) {
        const finalId = randomUUID();
        const keys = boothPhotoKeys(staffId, upload, finalId);
        stagingKeys.push(keys.stagingKey);
        candidateFinalKeys.push(keys.finalKey);
        await storage().promote(staffId, upload, finalId);
        photoPaths.push(keys.finalKey);
      }
    } catch (error) {
      await deleteKeys(storage, [...candidateFinalKeys, ...stagingKeys], "Failed to clean up booth photos after promotion failure", staffId);
      throw error;
    }

    let result;
    try {
      result = await updateBoothInfo(staffId, boothId, info, photoPaths);
    } catch (error) {
      if (photoPaths.length) console.error("Booth info update outcome is ambiguous; preserving uploaded photos", { staffId, keys: photoPaths });
      await deleteKeys(storage, stagingKeys, "Failed to clean up booth staging photos", staffId);
      throw error;
    }
    if (!result.ok) {
      await deleteKeys(storage, [...candidateFinalKeys, ...stagingKeys], "Failed to clean up unreferenced booth photos", staffId);
      const error = ERROR_RESPONSES[result.reason];
      return apiError(result.reason, error.message, error.status);
    }

    await deleteKeys(storage, [...stagingKeys, ...result.removedPhotoPaths], "Failed to clean up replaced booth photos", staffId);
    return new Response(null, { status: 204, headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Failed to update booth info", error);
    return apiError("INTERNAL_ERROR", "부스 정보를 저장하지 못했습니다.", 500);
  }
}
