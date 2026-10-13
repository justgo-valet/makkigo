import "server-only";

import { randomUUID } from "node:crypto";

import { Prisma, prisma } from "database";

import { activeMerchantRegistrationSessionStates } from "@/libs/merchant/contracts/registration-session";
import { runSerializable } from "@/server/common/runSerializable";

import type { MerchantImageMimeType } from "@/libs/merchant/contracts/image-upload";
import type { MerchantRegistrationSessionState } from "@/libs/merchant/contracts/registration-session";
import type { MerchantUploadStorage } from "./storage";

const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1_000;
const POST_LIFETIME_MS = 5 * 60 * 1_000;
const ACTIVE_SESSION_STATES = activeMerchantRegistrationSessionStates;
const LIVE_UPLOAD_STATES = [
  "RESERVED",
  "READY",
  "CLAIMED",
  "COPYING",
  "VALIDATED",
  "ATTACHED",
] as const;

const extensionForMimeType = (contentType: MerchantImageMimeType) => {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  return "webp";
};

const buildMerchantUploadKeys = (input: {
  staffId: number;
  sessionId: string;
  uploadId: string;
  contentType: MerchantImageMimeType;
}) => {
  const extension = extensionForMimeType(input.contentType);
  return {
    stagingKey: `merchants/staging/${input.staffId}/${input.sessionId}/${input.uploadId}.${extension}`,
    finalKey: `merchants/final/${input.staffId}/${input.sessionId}/${input.uploadId}.${extension}`,
  };
};

const statusUrlFor = (sessionId: string) =>
  `/api/v1/merchant-registration-sessions/${sessionId}`;

type SessionSummary = {
  id: string;
  state: MerchantRegistrationSessionState;
  expiresAt: Date;
  merchantId: number | null;
  replayResponse: unknown;
};

type SessionCreateResult =
  | { kind: "OPEN"; session: SessionSummary; resumed: boolean }
  | { kind: "UNRESOLVED"; session: SessionSummary };

type ReservationResult =
  | {
      kind: "RESERVED";
      upload: {
        id: string;
        slot: number;
        stagingKey: string;
        finalKey: string;
        expiresAt: Date;
      };
    }
  | {
      kind:
        | "NOT_FOUND"
        | "FORBIDDEN"
        | "SESSION_EXPIRED"
        | "SESSION_FROZEN"
        | "SLOTS_FULL"
        | "UPLOAD_NOT_FOUND"
        | "UPLOAD_FORBIDDEN"
        | "UPLOAD_NOT_REFRESHABLE"
        | "UPLOAD_MISMATCH";
    };

type RevokeResult =
  | { kind: "REVOKED"; uploadId: string }
  | {
      kind:
        | "SESSION_NOT_FOUND"
        | "SESSION_FORBIDDEN"
        | "UPLOAD_NOT_FOUND"
        | "UPLOAD_FORBIDDEN"
        | "SESSION_EXPIRED"
        | "SESSION_FROZEN"
        | "UPLOAD_NOT_REMOVABLE";
    };

interface MerchantUploadSessionRepository {
  createOrResume(input: { staffId: number; now: Date }): Promise<SessionCreateResult>;
  getOwned(input: { staffId: number; sessionId: string }): Promise<
    | { kind: "FOUND"; session: SessionSummary }
    | { kind: "NOT_FOUND" }
    | { kind: "FORBIDDEN" }
  >;
  reserve(input: {
    staffId: number;
    sessionId: string;
    uploadId: string;
    refresh: boolean;
    contentType: MerchantImageMimeType;
    size: number;
    now: Date;
  }): Promise<ReservationResult>;
  revoke(input: {
    staffId: number;
    sessionId: string;
    uploadId: string;
    now: Date;
  }): Promise<RevokeResult>;
  abandonReservation(input: { uploadId: string; now: Date }): Promise<void>;
}

const expirableSessionWhere = (now: Date) =>
  ({
    expiresAt: { lte: now },
    OR: [
      { state: { in: ["OPEN", "RETRYABLE"] } },
      { state: "PROCESSING", OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] },
    ],
  }) satisfies Prisma.MerchantRegistrationSessionWhereInput;

const terminalizeExpiredSession = async (
  transaction: Prisma.TransactionClient,
  sessionId: string,
  now: Date,
) => {
  const expired = await transaction.merchantRegistrationSession.updateMany({
    where: { id: sessionId, ...expirableSessionWhere(now) },
    data: { state: "EXPIRED", generation: { increment: 1 }, leaseUntil: null },
  });
  if (expired.count !== 1) return false;
  await transaction.merchantImageUpload.updateMany({
    where: { sessionId, state: { notIn: ["ATTACHED", "REVOKED", "TOMBSTONED"] } },
    data: { state: "TOMBSTONED", nextSweepAt: now, lastOutcome: "SESSION_EXPIRED" },
  });
  return true;
};

const prismaMerchantUploadSessionRepository: MerchantUploadSessionRepository = {
  async createOrResume({ staffId, now }) {
    return runSerializable(
      async (transaction) => {
        await transaction.$queryRaw(Prisma.sql`
          SELECT "id" FROM "staff" WHERE "id" = ${staffId} FOR UPDATE
        `);
        const active = await transaction.merchantRegistrationSession.findFirst({
          where: { staffId, state: { in: [...ACTIVE_SESSION_STATES] } },
          orderBy: { createdAt: "desc" },
        });
        const expired =
          active && active.expiresAt <= now
            ? await terminalizeExpiredSession(transaction, active.id, now)
            : false;
        if (active && !expired) {
          if (active.state !== "OPEN") return { kind: "UNRESOLVED" as const, session: active };
          await transaction.merchantImageUpload.updateMany({
            where: { sessionId: active.id, state: { in: ["RESERVED", "READY"] } },
            data: { state: "REVOKED", nextSweepAt: now, lastOutcome: "SESSION_RESUMED" },
          });
          return { kind: "OPEN" as const, session: active, resumed: true };
        }

        const session = await transaction.merchantRegistrationSession.create({
          data: {
            staffId,
            expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS),
          },
        });
        return { kind: "OPEN" as const, session, resumed: false };
      },
      { retryUniqueViolation: true },
    );
  },

  async getOwned({ staffId, sessionId }) {
    const session = await prisma.merchantRegistrationSession.findUnique({ where: { id: sessionId } });
    if (!session) return { kind: "NOT_FOUND" };
    if (session.staffId !== staffId) return { kind: "FORBIDDEN" };
    return { kind: "FOUND", session };
  },

  async reserve({ staffId, sessionId, uploadId, refresh, contentType, size, now }) {
    return runSerializable(
      async (transaction) => {
        await transaction.$queryRaw(Prisma.sql`
          SELECT "id" FROM "merchant_registration_sessions"
          WHERE "id" = ${sessionId}::uuid FOR UPDATE
        `);
        const session = await transaction.merchantRegistrationSession.findUnique({
          where: { id: sessionId },
        });
        if (!session) return { kind: "NOT_FOUND" as const };
        if (session.staffId !== staffId) return { kind: "FORBIDDEN" as const };
        if (session.state === "OPEN" && session.expiresAt <= now) {
          await terminalizeExpiredSession(transaction, session.id, now);
          return { kind: "SESSION_EXPIRED" as const };
        }
        if (session.state !== "OPEN") return { kind: "SESSION_FROZEN" as const };

        const expiresAt = new Date(
          Math.min(session.expiresAt.getTime(), now.getTime() + POST_LIFETIME_MS),
        );
        if (refresh) {
          const upload = await transaction.merchantImageUpload.findUnique({
            where: { id: uploadId },
          });
          if (!upload) return { kind: "UPLOAD_NOT_FOUND" as const };
          if (upload.sessionId !== sessionId) return { kind: "UPLOAD_FORBIDDEN" as const };
          if (upload.state !== "RESERVED") return { kind: "UPLOAD_NOT_REFRESHABLE" as const };
          if (upload.declaredMimeType !== contentType || upload.declaredSize !== size) {
            return { kind: "UPLOAD_MISMATCH" as const };
          }
          const refreshed = await transaction.merchantImageUpload.update({
            where: { id: uploadId },
            data: { expiresAt },
          });
          return { kind: "RESERVED" as const, upload: refreshed };
        }

        const occupied = await transaction.merchantImageUpload.findMany({
          where: { sessionId, state: { in: [...LIVE_UPLOAD_STATES] } },
          select: { slot: true },
        });
        const occupiedSlots = new Set(occupied.map(({ slot }) => slot));
        const slot = [0, 1, 2, 3, 4].find((candidate) => !occupiedSlots.has(candidate));
        if (slot === undefined) return { kind: "SLOTS_FULL" as const };

        const { stagingKey, finalKey } = buildMerchantUploadKeys({
          staffId,
          sessionId,
          uploadId,
          contentType,
        });
        const upload = await transaction.merchantImageUpload.create({
          data: {
            id: uploadId,
            sessionId,
            slot,
            stagingKey,
            finalKey,
            declaredMimeType: contentType,
            declaredSize: size,
            expiresAt,
          },
        });
        return { kind: "RESERVED" as const, upload };
      },
      { retryUniqueViolation: true },
    );
  },

  async revoke({ staffId, sessionId, uploadId, now }) {
    return runSerializable(async (transaction) => {
      await transaction.$queryRaw(Prisma.sql`
        SELECT "id" FROM "merchant_registration_sessions"
        WHERE "id" = ${sessionId}::uuid FOR UPDATE
      `);
      const session = await transaction.merchantRegistrationSession.findUnique({
        where: { id: sessionId },
      });
      if (!session) return { kind: "SESSION_NOT_FOUND" as const };
      if (session.staffId !== staffId) return { kind: "SESSION_FORBIDDEN" as const };
      if (session.state === "OPEN" && session.expiresAt <= now) {
        await terminalizeExpiredSession(transaction, session.id, now);
        return { kind: "SESSION_EXPIRED" as const };
      }
      if (session.state !== "OPEN") return { kind: "SESSION_FROZEN" as const };

      const upload = await transaction.merchantImageUpload.findUnique({ where: { id: uploadId } });
      if (!upload) return { kind: "UPLOAD_NOT_FOUND" as const };
      if (upload.sessionId !== sessionId) return { kind: "UPLOAD_FORBIDDEN" as const };
      if (upload.state === "REVOKED") return { kind: "REVOKED" as const, uploadId };
      if (upload.state !== "RESERVED" && upload.state !== "READY") {
        return { kind: "UPLOAD_NOT_REMOVABLE" as const };
      }
      const revoked = await transaction.merchantImageUpload.updateMany({
        where: { id: uploadId, sessionId, state: { in: ["RESERVED", "READY"] } },
        data: { state: "REVOKED", nextSweepAt: now, lastOutcome: "REVOKED_BY_OWNER" },
      });
      return revoked.count === 1
        ? { kind: "REVOKED" as const, uploadId }
        : { kind: "UPLOAD_NOT_REMOVABLE" as const };
    });
  },

  async abandonReservation({ uploadId, now }) {
    await prisma.merchantImageUpload.updateMany({
      where: { id: uploadId, state: "RESERVED" },
      data: { state: "REVOKED", nextSweepAt: now, lastOutcome: "SIGNING_FAILED" },
    });
  },
};

const createMerchantUploadSessionService = (dependencies: {
  repository: MerchantUploadSessionRepository;
  storage?: Pick<MerchantUploadStorage, "createUploadPost">;
  now?: () => Date;
  createId?: () => string;
}) => {
  const now = dependencies.now ?? (() => new Date());
  const createId = dependencies.createId ?? randomUUID;
  return {
    createOrResume: (staffId: number) => dependencies.repository.createOrResume({ staffId, now: now() }),
    getOwned: (staffId: number, sessionId: string) =>
      dependencies.repository.getOwned({ staffId, sessionId }),
    revoke: (staffId: number, sessionId: string, uploadId: string) =>
      dependencies.repository.revoke({ staffId, sessionId, uploadId, now: now() }),
    async reserveAndSign(input: {
      staffId: number;
      sessionId: string;
      uploadId?: string;
      contentType: MerchantImageMimeType;
      size: number;
    }) {
      const reservedAt = now();
      const uploadId = input.uploadId ?? createId();
      const result = await dependencies.repository.reserve({
        ...input,
        uploadId,
        refresh: input.uploadId !== undefined,
        now: reservedAt,
      });
      if (result.kind !== "RESERVED") return result;
      const abandonNewReservation = async () => {
        if (input.uploadId !== undefined) return;
        await dependencies.repository.abandonReservation({
          uploadId: result.upload.id,
          now: now(),
        });
      };
      try {
        if (!dependencies.storage) throw new Error("Merchant upload storage is required");
        const remainingSeconds = Math.floor(
          (result.upload.expiresAt.getTime() - reservedAt.getTime()) / 1_000,
        );
        if (remainingSeconds < 1) {
          await abandonNewReservation();
          return { kind: "SESSION_EXPIRED" as const };
        }
        const post = await dependencies.storage.createUploadPost({
          key: result.upload.stagingKey,
          contentType: input.contentType,
          expiresInSeconds: Math.min(300, remainingSeconds),
        });
        return { kind: "SIGNED" as const, upload: result.upload, post };
      } catch (error) {
        await abandonNewReservation();
        throw error;
      }
    },
  };
};

const serializeSession = (session: SessionSummary) => ({
  sessionId: session.id,
  state: session.state,
  expiresAt: session.expiresAt.toISOString(),
  statusUrl: statusUrlFor(session.id),
  ...(session.merchantId === null ? {} : { merchantId: session.merchantId }),
  ...(session.replayResponse === null ? {} : { result: session.replayResponse }),
});

export {
  ACTIVE_SESSION_STATES,
  POST_LIFETIME_MS,
  SESSION_LIFETIME_MS,
  buildMerchantUploadKeys,
  createMerchantUploadSessionService,
  expirableSessionWhere,
  extensionForMimeType,
  prismaMerchantUploadSessionRepository,
  serializeSession,
  statusUrlFor,
  terminalizeExpiredSession,
};
export type {
  MerchantUploadSessionRepository,
  ReservationResult,
  RevokeResult,
  SessionCreateResult,
  SessionSummary,
};
