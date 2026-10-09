import { prisma } from "database";
import { NextResponse } from "next/server";

import { getCurrentStaffId } from "@/server/auth/getCurrentStaffId";

import type { NextRequest } from "next/server";

const STAFF_ROLES = new Set(["VALET_AGENT", "MERCHANT_ADMIN"]);

export async function POST(request: NextRequest) {
  try {
    const staffId = await getCurrentStaffId(request);
    if (!staffId) {
      return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as { role?: unknown } | null;
    if (!body || typeof body.role !== "string" || !STAFF_ROLES.has(body.role)) {
      return NextResponse.json({ message: "역할을 선택해주세요." }, { status: 400 });
    }

    const { count } = await prisma.staff.updateMany({
      where: { id: staffId, role: null, deletedAt: null },
      data: { role: body.role as "VALET_AGENT" | "MERCHANT_ADMIN" },
    });
    if (count === 0) {
      return NextResponse.json({ message: "이미 역할 선택을 완료했습니다." }, { status: 409 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to complete staff onboarding", error);
    return NextResponse.json({ message: "역할을 저장하지 못했습니다." }, { status: 500 });
  }
}
