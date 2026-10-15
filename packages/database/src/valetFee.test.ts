import { describe, expect, it } from "vitest";

import { calculateValetFee } from "./valetFee";

const POLICY = { baseMinutes: 60, baseFee: 12000, extraUnitMinutes: 30, extraUnitFee: 5000 };
const PARKED_AT = new Date("2026-10-12T10:00:00+09:00");

const after = (minutes: number, seconds = 0) =>
  new Date(PARKED_AT.getTime() + (minutes * 60 + seconds) * 1000);

describe("calculateValetFee", () => {
  it.each([
    [0, 12000],
    [30, 12000],
    [60, 12000],
    [61, 17000],
    [70, 17000],
    [90, 17000],
    [91, 22000],
    [150, 27000],
  ])("%i분 이용하면 %i원", (minutes, total) => {
    expect(calculateValetFee(POLICY, PARKED_AT, after(minutes)).total).toBe(total);
  });

  it("초과 시간과 요금 내역을 돌려준다", () => {
    expect(calculateValetFee(POLICY, PARKED_AT, after(70))).toEqual({
      ...POLICY,
      usedMinutes: 70,
      extraUnits: 1,
      extraFee: 5000,
      total: 17000,
    });
  });

  it("1분이 안 되는 초는 버린다", () => {
    expect(calculateValetFee(POLICY, PARKED_AT, after(60, 59)).total).toBe(12000);
  });

  it("기준 시각이 주차 시각보다 앞서면 0분으로 본다", () => {
    expect(calculateValetFee(POLICY, PARKED_AT, after(-5)).usedMinutes).toBe(0);
  });

  it("추가 단위가 0분이면 추가 요금이 없다", () => {
    const policy = { ...POLICY, extraUnitMinutes: 0 };

    expect(calculateValetFee(policy, PARKED_AT, after(200)).total).toBe(12000);
  });
});
