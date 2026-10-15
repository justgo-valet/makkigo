import "server-only";

import { Prisma, prisma } from "database";

import { deriveOnboardingState } from "@/server/onboarding/getStaffOnboardingState";

import type { CreateBoothBody, CreateBoothResponse } from "@/libs/booth/contracts/create-booth";
import type { StaffRole } from "@/libs/onboarding/contracts/status";
import type { BoothAgentStatus } from "database";

type CreateBoothFailure =
  | "AUTH_REQUIRED"
  | "VALET_AGENT_REQUIRED"
  | "ALREADY_ONBOARDED"
  | "REQUEST_CONFLICT";

type CreateBoothResult =
  | { ok: true; value: CreateBoothResponse }
  | { ok: false; reason: CreateBoothFailure };

const MAX_TRANSACTION_ATTEMPTS = 3;

const isSerializationFailure = (error: unknown) => {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === "P2034") return true;
  return (
    "cause" in error &&
    typeof error.cause === "object" &&
    error.cause !== null &&
    "kind" in error.cause &&
    error.cause.kind === "TransactionWriteConflict"
  );
};

const getCreationFailure = (staff: {
  role: StaffRole | null;
  boothMemberships: { status: BoothAgentStatus }[];
} | null): CreateBoothFailure | null => {
  if (!staff) return "AUTH_REQUIRED";
  if (staff.role !== "VALET_AGENT") return "VALET_AGENT_REQUIRED";
  return deriveOnboardingState(staff.role, staff.boothMemberships.map(({ status }) => status)) === "COMPLETE"
    ? "ALREADY_ONBOARDED"
    : null;
};

const getCreateBoothPreflightFailure = async (staffId: number): Promise<CreateBoothFailure | null> => {
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, deletedAt: null },
    select: {
      role: true,
      boothMemberships: { where: { booth: { deletedAt: null } }, select: { status: true } },
    },
  });
  return getCreationFailure(staff);
};

const createInTransaction = async (
  transaction: Prisma.TransactionClient,
  staffId: number,
  body: CreateBoothBody,
  photoPaths: string[],
): Promise<CreateBoothResult> => {
  const staff = await transaction.staff.findFirst({
    where: { id: staffId, deletedAt: null },
    select: {
      role: true,
      boothMemberships: { where: { booth: { deletedAt: null } }, select: { status: true } },
    },
  });
  const failure = getCreationFailure(staff);
  if (failure) return { ok: false, reason: failure };

  const booth = await transaction.booth.create({
    data: {
      name: body.name,
      address: body.address,
      addressDetail: body.addressDetail,
      creatorId: staffId,
      agents: { create: { staffId, status: "APPROVED" } },
      ...(photoPaths.length > 0 ? { photos: { create: photoPaths.map((path, sortOrder) => ({ path, sortOrder })) } } : {}),
    },
    select: { id: true },
  });

  return { ok: true, value: booth };
};

const createBooth = async (staffId: number, body: CreateBoothBody, photoPaths: string[] = []): Promise<CreateBoothResult> => {
  for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        (transaction) => createInTransaction(transaction, staffId, body, photoPaths),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (!isSerializationFailure(error)) throw error;
    }
  }

  return { ok: false, reason: "REQUEST_CONFLICT" };
};

export { createBooth, getCreateBoothPreflightFailure };
export type { CreateBoothFailure, CreateBoothResult };
