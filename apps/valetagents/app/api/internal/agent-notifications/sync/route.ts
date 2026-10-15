import { syncAgentNotifications } from "@/server/booth/syncAgentNotifications";
import { apiError, privateJson } from "@/server/common/apiResponse";
import { hasInternalToken } from "@/server/common/internalToken";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!hasInternalToken(request, process.env.AGENT_NOTIFICATION_SYNC_TOKEN)) {
    return apiError("AUTH_REQUIRED", "인증이 필요합니다.", 401);
  }

  try {
    return privateJson(await syncAgentNotifications());
  } catch (error) {
    console.error("Failed to sync agent notifications", error);
    return apiError("INTERNAL_ERROR", "알림 자동 전환을 하지 못했습니다.", 500);
  }
}
