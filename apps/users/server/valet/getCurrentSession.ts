import "server-only";
import { ACTIVE_VALET_SESSION_STATUSES, calculateValetFee, findFeePolicy, prisma } from "database";

import type { CurrentSession } from "@/libs/valet/contracts/currentSession";
import type { Prisma } from "database";

const ARRIVAL_SESSION_GAP_MS = 1000;

const toIso = (date: Date | null) => date?.toISOString() ?? null;

const isPickupStatus = (status: CurrentSession["status"]) =>
  status === "PICKUP_REQUESTED" || status === "PICKUP_PREPARING";

const getArrivalNotifiedAt = (session: {
  status: CurrentSession["status"];
  createdAt: Date;
  parkedAt: Date | null;
}) => {
  if (session.status === "ARRIVING" || !session.parkedAt) return session.createdAt;

  return session.parkedAt.getTime() - session.createdAt.getTime() > ARRIVAL_SESSION_GAP_MS
    ? session.createdAt
    : null;
};

const findBankAccount = (boothId: number, now: Date) =>
  prisma.boothBankAccount.findFirst({
    where: { boothId, effectiveFrom: { lte: now } },
    orderBy: [{ effectiveFrom: "desc" }, { id: "desc" }],
    select: { bankName: true, accountNumber: true, accountHolder: true },
  });

const findSessionView = async (
  where: Prisma.ValetSessionWhereInput,
  now: Date,
): Promise<CurrentSession | null> => {
  const session = await prisma.valetSession.findFirst({
    where: { ...where, status: { in: [...ACTIVE_VALET_SESSION_STATUSES] } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      status: true,
      plateNumber: true,
      boothId: true,
      expectedArrivalAt: true,
      arrivalDelayMinutes: true,
      parkedAt: true,
      pickupRequestedAt: true,
      baseFee: true,
      actualFee: true,
      expectedPickupAt: true,
      createdAt: true,
      merchant: { select: { name: true } },
      booth: { select: { name: true } },
    },
  });

  if (!session) return null;

  const status = session.status as CurrentSession["status"];
  const { boothId, parkedAt } = session;
  const feeBaseTime = status === "PARKED" ? now : session.pickupRequestedAt;
  const needsFee = boothId !== null && parkedAt !== null && feeBaseTime !== null;

  const [feePolicy, waitingPickupCount, bankAccount] = await Promise.all([
    needsFee ? findFeePolicy(prisma, boothId, feeBaseTime) : null,
    boothId === null
      ? null
      : prisma.valetSession.count({ where: { boothId, status: "PICKUP_REQUESTED" } }),
    boothId !== null && isPickupStatus(status) ? findBankAccount(boothId, now) : null,
  ]);

  const calculatedFee =
    feePolicy && parkedAt && feeBaseTime
      ? calculateValetFee(feePolicy, parkedAt, feeBaseTime)
      : null;
  const fee =
    calculatedFee && isPickupStatus(status) && session.baseFee !== null
      ? { ...calculatedFee, total: session.baseFee }
      : calculatedFee;

  return {
    id: session.id,
    status,
    plateNumber: session.plateNumber,
    merchantName: session.merchant?.name ?? null,
    boothName: session.booth?.name ?? null,
    arrivalNotifiedAt: toIso(getArrivalNotifiedAt({ ...session, status })),
    expectedArrivalAt: toIso(session.expectedArrivalAt),
    arrivalDelayMinutes: session.arrivalDelayMinutes,
    parkedAt: toIso(parkedAt),
    pickupRequestedAt: toIso(session.pickupRequestedAt),
    waitingPickupCount,
    fee,
    actualFee: session.actualFee,
    expectedPickupAt: toIso(session.expectedPickupAt),
    bankAccount,
  };
};

const getCurrentSession = (userId: number, now: Date = new Date()) =>
  findSessionView({ userId }, now);

const getMyActiveSession = (userId: number, valetSessionId: number, now: Date = new Date()) =>
  findSessionView({ id: valetSessionId, userId }, now);

export { getCurrentSession, getMyActiveSession };
