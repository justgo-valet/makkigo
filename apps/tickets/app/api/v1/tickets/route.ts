import { ticketSaveBodySchema } from "@/libs/ticket/contracts";
import { apiError, privateJson } from "@/server/common/apiResponse";
import { requireMerchantAdminRequest } from "@/server/common/requireMerchantAdminRequest";
import { saveTicket } from "@/server/ticket/tickets";

import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const access = await requireMerchantAdminRequest(request);
    if ("error" in access) return access.error;
    const body = ticketSaveBodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError("INVALID_INPUT", "티켓 디자인이 올바르지 않습니다.", 400);
    const result = await saveTicket({ staffId: access.staffId, ...body.data });
    if (result.kind === "SAVED") {
      return privateJson({ ticketId: result.ticketId }, { status: body.data.ticketId === undefined ? 201 : 200 });
    }
    if (result.kind === "ASSET_NOT_FOUND") return apiError("TICKET_IMAGE_REQUIRED", "이 업체에 올린 이미지만 쓸 수 있습니다.", 400);
    return apiError("TICKET_NOT_FOUND", "티켓 또는 업체를 찾을 수 없습니다.", 404);
  } catch (error) {
    console.error("Failed to save ticket", error);
    return apiError("INTERNAL_ERROR", "티켓을 저장하지 못했습니다.", 500);
  }
}
