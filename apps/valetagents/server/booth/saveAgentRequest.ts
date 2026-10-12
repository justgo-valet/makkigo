import "server-only";

import { Prisma, prisma } from "database";

import { selectCurrentFeePolicy } from "./currentFeePolicy";
import { parseWorkTime } from "./workTime";
import { serializeRequest } from "./serializeBooth";

import type {
  AgentRequestBody,
  AgentRequestOutcome,
  AgentRequestResponse,
} from "@/libs/booth/contracts/agent-request";

type SaveAgentRequestFailure =
  | "AUTH_REQUIRED"
  | "VALET_AGENT_REQUIRED"
  | "BOOTH_NOT_FOUND"
  | "ALREADY_APPROVED"
  | "REQUEST_CONFLICT";

type SaveAgentRequestResult =
  | { ok: true; value: AgentRequestResponse }
  | { ok: false; reason: SaveAgentRequestFailure };

const MAX_TRANSACTION_ATTEMPTS = 3;
const RETRYABLE_PRISMA_CODES = new Set(["P2002", "P2034"]);

const selectRequest = (now: Date) =>
  ({
    id: true,
    status: true,
    workStartTime: true,
    workEndTime: true,
    createdAt: true,
    updatedAt: true,
    booth: {
      select: {
        id: true,
        name: true,
        address: true,
        addressDetail: true,
        feePolicies: selectCurrentFeePolicy(now),
      },
    },
  }) satisfies Prisma.BoothAgentSelect;

class ConcurrentAgentRequestError extends Error {}

const isCommitWriteConflict = (error: unknown) =>
  error instanceof Error &&
  error.name === "DriverAdapterError" &&
  typeof error.cause === "object" &&
  error.cause !== null &&
  "kind" in error.cause &&
  error.cause.kind === "TransactionWriteConflict";

const isRetryableTransactionError = (error: unknown) =>
  error instanceof ConcurrentAgentRequestError ||
  isCommitWriteConflict(error) ||
  (typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    RETRYABLE_PRISMA_CODES.has(error.code));

const saveInTransaction = async (
  transaction: Prisma.TransactionClient,
  staffId: number,
  boothId: number,
  body: AgentRequestBody,
): Promise<SaveAgentRequestResult> => {
  const staff = await transaction.staff.findFirst({
    where: { id: staffId, deletedAt: null },
    select: { role: true },
  });
  if (!staff) return { ok: false, reason: "AUTH_REQUIRED" };
  if (staff.role !== "VALET_AGENT") return { ok: false, reason: "VALET_AGENT_REQUIRED" };

  const booth = await transaction.booth.findFirst({
    where: { id: boothId, deletedAt: null },
    select: { id: true },
  });
  if (!booth) return { ok: false, reason: "BOOTH_NOT_FOUND" };

  const existing = await transaction.boothAgent.findUnique({
    where: { boothId_staffId: { boothId, staffId } },
    select: { id: true, status: true },
  });
  if (existing?.status === "APPROVED") return { ok: false, reason: "ALREADY_APPROVED" };

  const workStartTime = parseWorkTime(body.workStartTime);
  const workEndTime = parseWorkTime(body.workEndTime);
  let outcome: AgentRequestOutcome;

  if (existing) {
    const { count } = await transaction.boothAgent.updateMany({
      where: { id: existing.id, staffId, status: { in: ["REQUESTED", "REJECTED"] } },
      data: { status: "REQUESTED", workStartTime, workEndTime },
    });

    if (count === 0) {
      const latest = await transaction.boothAgent.findUnique({
        where: { boothId_staffId: { boothId, staffId } },
        select: { status: true },
      });
      if (latest?.status === "APPROVED") return { ok: false, reason: "ALREADY_APPROVED" };
      throw new ConcurrentAgentRequestError();
    }

    outcome = existing.status === "REJECTED" ? "REOPENED" : "UPDATED";
  } else {
    await transaction.boothAgent.create({
      data: { boothId, staffId, workStartTime, workEndTime },
      select: { id: true },
    });
    outcome = "CREATED";
  }

  const saved = await transaction.boothAgent.findUniqueOrThrow({
    where: { boothId_staffId: { boothId, staffId } },
    select: selectRequest(new Date()),
  });

  if (saved.status === "APPROVED") return { ok: false, reason: "ALREADY_APPROVED" };

  return { ok: true, value: { outcome, request: serializeRequest(saved) } };
};

const saveAgentRequest = async (
  staffId: number,
  boothId: number,
  body: AgentRequestBody,
): Promise<SaveAgentRequestResult> => {
  for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        (transaction) => saveInTransaction(transaction, staffId, boothId, body),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (!isRetryableTransactionError(error)) throw error;
      if (attempt === MAX_TRANSACTION_ATTEMPTS - 1) {
        return { ok: false, reason: "REQUEST_CONFLICT" };
      }
    }
  }

  return { ok: false, reason: "REQUEST_CONFLICT" };
};

export { saveAgentRequest };
export type { SaveAgentRequestFailure, SaveAgentRequestResult };
