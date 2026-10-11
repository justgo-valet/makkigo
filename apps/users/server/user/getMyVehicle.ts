import "server-only";
import { prisma } from "database";

import { toImageUrl } from "@/server/common/imageUrl";

import type { MyVehicleResponse } from "@/libs/user/contracts/myVehicle";

const DEFAULT_CAR_IMAGE_PATH = "cars/_default.png";

const getMyVehicle = async (userId: number): Promise<MyVehicleResponse | null> => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { userId },
    select: { plateNumber: true, model: { select: { imageUrl: true } } },
  });

  if (!vehicle) return null;

  return {
    plateNumber: vehicle.plateNumber,
    carImageUrl: toImageUrl(vehicle.model?.imageUrl ?? DEFAULT_CAR_IMAGE_PATH),
  };
};

export { getMyVehicle };
