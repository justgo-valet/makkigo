import { describe, expect, it } from "vitest";

import { merchantRegistrationBodySchema } from "./registration";

const uploadId = "018f47a3-7b4c-7b1f-8db8-743c634d9651";

const validBody = {
  sessionId: "018f47a3-7b4c-7b1f-8db8-743c634d9650",
  name: "테스트 업체",
  roadAddress: "서울특별시 중구 세종대로 110",
  addressDetail: "  2층  ",
  postalCode: "04524",
  latitude: 37.5666805,
  longitude: 126.9784147,
  boothId: 1,
  uploadIds: [uploadId],
};

describe("merchantRegistrationBodySchema", () => {
  it("normalizes strings and maps an empty optional detail to null", () => {
    expect(
      merchantRegistrationBodySchema.parse({
        ...validBody,
        name: "  테스트 업체  ",
        roadAddress: "  서울특별시 중구 세종대로 110  ",
        addressDetail: "   ",
      }),
    ).toEqual({
      ...validBody,
      addressDetail: null,
    });
  });

  it.each([
    ["name", { name: "   " }],
    ["name length", { name: "가".repeat(101) }],
    ["road address", { roadAddress: " " }],
    ["postal code", { postalCode: "1234" }],
    ["latitude", { latitude: 90.0000001 }],
    ["latitude finite", { latitude: Number.POSITIVE_INFINITY }],
    ["longitude", { longitude: -180.0000001 }],
    ["booth", { boothId: 0 }],
    ["photos empty", { uploadIds: [] }],
    ["photos over capacity", { uploadIds: Array.from({ length: 6 }, (_, index) => `${uploadId.slice(0, -1)}${index}`) }],
    ["photos duplicate", { uploadIds: [uploadId, uploadId] }],
    ["detail length", { addressDetail: "가".repeat(101) }],
  ])("rejects invalid %s", (_, patch) => {
    expect(merchantRegistrationBodySchema.safeParse({ ...validBody, ...patch }).success).toBe(false);
  });

  it("accepts the boundary coordinate, text and photo counts", () => {
    const uploadIds = Array.from(
      { length: 5 },
      (_, index) => `018f47a3-7b4c-7b1f-8db8-743c634d965${index}`,
    );

    expect(
      merchantRegistrationBodySchema.safeParse({
        ...validBody,
        name: "가".repeat(100),
        addressDetail: "나".repeat(100),
        latitude: -90,
        longitude: 180,
        uploadIds,
      }).success,
    ).toBe(true);
  });

  it.each(["adminId", "status", "path", "finalKey"])("rejects over-posted %s", (key) => {
    expect(merchantRegistrationBodySchema.safeParse({ ...validBody, [key]: "forged" }).success).toBe(
      false,
    );
  });
});
