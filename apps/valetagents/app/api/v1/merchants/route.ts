import { z } from "zod";

import { merchantRegistrationBodySchema } from "@/libs/merchant/contracts/registration";
import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";
import { apiError, privateJson } from "@/server/common/apiResponse";
import {
  canonicalizeRegistration,
  createMerchantRegistrationService,
  getMerchantRegistrationActorRole,
  hashRegistrationPayload,
  prismaMerchantRegistrationRepository,
  statusUrlFor,
} from "@/server/merchant/registerMerchant";
import { createS3MerchantUploadStorage } from "@/server/merchantUploads/s3MerchantUploadStorage";
import { registrationAccessError } from "@/server/merchantUploads/sessionRouteSupport";
import { getMerchantRegistrationAccess } from "@/server/onboarding/getMerchantRegistrationAccess";

import type { NextRequest } from "next/server";

const idempotencyKeySchema = z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/);

const retryHeaders = { "Retry-After": "2" } as const;

const isSameOrigin = (request: NextRequest) => {
  const origin = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  return origin !== null && host !== null && URL.parse(origin)?.host === host;
};

export async function POST(request: NextRequest) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
    const role = await getMerchantRegistrationActorRole(staffId);
    if (role === null) return apiError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
    if (role !== "MERCHANT_ADMIN") {
      return apiError("MERCHANT_ADMIN_REQUIRED", "업체 관리자만 등록할 수 있습니다.", 403);
    }
    if (!isSameOrigin(request)) {
      return apiError("INVALID_ORIGIN", "허용되지 않은 요청 출처입니다.", 403);
    }
    const key = idempotencyKeySchema.safeParse(request.headers.get("idempotency-key"));
    const body = merchantRegistrationBodySchema.safeParse(await request.json().catch(() => null));
    if (!key.success || !body.success) {
      return apiError("INVALID_INPUT", "업체 등록 정보가 올바르지 않습니다.", 400);
    }
    const payload = canonicalizeRegistration(body.data);
    const payloadHash = hashRegistrationPayload(payload);
    const identity = { staffId, idempotencyKey: key.data, payloadHash };
    const existing = await prismaMerchantRegistrationRepository.findExisting(identity);
    if (existing.kind === "CONFLICT") {
      return privateJson(
        {
          code: "IDEMPOTENCY_CONFLICT",
          sessionId: existing.sessionId,
          statusUrl: statusUrlFor(existing.sessionId),
        },
        { status: 409 },
      );
    }
    if (existing.kind === "REPLAY") {
      return privateJson({ code: "COMMITTED", ...existing.result }, { status: 200 });
    }

    const access = await getMerchantRegistrationAccess(staffId);
    if (!access.ok) {
      const committed =
        access.reason === "MERCHANT_APPROVAL_PENDING"
          ? await prismaMerchantRegistrationRepository.findExisting(identity)
          : null;
      if (committed?.kind === "REPLAY") {
        return privateJson({ code: "COMMITTED", ...committed.result }, { status: 200 });
      }
      return registrationAccessError(access);
    }
    const service = createMerchantRegistrationService({
      repository: prismaMerchantRegistrationRepository,
      storage: createS3MerchantUploadStorage(),
    });
    const result = await service.register({
      staffId,
      idempotencyKey: key.data,
      payload,
      payloadHash,
    });
    if (result.kind === "CREATED") {
      return privateJson({ code: "CREATED", ...result.result }, { status: 201 });
    }
    if (result.kind === "REPLAY") {
      return privateJson({ code: "COMMITTED", ...result.result }, { status: 200 });
    }
    if (result.kind === "PROCESSING") {
      return privateJson(
        {
          code: "PROCESSING",
          sessionId: result.sessionId,
          statusUrl: statusUrlFor(result.sessionId),
        },
        { status: 202, headers: retryHeaders },
      );
    }
    if (result.kind === "RETRYABLE") {
      return privateJson(
        {
          code: "RETRYABLE_FAILURE",
          sessionId: result.sessionId,
          statusUrl: statusUrlFor(result.sessionId),
        },
        { status: 503, headers: retryHeaders },
      );
    }
    if (result.kind === "CONFLICT") {
      return privateJson(
        {
          code: "IDEMPOTENCY_CONFLICT",
          sessionId: result.sessionId,
          statusUrl: statusUrlFor(result.sessionId),
        },
        { status: 409 },
      );
    }
    if (result.kind === "EXPIRED") {
      return privateJson(
        {
          code: "SESSION_EXPIRED",
          sessionId: result.sessionId,
          statusUrl: statusUrlFor(result.sessionId),
        },
        { status: 410 },
      );
    }
    if (result.kind === "UPLOAD_EXPIRED") {
      return privateJson(
        {
          code: "UPLOAD_EXPIRED",
          sessionId: result.sessionId,
          statusUrl: statusUrlFor(result.sessionId),
        },
        { status: 410 },
      );
    }
    if (result.kind === "TERMINAL") {
      return privateJson(
        {
          code: "TERMINAL_FAILURE",
          sessionId: result.sessionId,
          statusUrl: statusUrlFor(result.sessionId),
        },
        { status: 422 },
      );
    }
    if (result.kind === "INVALID") {
      return privateJson(
        {
          code: "INVALID_INPUT",
          sessionId: result.sessionId,
          statusUrl: statusUrlFor(result.sessionId),
        },
        { status: 400 },
      );
    }
    if (result.kind === "SESSION_FORBIDDEN") {
      return apiError("SESSION_FORBIDDEN", "다른 사용자의 등록 세션입니다.", 403);
    }
    if (result.kind === "UPLOAD_FORBIDDEN") {
      return apiError("UPLOAD_FORBIDDEN", "다른 등록 세션의 이미지입니다.", 403);
    }
    if (result.kind === "BOOTH_NOT_FOUND") {
      return apiError("BOOTH_NOT_FOUND", "부스를 찾을 수 없습니다.", 404);
    }
    return apiError("SESSION_NOT_FOUND", "등록 세션을 찾을 수 없습니다.", 404);
  } catch (error) {
    console.error("Failed to register merchant", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return apiError("INTERNAL_ERROR", "업체를 등록하지 못했습니다.", 500);
  }
}
