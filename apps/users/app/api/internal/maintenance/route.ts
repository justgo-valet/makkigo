import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { runMaintenance } from "@/server/maintenance/runMaintenance";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_TOKEN_BYTES = 32;

const maintenanceBodySchema = z.object({ dryRun: z.boolean().default(false) }).strict();

const hasJobToken = (request: NextRequest) => {
  const configured = process.env.USERS_INTERNAL_JOB_TOKEN;
  const authorization = request.headers.get("authorization");
  if (!configured || !authorization?.startsWith("Bearer ")) return false;

  const expected = Buffer.from(configured);
  const supplied = Buffer.from(authorization.slice("Bearer ".length));

  return (
    expected.length >= MIN_TOKEN_BYTES &&
    expected.length === supplied.length &&
    timingSafeEqual(expected, supplied)
  );
};

export async function POST(request: NextRequest) {
  if (!hasJobToken(request)) {
    return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ message: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const body = maintenanceBodySchema.safeParse(rawBody);
  if (!body.success) {
    return NextResponse.json({ message: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const result = await runMaintenance({ dryRun: body.data.dryRun });

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
