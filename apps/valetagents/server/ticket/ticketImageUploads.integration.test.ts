import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";

import type { PrismaClient } from "database";
import type { MerchantUploadStorage } from "@/server/merchantUploads/storage";
import type { completeTicketImageUpload as CompleteTicketImageUpload, reserveTicketImageUpload as ReserveTicketImageUpload } from "./ticketImageUploads";
import type { TicketImageUploadDependencies } from "./ticketImageUploads";
import type { cleanupExpiredTicketUploads as CleanupExpiredTicketUploads } from "./cleanupExpiredTicketUploads";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;

let prisma: PrismaClient;
let reserveTicketImageUpload: typeof ReserveTicketImageUpload;
let completeTicketImageUpload: typeof CompleteTicketImageUpload;
let cleanupExpiredTicketUploads: typeof CleanupExpiredTicketUploads;
const fixtureIds = { staff: [] as number[] };

const requireTestDatabaseUrl = () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL is required for ticket upload integration tests");
  const databaseName = new URL(value).pathname.replace(/^\//, "");
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(`Refusing to mutate database without a test name: ${databaseName}`);
  }
  return value;
};

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  ({ reserveTicketImageUpload, completeTicketImageUpload } = await import("./ticketImageUploads"));
  ({ cleanupExpiredTicketUploads } = await import("./cleanupExpiredTicketUploads"));
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.ticketImageUpload.deleteMany({ where: { staffId: { in: fixtureIds.staff } } });
  await prisma.merchant.deleteMany({ where: { adminId: { in: fixtureIds.staff } } });
  await prisma.staff.deleteMany({ where: { id: { in: fixtureIds.staff } } });
  await prisma.$disconnect();
});

describe("ticket image upload database integration", () => {
  it("reserves a private staging key and completes the same owned upload into an immutable final asset", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const [owner, other] = await Promise.all(["owner", "other"].map((name) => prisma.staff.create({
      data: { role: "MERCHANT_ADMIN", name: `ticket-upload-${name}-${suffix}` },
      select: { id: true },
    })));
    fixtureIds.staff.push(owner.id, other.id);
    const merchant = await prisma.merchant.create({
      data: { adminId: owner.id, name: `ticket-upload-${suffix}`, address: "서울시 테스트구" },
      select: { id: true },
    });
    const removedKeys: string[] = [];
    const activeStagingKeys = new Set<string>();
    let failStagingDelete = false;
    const storage: MerchantUploadStorage = {
      createUploadPost: async ({ key }) => ({ url: "https://upload.test", fields: { key } }),
      inspectObject: async (key, expected) => ({ ...expected, key, etag: "source-etag", metadata: {} }),
      copyUpload: async () => ({ etag: "final-etag" }),
      deleteObject: async ({ key }) => {
        if (failStagingDelete) {
          failStagingDelete = false;
          throw new Error("temporary deletion error");
        }
        removedKeys.push(key);
        activeStagingKeys.delete(key);
      },
    };
    const dependencies: TicketImageUploadDependencies = {
      database: prisma,
      createStorage: () => storage,
      now: () => new Date("2026-10-15T00:00:00.000Z"),
    };
    const reserved = await reserveTicketImageUpload({
      staffId: owner.id,
      merchantId: merchant.id,
      contentType: "image/png",
      size: 32,
    }, dependencies);
    expect(reserved.kind).toBe("RESERVED");
    if (reserved.kind !== "RESERVED") return;
    expect(reserved.upload.fields.key).toMatch(new RegExp(`^tickets/staging/${owner.id}/${merchant.id}/`));

    await expect(completeTicketImageUpload({ staffId: other.id, uploadId: reserved.uploadId }, dependencies))
      .resolves.toEqual({ kind: "FORBIDDEN" });
    failStagingDelete = true;
    const completed = await completeTicketImageUpload({ staffId: owner.id, uploadId: reserved.uploadId }, dependencies);
    expect(completed).toEqual({ kind: "COMPLETE", assetPath: reserved.upload.fields.key.replace("tickets/staging/", "tickets/final/") });
    if (completed.kind !== "COMPLETE") return;
    await expect(prisma.ticketImageUpload.findUniqueOrThrow({ where: { id: reserved.uploadId } }))
      .resolves.toMatchObject({ state: "COMPLETE", finalKey: completed.assetPath, finalETag: "final-etag" });
    await expect(completeTicketImageUpload({ staffId: owner.id, uploadId: reserved.uploadId }, dependencies))
      .resolves.toEqual(completed);
    expect(removedKeys).toEqual([]);
    activeStagingKeys.add(reserved.upload.fields.key);
    await expect(prisma.ticketImageUpload.findUniqueOrThrow({ where: { id: reserved.uploadId } }))
      .resolves.toMatchObject({ state: "COMPLETE", stagingDeletedAt: null });

    const expiredId = randomUUID();
    const expiredStagingKey = "tickets/staging/" + owner.id + "/" + merchant.id + "/" + expiredId + ".png";
    await prisma.ticketImageUpload.create({
      data: {
        id: expiredId,
        merchantId: merchant.id,
        staffId: owner.id,
        stagingKey: expiredStagingKey,
        finalKey: "tickets/final/" + owner.id + "/" + merchant.id + "/" + expiredId + ".png",
        contentType: "image/png",
        size: 32,
        expiresAt: new Date("2026-10-14T00:00:00.000Z"),
      },
    });
    await expect(
      cleanupExpiredTicketUploads(
        { dryRun: false, batchSize: 10 },
        {
          database: prisma,
          storage: {
            deleteObject: async ({ key }) => {
              removedKeys.push(key);
              activeStagingKeys.delete(key);
            },
          },
          now: () => new Date("2026-10-16T12:00:00.000Z"),
        },
      ),
    ).resolves.toMatchObject({ cleaned: 2, failed: 0, partial: false });
    await expect(prisma.ticketImageUpload.findUnique({ where: { id: reserved.uploadId } }))
      .resolves.toMatchObject({ state: "COMPLETE", stagingDeletedAt: new Date("2026-10-16T12:00:00.000Z") });
    await expect(prisma.ticketImageUpload.findUnique({ where: { id: expiredId } })).resolves.toBeNull();
    expect(removedKeys).toContain(reserved.upload.fields.key);
    expect(removedKeys).toContain(expiredStagingKey);
    expect(activeStagingKeys.size).toBe(0);
    expect(removedKeys.every((key) => key.startsWith("tickets/staging/"))).toBe(true);
  });
});
