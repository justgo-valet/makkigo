import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { purgeIncompleteSignups as PurgeIncompleteSignups } from "./purgeIncompleteSignups";
import type { PrismaClient } from "database";

const auth = vi.hoisted(() => ({ revokeAppleRefreshToken: vi.fn().mockResolvedValue(true) }));
vi.mock("@makkigo/auth", () => auth);

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;
const DAY_MS = 24 * 60 * 60 * 1000;

let prisma: PrismaClient;
let purgeIncompleteSignups: typeof PurgeIncompleteSignups;
const fixtureUserIds: number[] = [];

const requireTestDatabaseUrl = () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL is required for purge integration tests");
  const databaseName = new URL(value).pathname.replace(/^\//, "");
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(`Refusing to mutate database without a test name: ${databaseName}`);
  }
  return value;
};

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  ({ purgeIncompleteSignups } = await import("./purgeIncompleteSignups"));
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.user.deleteMany({ where: { id: { in: fixtureUserIds } } });
  await prisma.$disconnect();
});

describe.skipIf(!process.env.TEST_DATABASE_URL)("incomplete signup purge integration", () => {
  it("deletes only users who never agreed to the required consents for 30 days", async () => {
    const now = new Date();
    const old = new Date(now.getTime() - 31 * DAY_MS);
    const recent = new Date(now.getTime() - 29 * DAY_MS);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const createUser = async (data: { createdAt: Date; deletedAt?: Date }) => {
      const user = await prisma.user.create({
        data: {
          ...data,
          socialAccounts: {
            create: {
              provider: "APPLE",
              providerUserId: `purge-${suffix}-${fixtureUserIds.length}`,
              providerRefreshToken: `refresh-${fixtureUserIds.length}`,
              providerClientId: "com.makkigo.user",
            },
          },
        },
      });
      fixtureUserIds.push(user.id);
      return user;
    };

    const [incomplete, agreed, optionalOnly, fresh, withdrawn] = [
      await createUser({ createdAt: old }),
      await createUser({ createdAt: old }),
      await createUser({ createdAt: old }),
      await createUser({ createdAt: recent }),
      await createUser({ createdAt: old, deletedAt: old }),
    ];

    await prisma.userConsent.createMany({
      data: [
        { userId: agreed.id, type: "TERMS_OF_SERVICE", agreed: true, documentVersion: "test" },
        {
          userId: optionalOnly.id,
          type: "LOCATION_BASED_SERVICE",
          agreed: true,
          documentVersion: "test",
        },
      ],
    });

    const result = await purgeIncompleteSignups(now);

    expect(result.purged).toBeGreaterThanOrEqual(2);
    const remainingIds = (
      await prisma.user.findMany({
        where: { id: { in: fixtureUserIds } },
        select: { id: true },
      })
    ).map(({ id }) => id);
    expect(remainingIds).toEqual(expect.arrayContaining([agreed.id, fresh.id, withdrawn.id]));
    expect(remainingIds).not.toContain(incomplete.id);
    expect(remainingIds).not.toContain(optionalOnly.id);
    expect(
      await prisma.userSocialAccount.count({
        where: { userId: { in: [incomplete.id, optionalOnly.id] } },
      }),
    ).toBe(0);
    expect(auth.revokeAppleRefreshToken).toHaveBeenCalledWith("refresh-0", "com.makkigo.user");
    expect(auth.revokeAppleRefreshToken).not.toHaveBeenCalledWith("refresh-1", "com.makkigo.user");
  });
});
