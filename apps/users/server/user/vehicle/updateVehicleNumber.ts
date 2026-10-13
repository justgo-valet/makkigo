import "server-only";
import { ACTIVE_VALET_SESSION_STATUSES, lockPlateNumber, Prisma, prisma } from "database";

import { isVehicleNumberAvailable } from "@/server/onboarding/isVehicleNumberAvailable";

import type { UpdateVehicleNumberErrorCode } from "@/libs/vehicle/contracts/updateVehicle";

type UpdateVehicleNumberResult = { ok: true } | { ok: false; reason: UpdateVehicleNumberErrorCode };

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

const updateVehicleNumber = async (
  userId: number,
  vehicleNumber: string,
): Promise<UpdateVehicleNumberResult> => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { userId },
    select: { id: true, plateNumber: true },
  });

  if (!vehicle) return { ok: false, reason: "VEHICLE_REQUIRED" };
  if (vehicle.plateNumber === vehicleNumber) return { ok: true };
  if (!(await isVehicleNumberAvailable(userId, vehicleNumber))) {
    return { ok: false, reason: "DUPLICATE_VEHICLE" };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const [firstPlate, secondPlate] =
        vehicle.plateNumber < vehicleNumber
          ? [vehicle.plateNumber, vehicleNumber]
          : [vehicleNumber, vehicle.plateNumber];
      await lockPlateNumber(tx, firstPlate);
      await lockPlateNumber(tx, secondPlate);

      const activeSession = await tx.valetSession.findFirst({
        where: {
          status: { in: [...ACTIVE_VALET_SESSION_STATUSES] },
          OR: [{ plateNumber: vehicle.plateNumber }, { vehicleId: vehicle.id }, { userId }],
        },
        select: { id: true },
      });

      if (activeSession) return { ok: false, reason: "ACTIVE_SESSION_EXISTS" } as const;

      await tx.vehicle.update({ where: { id: vehicle.id }, data: { plateNumber: vehicleNumber } });

      return { ok: true } as const;
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, reason: "DUPLICATE_VEHICLE" };
    throw error;
  }
};

export { updateVehicleNumber };
