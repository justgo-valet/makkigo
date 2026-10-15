import "server-only";
import { ACTIVE_VALET_SESSION_STATUSES, lockPlateNumber, prisma } from "database";

import { hasAgreedToConsent } from "@/server/consent/hasRequiredConsents";
import { estimateArrivalAt } from "@/server/location/estimateArrivalAt";

import type { ArrivalErrorCode, SendArrivalRequest } from "@/libs/valet/contracts/arrival";

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
  { merchantId, location }: SendArrivalRequest,
): Promise<CreateArrivalSessionResult> => {
  const [vehicle, merchant] = await Promise.all([
    prisma.vehicle.findUnique({ where: { userId }, select: { id: true, plateNumber: true } }),
    prisma.merchant.findFirst({
      where: { id: merchantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        _count: {
          select: { booths: { where: { status: "APPROVED", booth: { deletedAt: null } } } },
        },
      },
    }),
  ]);

  if (!vehicle) return { ok: false, reason: "VEHICLE_REQUIRED" };
  if (!merchant) return { ok: false, reason: "MERCHANT_NOT_FOUND" };
  if (merchant._count.booths === 0) return { ok: false, reason: "NO_AVAILABLE_BOOTH" };

  const [recipientIds, locationAgreed] = await Promise.all([
    findArrivalRecipientIds(merchantId),
    location ? hasAgreedToConsent(userId, "LOCATION_BASED_SERVICE") : false,
  ]);
  const usesLocation = location !== undefined && locationAgreed;
  const expectedArrivalAt = usesLocation ? await estimateArrivalAt(location, merchant) : null;

  return prisma.$transaction(async (tx) => {
    await lockPlateNumber(tx, vehicle.plateNumber);

    const user = await tx.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });

    if (!user) throw new Error("Withdrawn user cannot send an arrival notification");

    const activeSession = await tx.valetSession.findFirst({
      where: {
        plateNumber: vehicle.plateNumber,
        status: { in: [...ACTIVE_VALET_SESSION_STATUSES] },
      },
      select: { id: true },
    });

    const session = activeSession
      ? null
      : await tx.valetSession.create({
          data: {
            status: "ARRIVING",
            plateNumber: vehicle.plateNumber,
            vehicleId: vehicle.id,
            userId,
            merchantId,
            expectedArrivalAt,
          },
          select: { id: true },
        });

    if (usesLocation) {
      await tx.locationUseLog.create({
        data: { userId, valetSessionId: session?.id ?? null, purpose: "ARRIVAL_ETA" },
      });
    }

    if (!session) return { ok: false, reason: "ACTIVE_SESSION_EXISTS" } as const;

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
