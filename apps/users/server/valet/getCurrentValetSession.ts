import "server-only";
import { ACTIVE_VALET_SESSION_STATUSES, calculateValetFee, prisma } from "database";

import type { CurrentValetSessionResponse } from "@/libs/valet/contracts/currentSession";

const PICKUP_QUEUE_STATUSES = ["PICKUP_REQUESTED", "PICKUP_PREPARING"] as const;

const findBoothDetails = async (boothId: number, now: Date) => {
  const effective = { effectiveFrom: { lte: now } };
  const latest = { effectiveFrom: "desc" } as const;

  const [feePolicy, bankAccount, waitingPickupCount] = await Promise.all([
    prisma.boothFeePolicy.findFirst({ where: { boothId, ...effective }, orderBy: latest }),
    prisma.boothBankAccount.findFirst({
      where: { boothId, ...effective },
      orderBy: latest,
      select: { bankName: true, accountNumber: true },
    }),
    prisma.valetSession.count({ where: { boothId, status: { in: [...PICKUP_QUEUE_STATUSES] } } }),
  ]);

  return { feePolicy, bankAccount, waitingPickupCount };
};

const getCurrentValetSession = async (userId: number): Promise<CurrentValetSessionResponse> => {
  const session = await prisma.valetSession.findFirst({
    where: { userId, status: { in: [...ACTIVE_VALET_SESSION_STATUSES] } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      boothId: true,
      createdAt: true,
      parkedAt: true,
      baseFee: true,
      actualFee: true,
      expectedPickupAt: true,
      merchant: { select: { name: true } },
    },
  });

  if (!session) return { session: null };

  const now = new Date();
  const booth = session.boothId ? await findBoothDetails(session.boothId, now) : null;
  const isParked = session.status === "PARKED";
  const parkedFee =
    isParked && session.parkedAt && booth?.feePolicy
      ? calculateValetFee(booth.feePolicy, session.parkedAt, now)
      : null;

  return {
    session: {
      id: session.id,
      status: session.status as (typeof ACTIVE_VALET_SESSION_STATUSES)[number],
      merchantName: session.merchant?.name ?? null,
      arrivalNotifiedAt: session.status === "ARRIVING" ? session.createdAt.toISOString() : null,
      parkedAt: session.parkedAt?.toISOString() ?? null,
      waitingPickupCount: isParked ? (booth?.waitingPickupCount ?? null) : null,
      currentFee: isParked ? parkedFee : session.baseFee,
      actualFee: session.actualFee,
      expectedPickupAt: session.expectedPickupAt?.toISOString() ?? null,
      bankAccount:
        session.status === "PICKUP_PREPARING" && booth?.bankAccount
          ? `${booth.bankAccount.bankName} ${booth.bankAccount.accountNumber}`
          : null,
    },
  };
};

export { getCurrentValetSession };
