import { describe, expect, it } from "vitest";

import { formatPlateNumber, formatSessionLabel } from "./formatters";

import type { BoothValetSession } from "./schemas/sessions";

const NOW = Date.parse("2026-10-14T03:00:00.000Z");

const session = (fields: Partial<BoothValetSession>): BoothValetSession => ({
  id: 1,
  status: "ARRIVING",
  plateNumber: "68오8269",
  carImageUrl: "https://images.example.com/cars/_default.png",
  expectedArrivalAt: null,
  parkedAt: null,
  expectedPickupAt: null,
  ...fields,
});

describe("valet session formatters", () => {
  it("labels each car by where it is in the valet flow", () => {
    expect(formatPlateNumber("68오8269")).toBe("68오 8269");
    expect(
      formatSessionLabel(session({ expectedArrivalAt: "2026-10-14T03:05:00.000Z" }), NOW),
    ).toBe("5분 후 도착");
    expect(formatSessionLabel(session({}), NOW)).toBe("도착 시간 미정");
    expect(
      formatSessionLabel(session({ status: "PARKED", parkedAt: "2026-10-14T01:05:00.000Z" }), NOW),
    ).toBe("1시간 55분");
    expect(formatSessionLabel(session({ status: "PICKUP_REQUESTED" }), NOW)).toBe("출차 요청");
    expect(
      formatSessionLabel(
        session({ status: "PICKUP_PREPARING", expectedPickupAt: "2026-10-14T03:05:00.000Z" }),
        NOW,
      ),
    ).toBe("5분 후 출차");
  });
});
