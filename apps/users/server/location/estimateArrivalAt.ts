import "server-only";
import { prisma } from "database";

import { findAddressCoordinates, findDrivingDurationSeconds } from "@/server/location/kakaoApi";

import type { Coordinates } from "@/server/location/kakaoApi";

interface MerchantLocation {
  id: number;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

const findMerchantCoordinates = async (merchant: MerchantLocation) => {
  if (merchant.latitude !== null && merchant.longitude !== null) {
    return { latitude: merchant.latitude, longitude: merchant.longitude };
  }

  const coordinates = await findAddressCoordinates(merchant.address);

  if (coordinates) {
    await prisma.merchant.updateMany({
      where: { id: merchant.id, latitude: null },
      data: coordinates,
    });
  }

  return coordinates;
};

const estimateArrivalAt = async (origin: Coordinates, merchant: MerchantLocation) => {
  try {
    const destination = await findMerchantCoordinates(merchant);

    if (!destination) return null;

    const durationSeconds = await findDrivingDurationSeconds(origin, destination);

    if (durationSeconds === null) return null;

    return new Date(Date.now() + durationSeconds * 1000);
  } catch (error) {
    console.error("Failed to estimate arrival time", error instanceof Error ? error.message : "");

    return null;
  }
};

export { estimateArrivalAt };
