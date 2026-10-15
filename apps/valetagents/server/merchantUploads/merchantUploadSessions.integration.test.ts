import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { PrismaClient } from "database";
import type { prismaMerchantUploadSessionRepository as SessionRepository } from "./merchantUploadSessions";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;

let prisma: PrismaClient;
let repository: typeof SessionRepository;
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

const OVERLAP = 5;

const overlapping = async <Result>(call: () => Promise<Result>) => {
  await Promise.all(Array.from({ length: OVERLAP }, () => prisma.$queryRaw`SELECT 1`));
  return Promise.all(Array.from({ length: OVERLAP }, call));
};

const createStaff = async () => {
  const staff = await prisma.staff.create({
    data: {
      role: "MERCHANT_ADMIN",
      name: `integration-upload-session-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    },
    select: { id: true },
  });
  staffIds.push(staff.id);
  return staff.id;
};

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  ({ prismaMerchantUploadSessionRepository: repository } = await import("./merchantUploadSessions"));
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.merchantRegistrationSession.deleteMany({ where: { staffId: { in: staffIds } } });
  await prisma.staff.deleteMany({ where: { id: { in: staffIds } } });
  await prisma.$disconnect();
});

describe("merchant upload session database integration", () => {
  it("answers every overlapping session request and keeps one session", async () => {
    const staffId = await createStaff();
    const now = new Date();

    const results = await overlapping(() => repository.createOrResume({ staffId, now }));

    expect(results.map(({ kind }) => kind)).toEqual(Array.from({ length: OVERLAP }, () => "OPEN"));
    expect(new Set(results.map(({ session }) => session.id)).size).toBe(1);
  });

  it("gives overlapping photo reservations their own slots", async () => {
    const staffId = await createStaff();
    const now = new Date();
    const opened = await repository.createOrResume({ staffId, now });

    const results = await overlapping(() =>
      repository.reserve({
        staffId,
        sessionId: opened.session.id,
        uploadId: crypto.randomUUID(),
        refresh: false,
        contentType: "image/jpeg",
        size: 3,
        now,
      }),
    );

    expect(
      results.flatMap((result) => (result.kind === "RESERVED" ? [result.upload.slot] : [])).sort(),
    ).toEqual([0, 1, 2, 3, 4]);
  });

  it("extends a reservation when the session id arrives in upper case", async () => {
    const staffId = await createStaff();
    const now = new Date();
    const opened = await repository.createOrResume({ staffId, now });
    const reservation = {
      staffId,
      sessionId: opened.session.id.toUpperCase(),
      uploadId: crypto.randomUUID(),
      contentType: "image/jpeg" as const,
      size: 3,
      now,
    };

    const reserved = await repository.reserve({ ...reservation, refresh: false });
    expect(reserved).toMatchObject({
      kind: "RESERVED",
      upload: { stagingKey: expect.stringContaining(opened.session.id) },
    });
    await expect(repository.reserve({ ...reservation, refresh: true })).resolves.toMatchObject({
      kind: "RESERVED",
    });
  });

  it("keeps answering expired after a session has lapsed", async () => {
    const staffId = await createStaff();
    const now = new Date();
    const session = await prisma.merchantRegistrationSession.create({
      data: { staffId, expiresAt: new Date(now.getTime() - 1_000) },
      select: { id: true },
    });
    const reserve = () =>
      repository.reserve({
        staffId,
        sessionId: session.id,
        uploadId: crypto.randomUUID(),
        refresh: false,
        contentType: "image/jpeg",
        size: 3,
        now,
      });

    await expect(reserve()).resolves.toEqual({ kind: "SESSION_EXPIRED" });
    await expect(reserve()).resolves.toEqual({ kind: "SESSION_EXPIRED" });
  });
});
