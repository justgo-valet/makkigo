import { Prisma, prisma } from "database";

import type { CompleteOnboardingRequest } from "@/libs/onboarding/contracts/onboarding";

type CompleteOnboardingResult =
  | { ok: true }
  | { ok: false; reason: "ALREADY_COMPLETED" | "DUPLICATE_PHONE" | "DUPLICATE_VEHICLE" };

const resolveCarIds = async (brandName: string, modelName: string) => {
  const brand = await prisma.carBrand.findUnique({ where: { name: brandName } });

  if (!brand) {
    return { customBrandName: brandName, customModelName: modelName };
  }

  const model = await prisma.carModel.findUnique({
    where: { name_brandId: { name: modelName, brandId: brand.id } },
  });

  return model
    ? { brandId: brand.id, modelId: model.id }
    : { brandId: brand.id, customModelName: modelName };
};

const isUniqueViolationOn = (error: unknown, field: string) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002" &&
  JSON.stringify(error.meta ?? {}).includes(field);

const completeOnboarding = async (
  userId: number,
  request: CompleteOnboardingRequest,
): Promise<CompleteOnboardingResult> => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { phone: true, vehicle: { select: { id: true } } },
  });

  if (user.phone && user.vehicle) {
    return { ok: false, reason: "ALREADY_COMPLETED" };
  }

  const carIds = await resolveCarIds(request.carBrand, request.carModel);

  try {
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { phone: request.phoneNumber } }),
      prisma.vehicle.upsert({
        where: { userId },
        create: { userId, plateNumber: request.vehicleNumber, ...carIds },
        update: { plateNumber: request.vehicleNumber, ...carIds },
      }),
    ]);
  } catch (error) {
    if (isUniqueViolationOn(error, "phone")) {
      return { ok: false, reason: "DUPLICATE_PHONE" };
    }
    if (isUniqueViolationOn(error, "plate_number")) {
      return { ok: false, reason: "DUPLICATE_VEHICLE" };
    }
    throw error;
  }

  return { ok: true };
};

export { completeOnboarding };
