import "server-only";

import { prisma } from "database";
import { z } from "zod";

import { logError } from "@/server/common/logError";

import { planMerchantImport } from "./planMerchantImport";
import { fetchTargetStores, PublicDataError } from "./publicDataStores";

import type { merchantImportTargetBodySchema } from "@/libs/merchantImport/contracts";
import type { ExistingMerchant, ImportStore } from "./planMerchantImport";

const NEARBY_MARGIN_DEGREES = 0.001;
const ID_LOOKUP_BATCH = 5000;
const WRITE_BATCH = 500;
const MASS_DELETE_MIN = 20;
const MASS_DELETE_RATIO = 0.2;
const MAX_NAME_LENGTH = 100;
const MAX_ADDRESS_LENGTH = 200;

const merchantImportResultSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    at: z.string(),
    fetched: z.number(),
    inserted: z.number(),
    skippedExisting: z.number(),
    skippedNearby: z.number(),
    skippedInvalid: z.number(),
    deleted: z.number(),
    revived: z.number(),
    keptLinked: z.number(),
  }),
  z.object({ ok: z.literal(false), at: z.string(), error: z.string() }),
]);

type MerchantImportResult = z.output<typeof merchantImportResultSchema>;
type MerchantImportTargetInput = z.output<typeof merchantImportTargetBodySchema>;

const existingSelect = {
  id: true,
  name: true,
  latitude: true,
  longitude: true,
  publicDataId: true,
  importTargetId: true,
  deletedAt: true,
  _count: { select: { booths: true, admins: true, valetSessions: true } },
} as const;

const chunk = <Item>(items: Item[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));

const loadExistingMerchants = async (targetId: number, stores: ImportStore[]): Promise<ExistingMerchant[]> => {
  const located = stores.flatMap(({ latitude, longitude }) =>
    latitude !== null && longitude !== null ? [{ latitude, longitude }] : [],
  );
  const latitudes = located.map(({ latitude }) => latitude);
  const longitudes = located.map(({ longitude }) => longitude);
  const queries = [
    prisma.merchant.findMany({ where: { importTargetId: targetId, deletedAt: null }, select: existingSelect }),
    ...chunk(
      stores.map(({ publicDataId }) => publicDataId),
      ID_LOOKUP_BATCH,
    ).map((publicDataIds) =>
      prisma.merchant.findMany({ where: { publicDataId: { in: publicDataIds } }, select: existingSelect }),
    ),
    ...(located.length > 0
      ? [
          prisma.merchant.findMany({
            where: {
              deletedAt: null,
              latitude: {
                gte: latitudes.reduce((min, value) => Math.min(min, value)) - NEARBY_MARGIN_DEGREES,
                lte: latitudes.reduce((max, value) => Math.max(max, value)) + NEARBY_MARGIN_DEGREES,
              },
              longitude: {
                gte: longitudes.reduce((min, value) => Math.min(min, value)) - NEARBY_MARGIN_DEGREES,
                lte: longitudes.reduce((max, value) => Math.max(max, value)) + NEARBY_MARGIN_DEGREES,
              },
            },
            select: existingSelect,
          }),
        ]
      : []),
  ];
  const merchants = new Map<number, ExistingMerchant>();
  for (const rows of await Promise.all(queries)) {
    for (const { _count, deletedAt, ...merchant } of rows) {
      merchants.set(merchant.id, {
        ...merchant,
        deleted: deletedAt !== null,
        linked: _count.booths > 0 || _count.admins > 0 || _count.valetSessions > 0,
      });
    }
  }
  return [...merchants.values()];
};

const importTarget = async (target: { id: number; signguCode: string; industryCodes: string[] }, at: Date) => {
  const stores = await fetchTargetStores(target.signguCode, target.industryCodes);
  const existing = await loadExistingMerchants(target.id, stores);
  const plan = planMerchantImport(target.id, stores, existing);
  const live = existing.filter(({ importTargetId, deleted }) => importTargetId === target.id && !deleted).length;
  if (plan.deleteIds.length > Math.max(MASS_DELETE_MIN, live * MASS_DELETE_RATIO)) {
    throw new PublicDataError(
      `이번 결과대로면 이 대상 업체 ${live}곳 중 ${plan.deleteIds.length}곳을 지워야 해서 아무것도 바꾸지 않고 멈췄습니다. API 응답을 확인해 주세요.`,
    );
  }
  let inserted = 0;
  for (const batch of chunk(plan.inserts, WRITE_BATCH)) {
    const { count } = await prisma.merchant.createMany({
      data: batch.map((store) => ({
        ...store,
        name: store.name.slice(0, MAX_NAME_LENGTH),
        address: (store.address ?? "").slice(0, MAX_ADDRESS_LENGTH),
        importTargetId: target.id,
      })),
      skipDuplicates: true,
    });
    inserted += count;
  }
  let revived = 0;
  for (const ids of chunk(plan.reviveIds, WRITE_BATCH)) {
    const { count } = await prisma.merchant.updateMany({
      where: { id: { in: ids }, importTargetId: target.id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
    revived += count;
  }
  let deleted = 0;
  for (const ids of chunk(plan.deleteIds, WRITE_BATCH)) {
    const { count } = await prisma.merchant.updateMany({
      where: {
        id: { in: ids },
        importTargetId: target.id,
        deletedAt: null,
        booths: { none: {} },
        admins: { none: {} },
        valetSessions: { none: {} },
      },
      data: { deletedAt: at, kakaoPlaceId: null },
    });
    deleted += count;
  }
  return {
    ok: true as const,
    at: at.toISOString(),
    fetched: stores.length,
    inserted,
    skippedExisting: plan.skippedExisting,
    skippedNearby: plan.skippedNearby,
    skippedInvalid: plan.skippedInvalid,
    deleted,
    revived,
    keptLinked: plan.keptLinked,
  };
};

const runMerchantImport = async (targetId: number): Promise<MerchantImportResult | null> => {
  const target = await prisma.merchantImportTarget.findUnique({
    where: { id: targetId },
    select: { id: true, signguCode: true, industryCodes: true },
  });
  if (!target) return null;
  const at = new Date();
  let result: MerchantImportResult;
  try {
    result = await importTarget(target, at);
  } catch (error) {
    logError("Failed to import merchants", error);
    result = {
      ok: false,
      at: at.toISOString(),
      error: error instanceof PublicDataError ? error.message : "서버 오류로 수집하지 못했습니다.",
    };
  }
  await prisma.merchantImportTarget.updateMany({
    where: { id: target.id },
    data: { lastResult: result, ...(result.ok ? { lastSyncedAt: at } : {}) },
  });
  return result;
};

const listMerchantImportTargets = async () => {
  const targets = await prisma.merchantImportTarget.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      signguCode: true,
      signguName: true,
      industryNames: true,
      lastSyncedAt: true,
      lastResult: true,
      _count: { select: { merchants: { where: { deletedAt: null } } } },
    },
  });
  return targets.map(({ lastResult, ...target }) => {
    const parsed = merchantImportResultSchema.safeParse(lastResult);
    return { ...target, lastResult: parsed.success ? parsed.data : null };
  });
};

const createMerchantImportTarget = async (input: MerchantImportTargetInput) => {
  const target = await prisma.merchantImportTarget.create({
    data: {
      signguCode: input.signguCode,
      signguName: input.signguName,
      industryCodes: input.industries.map(({ code }) => code),
      industryNames: input.industries.map(({ name }) => name),
    },
    select: { id: true },
  });
  return target.id;
};

const deleteMerchantImportTarget = async (targetId: number) => {
  const { count } = await prisma.merchantImportTarget.deleteMany({ where: { id: targetId } });
  return count === 1;
};

export {
  createMerchantImportTarget,
  deleteMerchantImportTarget,
  listMerchantImportTargets,
  runMerchantImport,
};
export type { MerchantImportResult };
