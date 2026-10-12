import "server-only";

import { createHash } from "node:crypto";

import { Prisma, prisma } from "database";

import { terminalizeExpiredSession } from "@/server/merchantUploads/merchantUploadSessions";
import {
  StaleMerchantUploadError,
  isMissingObjectError,
} from "@/server/merchantUploads/s3MerchantUploadStorage";

import type { MerchantRegistrationBody } from "@/libs/merchant/contracts/registration";
import type { MerchantUploadStorage } from "@/server/merchantUploads/storage";

const REGISTRATION_LEASE_MS = 2 * 60 * 1_000;
const MAX_TRANSACTION_ATTEMPTS = 3;

type CanonicalRegistrationPayload = MerchantRegistrationBody;

type RegistrationResult = {
  sessionId: string;
  merchantId: number;
  statusUrl: string;
};

type ExistingRegistration =
  | { kind: "NONE" }
  | { kind: "CONFLICT"; sessionId: string }
  | { kind: "REPLAY"; result: RegistrationResult };

type RegistrationUpload = {
  id: string;
  state: "CLAIMED" | "COPYING" | "VALIDATED";
  stagingKey: string;
  finalKey: string;
  declaredMimeType: "image/jpeg" | "image/png" | "image/webp";
  declaredSize: number;
  sourceETag: string | null;
  finalETag: string | null;
};

type PreparedRegistration =
  | { kind: "REPLAY"; result: RegistrationResult }
  | { kind: "PROCESSING"; sessionId: string }
  | { kind: "CONFLICT"; sessionId: string }
  | { kind: "EXPIRED"; sessionId: string }
  | { kind: "UPLOAD_EXPIRED"; sessionId: string }
  | { kind: "TERMINAL"; sessionId: string }
  | { kind: "INVALID"; sessionId: string }
  | { kind: "SESSION_NOT_FOUND" }
  | { kind: "SESSION_FORBIDDEN" }
  | { kind: "BOOTH_NOT_FOUND" }
  | { kind: "UPLOAD_FORBIDDEN" }
  | {
      kind: "PREPARED";
      sessionId: string;
      generation: number;
      uploads: RegistrationUpload[];
    };

type CommitRegistration =
  | { kind: "COMMITTED"; result: RegistrationResult }
  | { kind: "STALE" }
  | { kind: "TERMINAL"; reason: string };

type RegisterMerchantOutcome =
  | { kind: "CREATED"; result: RegistrationResult }
  | { kind: "REPLAY"; result: RegistrationResult }
  | { kind: "PROCESSING"; sessionId: string }
  | { kind: "RETRYABLE"; sessionId: string }
  | { kind: "CONFLICT"; sessionId: string }
  | { kind: "EXPIRED"; sessionId: string }
  | { kind: "UPLOAD_EXPIRED"; sessionId: string }
  | { kind: "TERMINAL"; sessionId: string }
  | { kind: "INVALID"; sessionId: string }
  | { kind: "SESSION_NOT_FOUND" }
  | { kind: "SESSION_FORBIDDEN" }
  | { kind: "BOOTH_NOT_FOUND" }
  | { kind: "UPLOAD_FORBIDDEN" };

interface MerchantRegistrationRepository {
  findExisting(input: {
    staffId: number;
    idempotencyKey: string;
    payloadHash: string;
  }): Promise<ExistingRegistration>;
  prepare(input: {
    staffId: number;
    idempotencyKey: string;
    payload: CanonicalRegistrationPayload;
    payloadHash: string;
    now: Date;
    leaseUntil: Date;
  }): Promise<PreparedRegistration>;
  recordSource(input: {
    sessionId: string;
    generation: number;
    uploadId: string;
    sourceETag: string;
    now: Date;
  }): Promise<boolean>;
  recordValidated(input: {
    sessionId: string;
    generation: number;
    uploadId: string;
    finalETag: string;
    now: Date;
  }): Promise<boolean>;
  commit(input: {
    staffId: number;
    sessionId: string;
    generation: number;
    payload: CanonicalRegistrationPayload;
    now: Date;
  }): Promise<CommitRegistration>;
  markRetryable(input: { sessionId: string; generation: number }): Promise<boolean>;
  markFailed(input: {
    sessionId: string;
    generation: number;
    now: Date;
    outcome: string;
  }): Promise<boolean>;
}

const statusUrlFor = (sessionId: string) =>
  `/api/v1/merchant-registration-sessions/${sessionId}`;

const canonicalizeRegistration = (
  body: MerchantRegistrationBody,
): CanonicalRegistrationPayload => ({
  sessionId: body.sessionId,
  name: body.name,
  roadAddress: body.roadAddress,
  addressDetail: body.addressDetail,
  postalCode: body.postalCode,
  latitude: body.latitude,
  longitude: body.longitude,
  boothId: body.boothId,
  uploadIds: [...body.uploadIds],
});

const hashRegistrationPayload = (payload: CanonicalRegistrationPayload) =>
  createHash("sha256").update(JSON.stringify(payload)).digest("hex");

const getMerchantRegistrationActorRole = async (staffId: number) => {
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, deletedAt: null },
    select: { role: true },
  });
  return staff?.role ?? null;
};

const parseReplayResponse = (
  sessionId: string,
  merchantId: number | null,
  replayResponse: unknown,
): RegistrationResult | null => {
  if (
    !replayResponse ||
    typeof replayResponse !== "object" ||
    !("merchantId" in replayResponse) ||
    typeof replayResponse.merchantId !== "number"
  ) {
    return merchantId === null
      ? null
      : { sessionId, merchantId, statusUrl: statusUrlFor(sessionId) };
  }
  return {
    sessionId,
    merchantId: replayResponse.merchantId,
    statusUrl: statusUrlFor(sessionId),
  };
};

const isWriteConflictCause = (cause: unknown) =>
  typeof cause === "object" &&
  cause !== null &&
  "kind" in cause &&
  cause.kind === "TransactionWriteConflict";

const isRetryableTransactionError = (error: unknown) => {
  if (typeof error !== "object" || error === null) return false;
  if ("name" in error && error.name === "DriverAdapterError" && "cause" in error) {
    return isWriteConflictCause(error.cause);
  }
  if (!("code" in error)) return false;
  if (error.code === "P2034") return true;
  if (error.code !== "P2010" || !("meta" in error)) return false;

  const { meta } = error;
  if (typeof meta !== "object" || meta === null || !("driverAdapterError" in meta)) return false;
  const { driverAdapterError } = meta;
  return (
    typeof driverAdapterError === "object" &&
    driverAdapterError !== null &&
    "cause" in driverAdapterError &&
    isWriteConflictCause(driverAdapterError.cause)
  );
};

const isDefinitiveUploadError = (error: unknown) =>
  error instanceof StaleMerchantUploadError ||
  isMissingObjectError(error) ||
  (error instanceof Error &&
    (error.message.includes("metadata does not match") ||
      error.message.includes("signature does not match") ||
      error.message.includes("immutable upload manifest")));

const runSerializable = async <T>(work: (transaction: Prisma.TransactionClient) => Promise<T>) => {
  for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (!isRetryableTransactionError(error) || attempt === MAX_TRANSACTION_ATTEMPTS - 1) {
        throw error;
      }
    }
  }
  throw new Error("Serializable transaction retry budget exhausted");
};

const prismaMerchantRegistrationRepository: MerchantRegistrationRepository = {
  async findExisting({ staffId, idempotencyKey, payloadHash }) {
    const existing = await prisma.merchantRegistrationSession.findUnique({
      where: { staffId_idempotencyKey: { staffId, idempotencyKey } },
      select: {
        id: true,
        state: true,
        payloadHash: true,
        merchantId: true,
        replayResponse: true,
      },
    });
    if (!existing) return { kind: "NONE" };
    if (existing.payloadHash !== payloadHash) {
      return { kind: "CONFLICT", sessionId: existing.id };
    }
    if (existing.state !== "COMMITTED") return { kind: "NONE" };
    const result = parseReplayResponse(existing.id, existing.merchantId, existing.replayResponse);
    if (!result) throw new Error("Committed registration is missing its durable replay result");
    return { kind: "REPLAY", result };
  },

  async prepare({ staffId, idempotencyKey, payload, payloadHash, now, leaseUntil }) {
    return runSerializable(async (transaction) => {
      await transaction.$queryRaw(Prisma.sql`
        SELECT "id" FROM "merchant_registration_sessions"
        WHERE "id" = ${payload.sessionId}::uuid FOR UPDATE
      `);
      const session = await transaction.merchantRegistrationSession.findUnique({
        where: { id: payload.sessionId },
      });
      if (!session) return { kind: "SESSION_NOT_FOUND" as const };
      if (session.staffId !== staffId) return { kind: "SESSION_FORBIDDEN" as const };
      if (session.idempotencyKey && session.idempotencyKey !== idempotencyKey) {
        return { kind: "CONFLICT" as const, sessionId: session.id };
      }
      if (session.payloadHash && session.payloadHash !== payloadHash) {
        return { kind: "CONFLICT" as const, sessionId: session.id };
      }
      if (session.state === "COMMITTED") {
        const result = parseReplayResponse(session.id, session.merchantId, session.replayResponse);
        if (!result) throw new Error("Committed registration is missing its durable replay result");
        return { kind: "REPLAY" as const, result };
      }
      if (session.state === "FAILED") {
        return { kind: "TERMINAL" as const, sessionId: session.id };
      }
      if (session.state === "PROCESSING" && session.leaseUntil && session.leaseUntil > now) {
        return { kind: "PROCESSING" as const, sessionId: session.id };
      }
      if (session.state === "EXPIRED" || session.expiresAt <= now) {
        await terminalizeExpiredSession(transaction, session.id, now);
        return { kind: "EXPIRED" as const, sessionId: session.id };
      }

      if (session.state === "OPEN") {
        const booth = await transaction.booth.findFirst({
          where: { id: payload.boothId, deletedAt: null },
          select: { id: true },
        });
        if (!booth) return { kind: "BOOTH_NOT_FOUND" as const };
      }

      const uploads = await transaction.merchantImageUpload.findMany({
        where: { sessionId: session.id },
      });
      const requestedUploads = await transaction.merchantImageUpload.findMany({
        where: { id: { in: payload.uploadIds } },
        select: { id: true, sessionId: true, state: true, expiresAt: true },
      });
      if (requestedUploads.some((upload) => upload.sessionId !== session.id)) {
        return { kind: "UPLOAD_FORBIDDEN" as const };
      }
      if (requestedUploads.length !== payload.uploadIds.length) {
        return { kind: "INVALID" as const, sessionId: session.id };
      }
      if (
        requestedUploads.some(
          (upload) =>
            ["ATTACHED", "REVOKED", "TOMBSTONED"].includes(upload.state) ||
            (["RESERVED", "READY"].includes(upload.state) && upload.expiresAt <= now),
        )
      ) {
        return { kind: "UPLOAD_EXPIRED" as const, sessionId: session.id };
      }
      const requested = new Set(payload.uploadIds);
      const active = uploads.filter((upload) =>
        ["RESERVED", "READY", "CLAIMED", "COPYING", "VALIDATED"].includes(upload.state),
      );
      const unrequested = active.filter((upload) => !requested.has(upload.id));
      if (
        payload.uploadIds.some((id) => !active.some((upload) => upload.id === id)) ||
        (unrequested.length > 0 && session.state !== "OPEN") ||
        unrequested.some(({ state }) => state !== "RESERVED" && state !== "READY")
      ) {
        return { kind: "INVALID" as const, sessionId: session.id };
      }
      if (unrequested.length > 0) {
        await transaction.merchantImageUpload.updateMany({
          where: { id: { in: unrequested.map(({ id }) => id) } },
          data: { state: "REVOKED", nextSweepAt: now, lastOutcome: "NOT_SUBMITTED" },
        });
      }

      const generation = session.generation + 1;
      const frozen = await transaction.merchantRegistrationSession.updateMany({
        where: {
          id: session.id,
          generation: session.generation,
          state: { in: session.state === "OPEN" ? ["OPEN"] : ["PROCESSING", "RETRYABLE"] },
        },
        data: {
          state: "PROCESSING",
          idempotencyKey,
          canonicalPayload: payload as Prisma.InputJsonValue,
          payloadHash,
          generation,
          leaseUntil,
        },
      });
      if (frozen.count !== 1) return { kind: "PROCESSING" as const, sessionId: session.id };
      await transaction.merchantImageUpload.updateMany({
        where: { sessionId: session.id, id: { in: payload.uploadIds }, state: { in: ["RESERVED", "READY"] } },
        data: { state: "CLAIMED" },
      });
      const prepared = await transaction.merchantImageUpload.findMany({
        where: { sessionId: session.id, id: { in: payload.uploadIds } },
      });
      const byId = new Map(prepared.map((upload) => [upload.id, upload]));
      return {
        kind: "PREPARED" as const,
        sessionId: session.id,
        generation,
        uploads: payload.uploadIds.map((id) => {
          const upload = byId.get(id);
          if (!upload || !["CLAIMED", "COPYING", "VALIDATED"].includes(upload.state)) {
            throw new Error("Frozen upload manifest changed unexpectedly");
          }
          return {
            id: upload.id,
            state: upload.state as RegistrationUpload["state"],
            stagingKey: upload.stagingKey,
            finalKey: upload.finalKey,
            declaredMimeType: upload.declaredMimeType as RegistrationUpload["declaredMimeType"],
            declaredSize: upload.declaredSize,
            sourceETag: upload.sourceETag,
            finalETag: upload.finalETag,
          };
        }),
      };
    });
  },

  async recordSource({ sessionId, generation, uploadId, sourceETag, now }) {
    const result = await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(Prisma.sql`
        SELECT "id" FROM "merchant_registration_sessions"
        WHERE "id" = ${sessionId}::uuid FOR UPDATE
      `);
      const session = await transaction.merchantRegistrationSession.findFirst({
        where: { id: sessionId, state: "PROCESSING", generation, leaseUntil: { gt: now } },
        select: { id: true },
      });
      if (!session) return 0;
      const updated = await transaction.merchantImageUpload.updateMany({
        where: { id: uploadId, sessionId, state: "CLAIMED" },
        data: { sourceETag, state: "COPYING" },
      });
      return updated.count;
    });
    return result === 1;
  },

  async recordValidated({ sessionId, generation, uploadId, finalETag, now }) {
    const result = await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(Prisma.sql`
        SELECT "id" FROM "merchant_registration_sessions"
        WHERE "id" = ${sessionId}::uuid FOR UPDATE
      `);
      const session = await transaction.merchantRegistrationSession.findFirst({
        where: { id: sessionId, state: "PROCESSING", generation, leaseUntil: { gt: now } },
        select: { id: true },
      });
      if (!session) return 0;
      const updated = await transaction.merchantImageUpload.updateMany({
        where: { id: uploadId, sessionId, state: "COPYING" },
        data: { finalETag, state: "VALIDATED" },
      });
      return updated.count;
    });
    return result === 1;
  },

  async commit({ staffId, sessionId, generation, payload, now }) {
    return runSerializable(async (transaction) => {
      await transaction.$queryRaw(Prisma.sql`
        SELECT "id" FROM "merchant_registration_sessions"
        WHERE "id" = ${sessionId}::uuid FOR UPDATE
      `);
      const session = await transaction.merchantRegistrationSession.findUnique({
        where: { id: sessionId },
      });
      if (
        !session ||
        session.staffId !== staffId ||
        session.state !== "PROCESSING" ||
        session.generation !== generation ||
        !session.leaseUntil ||
        session.leaseUntil <= now
      ) {
        return { kind: "STALE" as const };
      }
      const staff = await transaction.staff.findFirst({
        where: { id: staffId, deletedAt: null },
        select: {
          role: true,
          merchants: {
            where: { deletedAt: null },
            select: {
              booths: {
                where: { status: "APPROVED", booth: { deletedAt: null } },
                select: { boothId: true },
              },
            },
          },
        },
      });
      if (!staff || staff.role !== "MERCHANT_ADMIN") {
        return { kind: "TERMINAL" as const, reason: "STAFF_NOT_ELIGIBLE" };
      }
      if (staff.merchants.length > 0 && !staff.merchants.some(({ booths }) => booths.length > 0)) {
        return { kind: "TERMINAL" as const, reason: "MERCHANT_APPROVAL_PENDING" };
      }
      const booth = await transaction.booth.findFirst({
        where: { id: payload.boothId, deletedAt: null },
        select: { id: true },
      });
      if (!booth) return { kind: "TERMINAL" as const, reason: "BOOTH_NOT_FOUND" };
      const uploads = await transaction.merchantImageUpload.findMany({
        where: { sessionId, id: { in: payload.uploadIds }, state: "VALIDATED" },
        select: { id: true, finalKey: true },
      });
      if (uploads.length !== payload.uploadIds.length) return { kind: "STALE" as const };
      const byId = new Map(uploads.map((upload) => [upload.id, upload]));
      const merchant = await transaction.merchant.create({
        data: {
          adminId: staffId,
          name: payload.name,
          address: payload.roadAddress,
          addressDetail: payload.addressDetail,
          postalCode: payload.postalCode,
          latitude: payload.latitude,
          longitude: payload.longitude,
          photos: {
            create: payload.uploadIds.map((uploadId, sortOrder) => ({
              path: byId.get(uploadId)!.finalKey,
              sortOrder,
            })),
          },
          booths: { create: { boothId: payload.boothId, status: "PENDING" } },
        },
        select: { id: true },
      });
      const attached = await transaction.merchantImageUpload.updateMany({
        where: { sessionId, id: { in: payload.uploadIds }, state: "VALIDATED" },
        data: { state: "ATTACHED" },
      });
      if (attached.count !== payload.uploadIds.length) throw new Error("Upload attachment CAS failed");
      const result: RegistrationResult = {
        sessionId,
        merchantId: merchant.id,
        statusUrl: statusUrlFor(sessionId),
      };
      const committed = await transaction.merchantRegistrationSession.updateMany({
        where: { id: sessionId, state: "PROCESSING", generation },
        data: {
          state: "COMMITTED",
          merchantId: merchant.id,
          replayResponse: result,
          leaseUntil: null,
        },
      });
      if (committed.count !== 1) throw new Error("Registration commit CAS failed");
      return { kind: "COMMITTED" as const, result };
    });
  },

  async markRetryable({ sessionId, generation }) {
    const retried = await prisma.merchantRegistrationSession.updateMany({
      where: { id: sessionId, state: "PROCESSING", generation },
      data: { state: "RETRYABLE", leaseUntil: null },
    });
    return retried.count === 1;
  },

  async markFailed({ sessionId, generation, now, outcome }) {
    return prisma.$transaction(async (transaction) => {
      const failed = await transaction.merchantRegistrationSession.updateMany({
        where: { id: sessionId, state: "PROCESSING", generation },
        data: { state: "FAILED", generation: { increment: 1 }, leaseUntil: null },
      });
      if (failed.count !== 1) return false;
      await transaction.merchantImageUpload.updateMany({
        where: { sessionId, state: { notIn: ["ATTACHED", "REVOKED", "TOMBSTONED"] } },
        data: { state: "TOMBSTONED", nextSweepAt: now, lastOutcome: outcome },
      });
      return true;
    });
  },
};

const createMerchantRegistrationService = (dependencies: {
  repository: MerchantRegistrationRepository;
  storage: Pick<MerchantUploadStorage, "inspectObject" | "copyUpload">;
  now?: () => Date;
}) => {
  const now = dependencies.now ?? (() => new Date());
  return {
    findExisting: (staffId: number, idempotencyKey: string, payloadHash: string) =>
      dependencies.repository.findExisting({ staffId, idempotencyKey, payloadHash }),

    async register(input: {
      staffId: number;
      idempotencyKey: string;
      payload: CanonicalRegistrationPayload;
      payloadHash: string;
    }): Promise<RegisterMerchantOutcome> {
      const startedAt = now();
      const prepared = await dependencies.repository.prepare({
        ...input,
        now: startedAt,
        leaseUntil: new Date(startedAt.getTime() + REGISTRATION_LEASE_MS),
      });
      if (prepared.kind !== "PREPARED") return prepared;

      try {
        for (const upload of prepared.uploads) {
          if (upload.state === "VALIDATED") continue;
          let sourceETag = upload.sourceETag;
          if (upload.state === "CLAIMED") {
            const source = await dependencies.storage.inspectObject(upload.stagingKey, {
              size: upload.declaredSize,
              contentType: upload.declaredMimeType,
            });
            sourceETag = source.etag;
            const recorded = await dependencies.repository.recordSource({
              sessionId: prepared.sessionId,
              generation: prepared.generation,
              uploadId: upload.id,
              sourceETag,
              now: now(),
            });
            if (!recorded) return { kind: "PROCESSING", sessionId: prepared.sessionId };
          }
          if (!sourceETag) throw new Error("Copying upload is missing its immutable source ETag");
          const final = await dependencies.storage.copyUpload({
            sourceKey: upload.stagingKey,
            destinationKey: upload.finalKey,
            sourceETag,
            contentType: upload.declaredMimeType,
            size: upload.declaredSize,
            sessionId: prepared.sessionId,
            uploadId: upload.id,
          });
          const recorded = await dependencies.repository.recordValidated({
            sessionId: prepared.sessionId,
            generation: prepared.generation,
            uploadId: upload.id,
            finalETag: final.etag,
            now: now(),
          });
          if (!recorded) return { kind: "PROCESSING", sessionId: prepared.sessionId };
        }
      } catch (error) {
        if (isDefinitiveUploadError(error)) {
          const failed = await dependencies.repository.markFailed({
            sessionId: prepared.sessionId,
            generation: prepared.generation,
            now: now(),
            outcome: "UPLOAD_VALIDATION_FAILED",
          });
          return {
            kind: failed ? "TERMINAL" : "PROCESSING",
            sessionId: prepared.sessionId,
          };
        }
        const retryable = await dependencies.repository.markRetryable({
          sessionId: prepared.sessionId,
          generation: prepared.generation,
        });
        return {
          kind: retryable ? "RETRYABLE" : "PROCESSING",
          sessionId: prepared.sessionId,
        };
      }

      const committed = await dependencies.repository.commit({
        staffId: input.staffId,
        sessionId: prepared.sessionId,
        generation: prepared.generation,
        payload: input.payload,
        now: now(),
      });
      if (committed.kind === "COMMITTED") return { kind: "CREATED", result: committed.result };
      if (committed.kind === "STALE") return { kind: "PROCESSING", sessionId: prepared.sessionId };
      const failed = await dependencies.repository.markFailed({
        sessionId: prepared.sessionId,
        generation: prepared.generation,
        now: now(),
        outcome: committed.reason,
      });
      return {
        kind: failed ? "TERMINAL" : "PROCESSING",
        sessionId: prepared.sessionId,
      };
    },
  };
};

export {
  canonicalizeRegistration,
  createMerchantRegistrationService,
  getMerchantRegistrationActorRole,
  hashRegistrationPayload,
  prismaMerchantRegistrationRepository,
  REGISTRATION_LEASE_MS,
  statusUrlFor,
};
export type {
  CanonicalRegistrationPayload,
  ExistingRegistration,
  MerchantRegistrationRepository,
  RegisterMerchantOutcome,
  RegistrationResult,
};
