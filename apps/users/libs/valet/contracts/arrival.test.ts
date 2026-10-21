import { describe, expect, it } from "vitest";

import { delayArrivalRequestSchema } from "@/libs/valet/contracts/arrival";

const isValidDelay = (minutes: unknown) => delayArrivalRequestSchema.safeParse({ minutes }).success;

describe("delayArrivalRequestSchema", () => {
  it("5분 단위로 5 ~ 60분을 받는다", () => {
    expect([5, 10, 15, 35, 60].every(isValidDelay)).toBe(true);
  });

  it("범위 밖이거나 5분 단위가 아니면 거절한다", () => {
    expect([0, 65, 12, 7.5, "15", null].some(isValidDelay)).toBe(false);
  });
});
