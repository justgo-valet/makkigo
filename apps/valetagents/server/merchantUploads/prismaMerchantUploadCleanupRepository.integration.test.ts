import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { PrismaClient } from "database";
import type { prismaMerchantUploadCleanupRepository as CleanupRepository } from "./prismaMerchantUploadCleanupRepository";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;
const HOUR_MS = 60 * 60 * 1_000;

let prisma: PrismaClient;
let repository: typeof CleanupRepository;
const staffIds: number[] = [];

const requireTestDatabaseUrl = () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL is required for merchant integration tests");

  const databaseName = new URL(value).pathname.replace(/^\//, "");
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(`Refusing to mutate database without a test name: ${databaseName}`);
  }
  return value;
};

const createUpload = async (expiresAt: Date) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const staff = await prisma.staff.create({
    data: { role: "MERCHANT_ADMIN", name: `integration-cleanup-${suffix}` },
    select: { id: true },
  });
  staffIds.push(staff.id);
  const session = await prisma.merchantRegistrationSession.create({
    data: { staffId: staff.id, expiresAt },
    select: { id: true },
  });
  const upload = await prisma.merchantImageUpload.create({
    data: {
      sessionId: session.id,
      slot: 0,
      stagingKey: `integration/staging/${suffix}.jpg`,
      finalKey: `integration/final/${suffix}.jpg`,
      declaredMimeType: "image/jpeg",
      declaredSize: 3,
      expiresAt,
    },
    select: { id: true },
  });
  return { sessionId: session.id, uploadId: upload.id };
};

const claimOwn = async (uploadId: string, now: Date) => {
  const claimId = crypto.randomUUID();
  const claimed = await repository.claim({
    claimId,
    now,
    leaseUntil: new Date(now.getTime() + 1_000),
    limit: 100,
  });
  return { claimId, candidate: claimed.find(({ id }) => id === uploadId) };
};

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  ({ prismaMerchantUploadCleanupRepository: repository } = await import(
    "./prismaMerchantUploadCleanupRepository"
  ));
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.merchantRegistrationSession.deleteMany({ where: { staffId: { in: staffIds } } });
  await prisma.staff.deleteMany({ where: { id: { in: staffIds } } });
  await prisma.$disconnect();
});

describe("merchant upload cleanup database integration", () => {
  it("closes an abandoned session, sweeps its upload twice, then leaves it alone", async () => {
    const now = new Date();
    const abandoned = await createUpload(new Date(now.getTime() - HOUR_MS));
    const live = await createUpload(new Date(now.getTime() + HOUR_MS));

    await repository.expireSessions({ now, limit: 100 });

    await expect(
      prisma.merchantRegistrationSession.findUniqueOrThrow({ where: { id: abandoned.sessionId } }),
    ).resolves.toMatchObject({ state: "EXPIRED" });
    await expect(
      prisma.merchantImageUpload.findUniqueOrThrow({ where: { id: live.uploadId } }),
    ).resolves.toMatchObject({ state: "RESERVED" });

    const first = await claimOwn(abandoned.uploadId, now);
    expect(first.candidate).toMatchObject({ state: "TOMBSTONED", sweptBefore: false });
    const recheckAt = new Date(now.getTime() + HOUR_MS);
    await repository.complete({
      uploadId: abandoned.uploadId,
      claimId: first.claimId,
      state: "TOMBSTONED",
      now,
      nextSweepAt: recheckAt,
    });
    expect((await claimOwn(abandoned.uploadId, now)).candidate).toBeUndefined();

    const second = await claimOwn(abandoned.uploadId, recheckAt);
    expect(second.candidate).toMatchObject({ sweptBefore: true });
    await repository.complete({
      uploadId: abandoned.uploadId,
      claimId: second.claimId,
      state: "TOMBSTONED",
      now: recheckAt,
      nextSweepAt: null,
    });

    const later = new Date(recheckAt.getTime() + 24 * HOUR_MS);
    expect((await claimOwn(abandoned.uploadId, later)).candidate).toBeUndefined();
  });
});
