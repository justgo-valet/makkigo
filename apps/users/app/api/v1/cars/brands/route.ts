import { NextResponse } from "next/server";

import { findCarBrands } from "@/server/car/findCarBrands";

const ERROR_MESSAGE = "차량 브랜드를 불러오지 못했습니다.";

export async function GET() {
  try {
    const carBrands = await findCarBrands();

    return NextResponse.json(carBrands);
  } catch (error) {
    console.error("Failed to get car brands", error);

    return NextResponse.json({ message: ERROR_MESSAGE }, { status: 500 });
  }
}
