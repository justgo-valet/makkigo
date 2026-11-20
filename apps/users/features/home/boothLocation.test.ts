import { describe, expect, it } from "vitest";

import { getBoothLocationMerchantId, hasBoothPhotos } from "@/features/home/boothLocation";
import { getBeforeSessionSnapshot } from "@/features/home/homeSnapshot";

import type { HomeStatus } from "@/features/home/homeSnapshot";
import type { MerchantDetail } from "@/libs/merchant/contracts/merchantDetail";

const snapshot = (status: HomeStatus, merchantId: number | null = 3) => ({
  ...getBeforeSessionSnapshot("업체"),
  status,
  merchantId,
});

const merchant = (photoCounts: number[]): MerchantDetail => ({
  id: 3,
  name: "업체",
  address: "서울",
  addressDetail: null,
  latitude: null,
  longitude: null,
  photoUrls: [],
  booths: photoCounts.map((count, index) => ({
    id: index + 1,
    name: `부스 ${index + 1}`,
    photoUrls: Array.from({ length: count }, (_, photo) => `https://img/${index}-${photo}.jpg`),
    feePolicy: { baseMinutes: 60, baseFee: 5000, extraUnitMinutes: 10, extraUnitFee: 1000 },
  })),
});

describe("getBoothLocationMerchantId", () => {
  it("도착 예정일 때만 세션의 업체를 고른다", () => {
    expect(getBoothLocationMerchantId(snapshot("ARRIVAL_SCHEDULED"))).toBe(3);
  });

  it("도착 알림 전 · 차를 맡긴 뒤 · 업체 없는 세션은 고르지 않는다", () => {
    const statuses: HomeStatus[] = [
      "NONE",
      "MERCHANT_SELECTED",
      "PARKED",
      "EXIT_REQUESTED",
      "EXIT_PREPARING",
    ];
    for (const status of statuses) expect(getBoothLocationMerchantId(snapshot(status))).toBeNull();
    expect(getBoothLocationMerchantId(snapshot("ARRIVAL_SCHEDULED", null))).toBeNull();
  });
});

describe("hasBoothPhotos", () => {
  it("사진을 올린 부스가 하나라도 있어야 보여 준다", () => {
    expect(hasBoothPhotos(merchant([0, 2]))).toBe(true);
    expect(hasBoothPhotos(merchant([0, 0]))).toBe(false);
    expect(hasBoothPhotos(null)).toBe(false);
  });
});
