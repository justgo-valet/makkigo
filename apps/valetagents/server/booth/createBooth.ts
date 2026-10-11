import "server-only";

import { Prisma, prisma } from "database";

import { deriveOnboardingState } from "@/server/onboarding/getStaffOnboardingState";

import type { CreateBoothBody, CreateBoothResponse } from "@/libs/booth/contracts/create-booth";

type CreateBoothFailure =
  | "AUTH_REQUIRED"
  | "VALET_AGENT_REQUIRED"
  | "ALREADY_ONBOARDED"
  | "REQUEST_CONFLICT";

type CreateBoothResult =
  | { ok: true; value: CreateBoothResponse }
  | { ok: false; reason: CreateBoothFailure };

const MAX_TRANSACTION_ATTEMPTS = 3;

// 직렬화 실패는 문장 실행 중에 나면 P2034 로 오지만, COMMIT 에서 나면 Prisma 가 바꾸지 않은
// 드라이버 오류(cause.kind 가 P2034 로 바뀌는 바로 그 값)로 온다.
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

const createInTransaction = async (
  transaction: Prisma.TransactionClient,
  staffId: number,
  body: CreateBoothBody,
): Promise<CreateBoothResult> => {
  // 이 읽기가 트랜잭션 밖에서 일어나면 동시에 온 두 요청이 모두 통과해 부스가 2개 생긴다.
  const staff = await transaction.staff.findFirst({
    where: { id: staffId, deletedAt: null },
    select: {
      role: true,
      boothMemberships: { where: { booth: { deletedAt: null } }, select: { status: true } },
    },
  });
  if (!staff) return { ok: false, reason: "AUTH_REQUIRED" };
  if (staff.role !== "VALET_AGENT") return { ok: false, reason: "VALET_AGENT_REQUIRED" };

  const state = deriveOnboardingState(
    staff.role,
    staff.boothMemberships.map(({ status }) => status),
  );
  if (state === "COMPLETE") return { ok: false, reason: "ALREADY_ONBOARDED" };

  const booth = await transaction.booth.create({
    data: {
      name: body.name,
      address: body.address,
      addressDetail: body.addressDetail,
      creatorId: staffId,
      agents: { create: { staffId, status: "APPROVED" } },
    },
    select: { id: true },
  });

  return { ok: true, value: booth };
};

const createBooth = async (staffId: number, body: CreateBoothBody): Promise<CreateBoothResult> => {
  for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        (transaction) => createInTransaction(transaction, staffId, body),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (!isSerializationFailure(error)) throw error;
    }
  }

  return { ok: false, reason: "REQUEST_CONFLICT" };
};

export { createBooth };
export type { CreateBoothFailure, CreateBoothResult };
