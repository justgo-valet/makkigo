import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { PrismaClient } from "database";
import type { prismaMerchantUploadSessionRepository as SessionRepository } from "@/server/merchantUploads/merchantUploadSessions";
import type * as RegisterMerchant from "./registerMerchant";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;
const MINUTE_MS = 60 * 1_000;
const HOUR_MS = 60 * MINUTE_MS;

let prisma: PrismaClient;
let registerMerchant: typeof RegisterMerchant;
let sessionRepository: typeof SessionRepository;
let boothId: number;
const fixtureIds = { booth: [] as number[], staff: [] as number[] };

const requireTestDatabaseUrl = () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL is required for merchant integration tests");

  const databaseName = new URL(value).pathname.replace(/^\//, "");
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(`Refusing to mutate database without a test name: ${databaseName}`);
  }
  return value;
};

const createDeferred = <T = void>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
};

const createSuffix = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createStorage = () => {
  const firstCopyStarted = createDeferred();
  const releaseFirstCopy = createDeferred();
  let copies = 0;
  let holdFirstCopy = false;
  let failCopies = false;

  return {
    firstCopyStarted: firstCopyStarted.promise,
    releaseFirstCopy: releaseFirstCopy.resolve,
    holdFirstCopy: () => {
      holdFirstCopy = true;
    },
    failCopies: () => {
      failCopies = true;
    },
    copyCount: () => copies,
    inspectObject: async (
      key: string,
      expected: { size: number; contentType: "image/jpeg" | "image/png" | "image/webp" },
    ) => ({ key, ...expected, etag: `"source-${key}"`, metadata: {} }),
    copyUpload: async (input: { uploadId: string }) => {
      copies += 1;
      if (failCopies) throw new Error("S3 unavailable");
      if (holdFirstCopy && copies === 1) {
        firstCopyStarted.resolve();
        await releaseFirstCopy.promise;
      }
      return { etag: `"final-${input.uploadId}"` };
    },
  };
};

const createSubmission = async (now: Date, uploadCount = 1) => {
  const suffix = createSuffix();
  const staff = await prisma.staff.create({
    data: { role: "MERCHANT_ADMIN", name: `integration-merchant-admin-${suffix}` },
    select: { id: true },
  });
  fixtureIds.staff.push(staff.id);
  const session = await prisma.merchantRegistrationSession.create({
    data: { staffId: staff.id, expiresAt: new Date(now.getTime() + 24 * HOUR_MS) },
    select: { id: true },
  });
  const uploadIds: string[] = [];
  for (let slot = 0; slot < uploadCount; slot += 1) {
    const upload = await prisma.merchantImageUpload.create({
      data: {
        sessionId: session.id,
        slot,
        stagingKey: `integration/staging/${suffix}/${slot}.jpg`,
        finalKey: `integration/final/${suffix}/${slot}.jpg`,
        declaredMimeType: "image/jpeg",
        declaredSize: 3,
        expiresAt: new Date(now.getTime() + 5 * MINUTE_MS),
      },
      select: { id: true },
    });
    uploadIds.push(upload.id);
  }
  const payload = registerMerchant.canonicalizeRegistration({
    sessionId: session.id,
    name: `integration-merchant-${suffix}`,
    roadAddress: "서울특별시 중구 세종대로 110",
    addressDetail: null,
    postalCode: "04524",
    latitude: 37.5666805,
    longitude: 126.9784147,
    boothId,
    uploadIds,
  });
  return {
    staffId: staff.id,
    sessionId: session.id,
    uploadIds,
    request: {
      staffId: staff.id,
      idempotencyKey: `integration-key-${suffix}`,
      payload,
      payloadHash: registerMerchant.hashRegistrationPayload(payload),
    },
  };
};

const createService = (storage: ReturnType<typeof createStorage>, clock: { now: Date }) =>
  registerMerchant.createMerchantRegistrationService({
    repository: registerMerchant.prismaMerchantRegistrationRepository,
    storage,
    now: () => clock.now,
  });

const findMerchants = (staffId: number) =>
  prisma.merchant.findMany({
    where: { adminId: staffId },
    select: {
      id: true,
      photos: { orderBy: { sortOrder: "asc" }, select: { path: true, sortOrder: true } },
      booths: { select: { boothId: true, status: true } },
    },
  });

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  registerMerchant = await import("./registerMerchant");
  ({ prismaMerchantUploadSessionRepository: sessionRepository } = await import(
    "@/server/merchantUploads/merchantUploadSessions"
  ));

  const suffix = createSuffix();
  const creator = await prisma.staff.create({
    data: { role: "VALET_AGENT", name: `integration-booth-creator-${suffix}` },
    select: { id: true },
  });
  const booth = await prisma.booth.create({
    data: { creatorId: creator.id, name: `integration-booth-${suffix}`, address: "서울시 테스트구" },
    select: { id: true },
  });
  boothId = booth.id;
  fixtureIds.staff.push(creator.id);
  fixtureIds.booth.push(booth.id);
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.merchantRegistrationSession.deleteMany({
    where: { staffId: { in: fixtureIds.staff } },
  });
  await prisma.boothMerchant.deleteMany({ where: { boothId: { in: fixtureIds.booth } } });
  await prisma.merchant.deleteMany({ where: { adminId: { in: fixtureIds.staff } } });
  await prisma.booth.deleteMany({ where: { id: { in: fixtureIds.booth } } });
  await prisma.staff.deleteMany({ where: { id: { in: fixtureIds.staff } } });
  await prisma.$disconnect();
});

describe("merchant registration database integration", () => {
  it("creates one merchant with ordered photos and a single pending booth link", async () => {
    const clock = { now: new Date() };
    const submission = await createSubmission(clock.now, 3);
    const service = createService(createStorage(), clock);

    const outcome = await service.register(submission.request);

    expect(outcome.kind).toBe("CREATED");
    const merchants = await findMerchants(submission.staffId);
    expect(merchants).toHaveLength(1);
    expect(merchants[0]?.photos.map(({ sortOrder }) => sortOrder)).toEqual([0, 1, 2]);
    expect(merchants[0]?.photos.map(({ path }) => path.split("/").at(-1))).toEqual([
      "0.jpg",
      "1.jpg",
      "2.jpg",
    ]);
    expect(merchants[0]?.booths).toEqual([{ boothId, status: "PENDING" }]);
    await expect(
      prisma.merchantImageUpload.findMany({
        where: { sessionId: submission.sessionId },
        select: { state: true },
      }),
    ).resolves.toEqual([{ state: "ATTACHED" }, { state: "ATTACHED" }, { state: "ATTACHED" }]);
  });

  it("answers concurrent and repeated identical submissions with one merchant", async () => {
    const clock = { now: new Date() };
    const submission = await createSubmission(clock.now);
    const storage = createStorage();
    storage.holdFirstCopy();
    const service = createService(storage, clock);

    const first = service.register(submission.request);
    await storage.firstCopyStarted;
    await expect(service.register(submission.request)).resolves.toEqual({
      kind: "PROCESSING",
      sessionId: submission.sessionId,
    });
    storage.releaseFirstCopy();
    const created = await first;
    const repeated = await service.register(submission.request);

    expect(created.kind).toBe("CREATED");
    const merchants = await findMerchants(submission.staffId);
    expect(merchants).toHaveLength(1);
    expect(repeated).toEqual({
      kind: "REPLAY",
      result: expect.objectContaining({ merchantId: merchants[0]?.id }),
    });
    expect(storage.copyCount()).toBe(1);
    await expect(
      registerMerchant.prismaMerchantRegistrationRepository.findExisting(submission.request),
    ).resolves.toEqual({
      kind: "REPLAY",
      result: expect.objectContaining({ merchantId: merchants[0]?.id }),
    });
  });

  it("lets simultaneous identical submissions settle on one merchant without an error", async () => {
    const clock = { now: new Date() };
    const submission = await createSubmission(clock.now);
    const service = createService(createStorage(), clock);

    const outcomes = await Promise.all(
      Array.from({ length: 4 }, () => service.register(submission.request)),
    );

    expect(outcomes.filter(({ kind }) => kind === "CREATED")).toHaveLength(1);
    expect(
      outcomes.every(({ kind }) => ["CREATED", "PROCESSING", "REPLAY"].includes(kind)),
    ).toBe(true);
    await expect(findMerchants(submission.staffId)).resolves.toHaveLength(1);
  });

  it("fails a retried submission whose booth was removed after the first attempt", async () => {
    const clock = { now: new Date() };
    const submission = await createSubmission(clock.now);
    const removed = await prisma.booth.create({
      data: {
        creatorId: fixtureIds.staff[0],
        name: `integration-removed-${createSuffix()}`,
        address: "서울시 테스트구",
      },
      select: { id: true },
    });
    fixtureIds.booth.push(removed.id);
    const payload = { ...submission.request.payload, boothId: removed.id };
    const request = {
      ...submission.request,
      payload,
      payloadHash: registerMerchant.hashRegistrationPayload(payload),
    };
    const failing = createStorage();
    failing.failCopies();

    await expect(createService(failing, clock).register(request)).resolves.toMatchObject({
      kind: "RETRYABLE",
    });
    await prisma.booth.update({ where: { id: removed.id }, data: { deletedAt: clock.now } });

    await expect(createService(createStorage(), clock).register(request)).resolves.toEqual({
      kind: "TERMINAL",
      sessionId: submission.sessionId,
    });
    await expect(
      sessionRepository.createOrResume({ staffId: submission.staffId, now: clock.now }),
    ).resolves.toMatchObject({ kind: "OPEN", resumed: false });
  });

  it("rejects a changed payload or a second key on a bound session", async () => {
    const clock = { now: new Date() };
    const submission = await createSubmission(clock.now);
    const service = createService(createStorage(), clock);
    await service.register(submission.request);

    const changed = { ...submission.request.payload, name: "changed" };
    await expect(
      registerMerchant.prismaMerchantRegistrationRepository.findExisting({
        ...submission.request,
        payloadHash: registerMerchant.hashRegistrationPayload(changed),
      }),
    ).resolves.toEqual({ kind: "CONFLICT", sessionId: submission.sessionId });
    await expect(
      service.register({ ...submission.request, idempotencyKey: "integration-other-key" }),
    ).resolves.toEqual({ kind: "CONFLICT", sessionId: submission.sessionId });
    await expect(findMerchants(submission.staffId)).resolves.toHaveLength(1);
  });

  it("keeps a worker whose lease expired from publishing after a takeover", async () => {
    const clock = { now: new Date() };
    const submission = await createSubmission(clock.now);
    const storage = createStorage();
    storage.holdFirstCopy();
    const service = createService(storage, clock);

    const stale = service.register(submission.request);
    await storage.firstCopyStarted;
    clock.now = new Date(clock.now.getTime() + 3 * MINUTE_MS);
    const takeover = await service.register(submission.request);
    storage.releaseFirstCopy();

    expect(takeover.kind).toBe("CREATED");
    await expect(stale).resolves.toEqual({ kind: "PROCESSING", sessionId: submission.sessionId });
    await expect(findMerchants(submission.staffId)).resolves.toHaveLength(1);
  });

  it("fails the submission when the owner is still waiting for approval at commit", async () => {
    const clock = { now: new Date() };
    const submission = await createSubmission(clock.now);
    await prisma.merchant.create({
      data: { adminId: submission.staffId, name: "integration-pending", address: "서울시 테스트구" },
    });
    const service = createService(createStorage(), clock);

    await expect(service.register(submission.request)).resolves.toEqual({
      kind: "TERMINAL",
      sessionId: submission.sessionId,
    });
    await expect(findMerchants(submission.staffId)).resolves.toHaveLength(1);
    await expect(
      prisma.merchantImageUpload.findMany({
        where: { sessionId: submission.sessionId },
        select: { state: true },
      }),
    ).resolves.toEqual([{ state: "TOMBSTONED" }]);
  });

  it("drops reservations the submission left out instead of rejecting it", async () => {
    const clock = { now: new Date() };
    const submission = await createSubmission(clock.now, 3);
    const uploadIds = submission.uploadIds.slice(0, 2);
    const payload = { ...submission.request.payload, uploadIds };
    const service = createService(createStorage(), clock);

    const outcome = await service.register({
      ...submission.request,
      payload,
      payloadHash: registerMerchant.hashRegistrationPayload(payload),
    });

    expect(outcome.kind).toBe("CREATED");
    await expect(
      prisma.merchantImageUpload.findMany({
        where: { sessionId: submission.sessionId },
        orderBy: { slot: "asc" },
        select: { state: true },
      }),
    ).resolves.toEqual([{ state: "ATTACHED" }, { state: "ATTACHED" }, { state: "REVOKED" }]);
  });

  it("drops reservations left by an earlier visit when the open session is resumed", async () => {
    const clock = { now: new Date() };
    const submission = await createSubmission(clock.now, 5);

    const resumed = await sessionRepository.createOrResume({
      staffId: submission.staffId,
      now: clock.now,
    });

    expect(resumed).toMatchObject({ kind: "OPEN", resumed: true });
    const reserved = await sessionRepository.reserve({
      staffId: submission.staffId,
      sessionId: submission.sessionId,
      uploadId: crypto.randomUUID(),
      refresh: false,
      contentType: "image/jpeg",
      size: 3,
      now: clock.now,
    });
    expect(reserved).toMatchObject({ kind: "RESERVED", upload: { slot: 0 } });
  });

  it("releases the owner slot when a retryable submission passes its expiry", async () => {
    const clock = { now: new Date() };
    const submission = await createSubmission(clock.now);
    const storage = createStorage();
    storage.failCopies();
    const service = createService(storage, clock);

    await expect(service.register(submission.request)).resolves.toEqual({
      kind: "RETRYABLE",
      sessionId: submission.sessionId,
    });
    clock.now = new Date(clock.now.getTime() + 25 * HOUR_MS);
    await expect(service.register(submission.request)).resolves.toEqual({
      kind: "EXPIRED",
      sessionId: submission.sessionId,
    });

    const next = await sessionRepository.createOrResume({
      staffId: submission.staffId,
      now: clock.now,
    });
    expect(next).toMatchObject({ kind: "OPEN", resumed: false });
    await expect(findMerchants(submission.staffId)).resolves.toHaveLength(0);
  });
});
