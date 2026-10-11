import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/server/auth/getCurrentUserId";
import { getVehiclesByUserId } from "@/server/user/vehicle/getVehiclesByUserId";

import type { VehicleResponse } from "@/libs/vehicle/contracts/vehicle";
import type { NextRequest } from "next/server";

const ERROR_MESSAGES = {
  UNAUTHORIZED: "로그인이 필요합니다.",
  GET_VEHICLES_FAILED: "차량 정보를 불러오지 못했습니다.",
} as const;

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json({ message: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    return NextResponse.json<VehicleResponse>(await getVehiclesByUserId(userId));
  } catch (error) {
    console.error("Failed to get user vehicles", error);

    return NextResponse.json({ message: ERROR_MESSAGES.GET_VEHICLES_FAILED }, { status: 500 });
  }
}
