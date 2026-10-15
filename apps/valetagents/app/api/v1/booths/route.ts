import { randomUUID } from "node:crypto";

import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { getActiveStaffRole } from "@/server/auth/getActiveStaffRole";
import { createBooth, getCreateBoothPreflightFailure } from "@/server/booth/createBooth";
import { readBoothRegistration } from "@/server/booth/readBoothRegistration";
import { boothPhotoKeys, createBoothPhotoStorage } from "@/server/booth/s3BoothPhotoStorage";
import { searchBooths } from "@/server/booth/searchBooths";
import { apiError, privateJson } from "@/server/common/apiResponse";
import { boothSearchQuerySchema } from "@/libs/booth/contracts/booths";

import type { NextRequest } from "next/server";

const CREATE_ERROR_RESPONSES = {
  AUTH_REQUIRED: { status: 401, message: "로그인이 필요합니다." },
  VALET_AGENT_REQUIRED: { status: 403, message: "발렛 요원만 부스를 등록할 수 있습니다." },
  ALREADY_ONBOARDED: { status: 403, message: "이미 부스에 등록된 요원은 부스를 등록할 수 없습니다." },
  REQUEST_CONFLICT: { status: 409, message: "요청이 동시에 변경되었습니다. 다시 시도해 주세요." },
} as const;

const isSameOrigin = (request: Request) => {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host");
  return origin !== null && host !== null && URL.parse(origin)?.host === host;
};

export async function GET(request: NextRequest) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);

    const role = await getActiveStaffRole(staffId);
    if (role === undefined) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
    if (role !== "VALET_AGENT") {
      return apiError("VALET_AGENT_REQUIRED", "발렛 요원만 부스를 검색할 수 있습니다.", 403);
    }

    const query = boothSearchQuerySchema.safeParse(request.nextUrl.searchParams.get("q"));
    if (!query.success) {
      return apiError("INVALID_QUERY", "검색어를 1자 이상 50자 이하로 입력해 주세요.", 400);
    }

    return privateJson(await searchBooths(staffId, query.data));
  } catch (error) {
    console.error("Failed to search valet booths", error);
    return apiError("INTERNAL_ERROR", "부스를 검색하지 못했습니다.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) return apiError("INVALID_ORIGIN", "요청을 확인할 수 없습니다.", 403);
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);

    const role = await getActiveStaffRole(staffId);
    if (role === undefined) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
    if (role !== "VALET_AGENT") {
      return apiError("VALET_AGENT_REQUIRED", "발렛 요원만 부스를 등록할 수 있습니다.", 403);
    }

    const preflightFailure = await getCreateBoothPreflightFailure(staffId);
    if (preflightFailure) {
      const error = CREATE_ERROR_RESPONSES[preflightFailure];
      return apiError(preflightFailure, error.message, error.status);
    }

    const registration = await readBoothRegistration(request);
    if (!registration.ok) {
      const status = registration.reason === "REQUEST_TOO_LARGE" ? 413 : registration.reason === "REQUEST_TIMEOUT" ? 408 : 400;
      return apiError(registration.reason, "요청 본문이 올바르지 않습니다.", status);
    }

    const photoPaths: string[] = [];
    const stagingKeys: string[] = [];
    const candidateFinalKeys: string[] = [];
    const storage = registration.value.photoUploads.length > 0 ? createBoothPhotoStorage() : null;
    try {
      for (const upload of registration.value.photoUploads) {
        const finalId = randomUUID();
        const keys = boothPhotoKeys(staffId, upload, finalId);
        stagingKeys.push(keys.stagingKey);
        candidateFinalKeys.push(keys.finalKey);
        await storage!.promote(staffId, upload, finalId);
        photoPaths.push(keys.finalKey);
      }
    } catch (error) {
      const cleanupKeys = [...candidateFinalKeys, ...stagingKeys];
      const cleanup = await Promise.allSettled(cleanupKeys.map((key) => storage!.delete(key)));
      if (cleanup.some((entry) => entry.status === "rejected")) {
        console.error("Failed to clean up booth photos after promotion failure", { staffId, keys: cleanupKeys });
      }
      if (candidateFinalKeys.length) {
        console.error("Booth photo promotion may have completed after timeout; verify final photo keys", { staffId, keys: candidateFinalKeys });
      }
      throw error;
    }

    let result;
    try {
      result = await createBooth(staffId, registration.value.body, photoPaths);
    } catch (error) {
      // A transaction error may be ambiguous: preserve objects rather than deleting photos
      // that could already be referenced by a committed booth.
      if (photoPaths.length) console.error("Booth creation outcome is ambiguous; preserving uploaded photos", { staffId, keys: photoPaths });
      if (stagingKeys.length) {
        const cleanup = await Promise.allSettled(stagingKeys.map((key) => storage!.delete(key)));
        if (cleanup.some((entry) => entry.status === "rejected")) {
          console.error("Failed to clean up booth staging photos", { staffId, keys: stagingKeys });
        }
      }
      throw error;
    }
    if (!result.ok) {
      // Final IDs are unique to this attempt, so no concurrent booth can reference them.
      const cleanupKeys = [...candidateFinalKeys, ...stagingKeys];
      if (cleanupKeys.length) {
        const cleanup = await Promise.allSettled(cleanupKeys.map((key) => storage!.delete(key)));
        if (cleanup.some((entry) => entry.status === "rejected")) {
          console.error("Failed to clean up unreferenced booth photos", { staffId, keys: cleanupKeys });
        }
      }
      const error = CREATE_ERROR_RESPONSES[result.reason];
      return apiError(result.reason, error.message, error.status);
    }

    if (stagingKeys.length) {
      const cleanup = await Promise.allSettled(stagingKeys.map((key) => storage!.delete(key)));
      if (cleanup.some((entry) => entry.status === "rejected")) {
        console.error("Failed to clean up attached booth staging photos", { staffId, keys: stagingKeys });
      }
    }

    return privateJson(result.value, { status: 201 });
  } catch (error) {
    console.error("Failed to create valet booth", error);
    return apiError("INTERNAL_ERROR", "부스를 등록하지 못했습니다.", 500);
  }
}
