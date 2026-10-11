import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/server/auth/getCurrentUserId";
import { getMyVehicle } from "@/server/user/getMyVehicle";

import type { MyVehicleResponse } from "@/libs/user/contracts/myVehicle";
import type { NextRequest } from "next/server";

const ERROR_MESSAGES = {
  UNAUTHORIZED: "로그인이 필요합니다.",
  VEHICLE_NOT_FOUND: "등록된 차량이 없습니다.",
  INTERNAL_SERVER_ERROR: "차량 정보를 불러오지 못했습니다.",
} as const;

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json({ message: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    const vehicle = await getMyVehicle(userId);

    if (!vehicle) {
      return NextResponse.json(
        { message: ERROR_MESSAGES.VEHICLE_NOT_FOUND, code: "VEHICLE_NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json<MyVehicleResponse>(vehicle);
  } catch (error) {
    console.error("Failed to get my vehicle", error);

    return NextResponse.json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
