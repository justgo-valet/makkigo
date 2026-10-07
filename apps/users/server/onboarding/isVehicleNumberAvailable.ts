import "server-only";
import { prisma } from "database";

const isVehicleNumberAvailable = async (userId: number, vehicleNumber: string) => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { plateNumber: vehicleNumber },
    select: { userId: true },
  });

  return !vehicle || vehicle.userId === userId;
};

export { isVehicleNumberAvailable };
