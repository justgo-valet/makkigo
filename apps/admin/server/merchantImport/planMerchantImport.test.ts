import { describe, expect, it } from "vitest";

import { planMerchantImport } from "./planMerchantImport";

import type { ExistingMerchant, ImportStore } from "./planMerchantImport";

const TARGET_ID = 7;

const store = (publicDataId: string, overrides: Partial<ImportStore> = {}): ImportStore => ({
  publicDataId,
  name: `가게 ${publicDataId}`,
  address: "서울특별시 강남구 테헤란로 1",
  postalCode: "06236",
  latitude: 37.5,
  longitude: 127.03,
  category: "백반/한정식",
  ...overrides,
});

const merchant = (id: number, overrides: Partial<ExistingMerchant> = {}): ExistingMerchant => ({
  id,
  name: `업체 ${id}`,
  latitude: null,
  longitude: null,
  publicDataId: null,
  importTargetId: null,
  deleted: false,
  linked: false,
  ...overrides,
});

describe("planMerchantImport", () => {
  it("inserts only stores whose public data id is new, even when the existing row was deleted or edited", () => {
    const plan = planMerchantImport(
      TARGET_ID,
      [store("A"), store("B"), store("C")],
      [
        merchant(1, { name: "어드민이 고친 이름", publicDataId: "A", importTargetId: TARGET_ID }),
        merchant(2, { publicDataId: "B", importTargetId: null, deleted: true }),
      ],
    );

    expect(plan.inserts.map(({ publicDataId }) => publicDataId)).toEqual(["C"]);
    expect(plan.skippedExisting).toBe(2);
    expect(plan.deleteIds).toEqual([]);
    expect(plan.reviveIds).toEqual([]);
  });

  it("revives rows this target soft-deleted earlier when they reappear, without inserting duplicates", () => {
    const location = { latitude: 37.5, longitude: 127.03 };
    const plan = planMerchantImport(
      TARGET_ID,
      [store("BACK", { name: "돌아온 집", ...location }), store("TWIN", { name: "돌아온 집", ...location })],
      [
        merchant(1, { name: "돌아온 집", ...location, publicDataId: "BACK", importTargetId: TARGET_ID, deleted: true }),
        merchant(2, { publicDataId: "OTHER", importTargetId: 8, deleted: true }),
      ],
    );

    expect(plan.reviveIds).toEqual([1]);
    expect(plan.inserts).toEqual([]);
    expect(plan.skippedExisting).toBe(0);
    expect(plan.skippedNearby).toBe(1);
  });

  it("skips a store with the same name ignoring spaces and case within 50m of an existing merchant", () => {
    const plan = planMerchantImport(
      TARGET_ID,
      [
        store("NEAR", { name: "Makki Cafe 강남점", latitude: 37.5003, longitude: 127.03 }),
        store("FAR", { name: "Makki Cafe 강남점", latitude: 37.5006, longitude: 127.03 }),
        store("OTHER", { name: "다른 가게", latitude: 37.5, longitude: 127.03 }),
        store("NOADDR", { address: null }),
      ],
      [merchant(1, { name: "makkicafe강남점", latitude: 37.5, longitude: 127.03 })],
    );

    expect(plan.inserts.map(({ publicDataId }) => publicDataId)).toEqual(["FAR", "OTHER"]);
    expect(plan.skippedNearby).toBe(1);
    expect(plan.skippedInvalid).toBe(1);
  });

  it("soft-deletes vanished public data merchants of this target only when nothing is linked to them", () => {
    const plan = planMerchantImport(
      TARGET_ID,
      [store("KEEP")],
      [
        merchant(1, { publicDataId: "KEEP", importTargetId: TARGET_ID }),
        merchant(2, { publicDataId: "GONE", importTargetId: TARGET_ID }),
        merchant(3, { publicDataId: "GONE_LINKED", importTargetId: TARGET_ID, linked: true }),
        merchant(4, { publicDataId: "OTHER_TARGET", importTargetId: 8 }),
        merchant(5, { publicDataId: "ALREADY_DELETED", importTargetId: TARGET_ID, deleted: true }),
        merchant(6, { importTargetId: null }),
      ],
    );

    expect(plan.deleteIds).toEqual([2]);
    expect(plan.keptLinked).toBe(1);
  });

  it("lets a re-registered store replace its vanished duplicate but not a linked one", () => {
    const location = { latitude: 37.5, longitude: 127.03 };
    const plan = planMerchantImport(
      TARGET_ID,
      [store("NEW1", { name: "국밥집", ...location }), store("NEW2", { name: "냉면집", ...location })],
      [
        merchant(1, { name: "국밥집", ...location, publicDataId: "OLD1", importTargetId: TARGET_ID }),
        merchant(2, { name: "냉면집", ...location, publicDataId: "OLD2", importTargetId: TARGET_ID, linked: true }),
      ],
    );

    expect(plan.inserts.map(({ publicDataId }) => publicDataId)).toEqual(["NEW1"]);
    expect(plan.deleteIds).toEqual([1]);
    expect(plan.skippedNearby).toBe(1);
    expect(plan.keptLinked).toBe(1);
  });
});
