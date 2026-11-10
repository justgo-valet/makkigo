import { describe, expect, it } from "vitest";

import { createBoothBodySchema } from "./create-booth";

const body = {
  name: "시청 부스",
  address: "서울특별시 중구 세종대로 110",
  feePolicy: { baseMinutes: 60, baseFee: 12_000, extraUnitMinutes: 10, extraUnitFee: 1_000 },
};

describe("createBoothBodySchema", () => {
  it("trims the name and address and stores a blank address detail as null", () => {
    expect(
      createBoothBodySchema.parse({ ...body, name: " 시청 부스 ", address: ` ${body.address} `, addressDetail: "   " }),
    ).toEqual({ ...body, addressDetail: null });
  });

  it("rejects a missing name", () => {
    expect(createBoothBodySchema.safeParse({ address: body.address, feePolicy: body.feePolicy }).success).toBe(false);
  });

  it("requires a valid fee policy", () => {
    const { feePolicy, ...withoutFee } = body;
    expect(createBoothBodySchema.safeParse(withoutFee).success).toBe(false);
    expect(createBoothBodySchema.safeParse({ ...body, feePolicy: { ...feePolicy, baseMinutes: 30 } }).success).toBe(false);
  });
});
