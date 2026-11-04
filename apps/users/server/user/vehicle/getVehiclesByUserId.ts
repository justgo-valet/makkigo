import "server-only";
import { prisma } from "database";

import { vehicleResponseSchema } from "@/libs/vehicle/contracts/vehicle";
import { toImageUrl } from "@/server/common/imageUrl";

import type { VehicleResponse } from "@/libs/vehicle/contracts/vehicle";

const DEFAULT_CAR_IMAGE_PATH = "cars/_default.png";

const getVehiclesByUserId = async (userId: number): Promise<VehicleResponse> => {
  const vehicles = await prisma.vehicle.findMany({
    where: { userId },
    select: {
      id: true,
      plateNumber: true,
      brand: { select: { id: true, name: true, logoUrl: true } },
      model: { select: { id: true, name: true, imageUrl: true } },
      customBrandName: true,
      customModelName: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return vehicleResponseSchema.parse(
    vehicles.map((vehicle) => {
      const modelImagePath = vehicle.model?.imageUrl ?? null;

      return {
        ...vehicle,
        brand: vehicle.brand
          ? { ...vehicle.brand, logoUrl: toImageUrl(vehicle.brand.logoUrl) }
          : null,
        model: vehicle.model
          ? { ...vehicle.model, imageUrl: toImageUrl(vehicle.model.imageUrl) }
          : null,
        carImageUrl: toImageUrl(modelImagePath ?? DEFAULT_CAR_IMAGE_PATH),
        isCarImagePlaceholder: modelImagePath === null,
      };
    }),
  );
};

export { getVehiclesByUserId };
