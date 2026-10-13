import { NextResponse } from "next/server";

import { updateVehicleNumberRequestSchema } from "@/libs/vehicle/contracts/updateVehicle";
import { getCurrentUserId } from "@/server/auth/getCurrentUserId";
import { getVehiclesByUserId } from "@/server/user/vehicle/getVehiclesByUserId";
import { updateVehicleNumber } from "@/server/user/vehicle/updateVehicleNumber";

import type { VehicleResponse } from "@/libs/vehicle/contracts/vehicle";
import type { NextRequest } from "next/server";

const ERROR_MESSAGES = {
  UNAUTHORIZED: "로그인이 필요합니다.",
  GET_VEHICLES_FAILED: "차량 정보를 불러오지 못했습니다.",
  INVALID_REQUEST: "차량 번호를 확인해주세요.",
  VEHICLE_REQUIRED: "등록된 차량이 없습니다.",
  DUPLICATE_VEHICLE: "이미 등록된 차량 번호입니다.",
  ACTIVE_SESSION_EXISTS: "진행 중인 발렛이 끝난 뒤에 차량 번호를 바꿀 수 있습니다.",
  UPDATE_VEHICLE_FAILED: "차량 번호를 바꾸지 못했습니다.",
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

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json({ message: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    const body = updateVehicleNumberRequestSchema.safeParse(await request.json().catch(() => null));

    if (!body.success) {
      return NextResponse.json({ message: ERROR_MESSAGES.INVALID_REQUEST }, { status: 400 });
    }

    const result = await updateVehicleNumber(userId, body.data.vehicleNumber);

    if (!result.ok) {
      return NextResponse.json(
        { code: result.reason, message: ERROR_MESSAGES[result.reason] },
        { status: result.reason === "VEHICLE_REQUIRED" ? 404 : 409 },
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to update vehicle number", error);

    return NextResponse.json({ message: ERROR_MESSAGES.UPDATE_VEHICLE_FAILED }, { status: 500 });
  }
}
