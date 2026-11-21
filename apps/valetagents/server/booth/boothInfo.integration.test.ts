import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { updateBoothInfo as UpdateBoothInfo } from "./boothInfo";
import type { PrismaClient } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;

let prisma: PrismaClient;
let updateBoothInfo: typeof UpdateBoothInfo;
let managerId: number;
let agentId: number;
let boothId: number;
let otherBoothPhotoId: number;
const boothIds: number[] = [];

const requireTestDatabaseUrl = () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL is required for booth info integration tests");

  const databaseName = new URL(value).pathname.replace(/^\//, "");
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(`Refusing to mutate database without a test name: ${databaseName}`);
  }
  return value;
};

const INFO = { name: "새 부스 이름", address: "서울 강남구 테헤란로 1", addressDetail: "1층" };

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  ({ updateBoothInfo } = await import("./boothInfo"));

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  [managerId, agentId] = await Promise.all(
    ["manager", "agent"].map(
      async (label) =>
        (
          await prisma.staff.create({
            data: { role: "VALET_AGENT", name: `integration-booth-info-${label}-${suffix}` },
            select: { id: true },
          })
        ).id,
    ),
  );
  const booth = await prisma.booth.create({
    data: {
      creatorId: managerId,
      name: `integration-booth-info-${suffix}`,
      address: "서울시 테스트구",
      agents: { create: [{ staffId: managerId, status: "APPROVED" }, { staffId: agentId, status: "APPROVED" }] },
      photos: { create: ["a", "b", "c"].map((name, sortOrder) => ({ path: `booths/final/${name}.jpg`, sortOrder })) },
    },
    select: { id: true },
  });
  const otherBooth = await prisma.booth.create({
    data: {
      creatorId: agentId,
      name: `integration-booth-info-other-${suffix}`,
      address: "서울시 테스트구",
      photos: { create: { path: "booths/final/other.jpg", sortOrder: 0 } },
    },
    select: { id: true, photos: { select: { id: true } } },
  });
  boothId = booth.id;
  otherBoothPhotoId = otherBooth.photos[0]!.id;
  boothIds.push(booth.id, otherBooth.id);
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.booth.deleteMany({ where: { id: { in: boothIds } } });
  await prisma.staff.deleteMany({ where: { id: { in: [managerId, agentId] } } });
  await prisma.$disconnect();
});

describe("updateBoothInfo database integration", () => {
  it("lets only the booth manager rename, move, and reorder, remove, or add photos", async () => {
    const photos = await prisma.boothPhoto.findMany({
      where: { boothId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, path: true },
    });
    const [first, second, third] = photos;

    await expect(
      updateBoothInfo(agentId, boothId, { ...INFO, keptPhotoIds: [] }, []),
    ).resolves.toEqual({ ok: false, reason: "BOOTH_MANAGER_REQUIRED" });
    await expect(
      updateBoothInfo(managerId, boothId, { ...INFO, keptPhotoIds: [otherBoothPhotoId] }, []),
    ).resolves.toEqual({ ok: false, reason: "PHOTO_NOT_FOUND" });

    await expect(
      updateBoothInfo(
        managerId,
        boothId,
        { ...INFO, keptPhotoIds: [third!.id, first!.id] },
        ["booths/final/new.jpg"],
      ),
    ).resolves.toEqual({ ok: true, removedPhotoPaths: [second!.path] });

    const booth = await prisma.booth.findUniqueOrThrow({
      where: { id: boothId },
      select: {
        name: true,
        address: true,
        addressDetail: true,
        photos: { orderBy: { sortOrder: "asc" }, select: { path: true, sortOrder: true } },
      },
    });
    expect(booth).toEqual({
      ...INFO,
      photos: [
        { path: third!.path, sortOrder: 0 },
        { path: first!.path, sortOrder: 1 },
        { path: "booths/final/new.jpg", sortOrder: 2 },
      ],
    });
  });
});
