import "server-only";

import { ACTIVE_VALET_SESSION_STATUSES, lockPlateNumber, prisma } from "database";

import { getBoothAgentFailure } from "@/server/booth/boothAgent";

import { findLatestTicketVersionId } from "./findLatestTicketVersionId";

import type { ParkedNotice } from "./notifyParked";
import type { BoothAgentFailure } from "@/server/booth/boothAgent";

type AddParkedVehicleResult =
  | { ok: true; valetSessionId: number; notice: ParkedNotice | null }
  | { ok: false; reason: BoothAgentFailure | "ACTIVE_SESSION_EXISTS" };

const addParkedVehicle = async (
  staffId: number,
  boothId: number,
  plateNumber: string,
  now = new Date(),
): Promise<AddParkedVehicleResult> => {
  const failure = await getBoothAgentFailure(staffId, boothId);
  if (failure) return { ok: false, reason: failure };

  const contracts = await prisma.boothMerchant.findMany({
    where: { boothId, status: "APPROVED", merchant: { deletedAt: null } },
    select: { merchant: { select: { id: true, name: true } } },
    take: 2,
  });
  const merchant = contracts.length === 1 ? contracts[0].merchant : null;
  const ticketVersionId = merchant ? await findLatestTicketVersionId(merchant.id) : null;

  const added = await prisma.$transaction(async (tx) => {
    await lockPlateNumber(tx, plateNumber);

    const activeSession = await tx.valetSession.findFirst({
      where: { plateNumber, status: { in: [...ACTIVE_VALET_SESSION_STATUSES] } },
      select: { id: true },
    });
    if (activeSession) return null;

    const vehicle = await tx.vehicle.findFirst({
      where: { plateNumber, user: { deletedAt: null } },
      select: { id: true, userId: true },
    });
    const session = await tx.valetSession.create({
      data: {
        status: "PARKED",
        plateNumber,
        vehicleId: vehicle?.id,
        userId: vehicle?.userId,
        merchantId: merchant?.id,
        boothId,
        ticketVersionId,
        parkedAt: now,
        parkedById: staffId,
      },
      select: { id: true },
    });

    return { valetSessionId: session.id, userId: vehicle?.userId ?? null };
  });

  if (!added) return { ok: false, reason: "ACTIVE_SESSION_EXISTS" };

  return {
    ok: true,
    valetSessionId: added.valetSessionId,
    notice: added.userId
      ? {
          userId: added.userId,
          valetSessionId: added.valetSessionId,
          plateNumber,
          merchantName: merchant?.name ?? null,
        }
      : null,
  };
};

export { addParkedVehicle };
