import { NextResponse } from "next/server";

import { findCarModelsByBrand } from "@/server/car/findCarModelsByBrand";

import type { NextRequest } from "next/server";

const ERROR_MESSAGES = {
  BRAND_REQUIRED: "차량 브랜드는 필수입니다.",
  INTERNAL_SERVER_ERROR: "차량 모델을 불러오지 못했습니다.",
} as const;

export async function GET(request: NextRequest) {
  const brand = request.nextUrl.searchParams.get("brand")?.trim();

  if (!brand) {
    return NextResponse.json({ message: ERROR_MESSAGES.BRAND_REQUIRED }, { status: 400 });
  }

  try {
    const carModels = await findCarModelsByBrand(brand);

    return NextResponse.json(carModels);
  } catch (error) {
    console.error("Failed to get car models", error);

    return NextResponse.json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
