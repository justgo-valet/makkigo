import "server-only";
import { ACTIVE_VALET_SESSION_STATUSES, lockPlateNumber, prisma } from "database";

import type { ArrivalErrorCode } from "@/libs/valet/contracts/arrival";

type CreateArrivalSessionResult =
  | { ok: true; valetSessionId: number }
  | { ok: false; reason: ArrivalErrorCode };

const findArrivalRecipientIds = async (merchantId: number) => {
  const agents = await prisma.boothAgent.findMany({
    where: {
      status: "APPROVED",
      notificationsEnabled: true,
      staff: { deletedAt: null },
      booth: {
        deletedAt: null,
        merchants: { some: { merchantId, status: "APPROVED" } },
      },
    },
    select: { staffId: true },
    distinct: ["staffId"],
  });

  return agents.map((agent) => agent.staffId);
};

const createArrivalSession = async (
  userId: number,
  merchantId: number,
): Promise<CreateArrivalSessionResult> => {
  const [vehicle, merchant] = await Promise.all([
    prisma.vehicle.findUnique({ where: { userId }, select: { id: true, plateNumber: true } }),
    prisma.merchant.findFirst({
      where: { id: merchantId, deletedAt: null },
      select: {
        name: true,
        _count: {
          select: { booths: { where: { status: "APPROVED", booth: { deletedAt: null } } } },
        },
      },
    }),
  ]);

  if (!vehicle) return { ok: false, reason: "VEHICLE_REQUIRED" };
  if (!merchant) return { ok: false, reason: "MERCHANT_NOT_FOUND" };
  if (merchant._count.booths === 0) return { ok: false, reason: "NO_AVAILABLE_BOOTH" };

  const recipientIds = await findArrivalRecipientIds(merchantId);

  return prisma.$transaction(async (tx) => {
    await lockPlateNumber(tx, vehicle.plateNumber);

    const activeSession = await tx.valetSession.findFirst({
      where: {
        plateNumber: vehicle.plateNumber,
        status: { in: [...ACTIVE_VALET_SESSION_STATUSES] },
      },
      select: { id: true },
    });

    if (activeSession) return { ok: false, reason: "ACTIVE_SESSION_EXISTS" } as const;

    const session = await tx.valetSession.create({
      data: {
        status: "ARRIVING",
        plateNumber: vehicle.plateNumber,
        vehicleId: vehicle.id,
        userId,
        merchantId,
      },
      select: { id: true },
    });

    await tx.notification.createMany({
      data: recipientIds.map((staffId) => ({
        type: "ARRIVAL" as const,
        staffId,
        valetSessionId: session.id,
        title: "도착 알림",
        body: `${merchant.name} · ${vehicle.plateNumber} 차량이 곧 도착해요`,
      })),
    });

    return { ok: true, valetSessionId: session.id } as const;
  });
};

export { createArrivalSession };
