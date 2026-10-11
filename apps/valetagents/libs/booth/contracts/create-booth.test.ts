import { describe, expect, it } from "vitest";

import { createBoothBodySchema } from "./create-booth";

const body = { name: "시청 부스", address: "서울특별시 중구 세종대로 110" };

describe("createBoothBodySchema", () => {
  it("trims the name and address and stores a missing or blank address detail as null", () => {
    expect(createBoothBodySchema.parse({ name: " 시청 부스 ", address: ` ${body.address} ` })).toEqual({
      ...body,
      addressDetail: null,
    });
    expect(createBoothBodySchema.parse({ ...body, addressDetail: "   " })).toEqual({
      ...body,
      addressDetail: null,
    });
    expect(createBoothBodySchema.parse({ ...body, addressDetail: " 1층 로비 " })).toEqual({
      ...body,
      addressDetail: "1층 로비",
    });
  });

  it("accepts the longest name, address and address detail", () => {
    expect(
      createBoothBodySchema.safeParse({
        name: "가".repeat(50),
        address: "가".repeat(200),
        addressDetail: "가".repeat(100),
      }).success,
    ).toBe(true);
  });

  it.each([
    ["a missing name", { address: body.address }],
    ["an empty name", { ...body, name: "" }],
    ["a blank name", { ...body, name: "   " }],
    ["a name over 50 characters", { ...body, name: "가".repeat(51) }],
    ["a missing address", { name: body.name }],
    ["an empty address", { ...body, address: "" }],
    ["a blank address", { ...body, address: "   " }],
    ["an address over 200 characters", { ...body, address: "가".repeat(201) }],
    ["an address detail over 100 characters", { ...body, addressDetail: "가".repeat(101) }],
    ["a null address detail", { ...body, addressDetail: null }],
    ["photos", { ...body, photos: ["booth.png"] }],
    ["unknown keys", { ...body, creatorId: 2 }],
  ])("rejects %s", (_label, value) => {
    expect(createBoothBodySchema.safeParse(value).success).toBe(false);
  });
});
