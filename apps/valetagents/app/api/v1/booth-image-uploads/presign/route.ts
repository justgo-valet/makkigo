import { randomUUID } from "node:crypto";

import { boothPhotoPresignRequestSchema } from "@/libs/booth/contracts/photos";
import { getActiveStaffRole } from "@/server/auth/getActiveStaffRole";
import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { getCreateBoothPreflightFailure } from "@/server/booth/createBooth";
import { readBoundedJson } from "@/server/booth/readBoothRegistration";
import { createBoothPhotoStorage } from "@/server/booth/s3BoothPhotoStorage";
import { apiError, privateJson } from "@/server/common/apiResponse";

import type { NextRequest } from "next/server";

const CREATE_ERROR_RESPONSES = {
  AUTH_REQUIRED: { status: 401, message: "로그인이 필요합니다." },
  VALET_AGENT_REQUIRED: { status: 403, message: "발렛 요원만 부스를 등록할 수 있습니다." },
  ALREADY_ONBOARDED: { status: 403, message: "이미 부스에 등록된 요원은 부스를 등록할 수 없습니다." },
  REQUEST_CONFLICT: { status: 409, message: "요청이 동시에 변경되었습니다. 다시 시도해 주세요." },
} as const;

const isSameOrigin = (request: NextRequest) => {
  const origin = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  return origin !== null && host !== null && URL.parse(origin)?.host === host;
};

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) return apiError("INVALID_ORIGIN", "허용되지 않은 요청 출처입니다.", 403);
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

    const json = await readBoundedJson(request, 16 * 1024);
    if (!json.ok) {
      const status = json.reason === "REQUEST_TOO_LARGE" ? 413 : json.reason === "REQUEST_TIMEOUT" ? 408 : 400;
      return apiError(json.reason, "요청 본문이 올바르지 않습니다.", status);
    }
    const body = boothPhotoPresignRequestSchema.safeParse(json.value);
    if (!body.success) return apiError("INVALID_REQUEST", "사진 정보가 올바르지 않습니다.", 400);

    const storage = createBoothPhotoStorage();
    const uploads = await Promise.all(body.data.uploads.map(async (metadata) => {
      const upload = { ...metadata, uploadId: randomUUID() };
      const post = await storage.createUploadPost(staffId, upload);
      return { uploadId: upload.uploadId, ...metadata, post };
    }));
    return privateJson({ uploads });
  } catch (error) {
    console.error("Failed to prepare booth photo uploads", error);
    return apiError("INTERNAL_ERROR", "사진 업로드를 준비하지 못했습니다.", 500);
  }
}
