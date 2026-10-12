import { describe, expect, it } from "vitest";

import { createBoothBodySchema } from "./create-booth";

const body = { name: "시청 부스", address: "서울특별시 중구 세종대로 110" };

describe("createBoothBodySchema", () => {
  it("trims the name and address and stores a blank address detail as null", () => {
    expect(
      createBoothBodySchema.parse({ name: " 시청 부스 ", address: ` ${body.address} `, addressDetail: "   " }),
    ).toEqual({ ...body, addressDetail: null });
  });

  it("rejects a missing name", () => {
    expect(createBoothBodySchema.safeParse({ address: body.address }).success).toBe(false);
  });
});
