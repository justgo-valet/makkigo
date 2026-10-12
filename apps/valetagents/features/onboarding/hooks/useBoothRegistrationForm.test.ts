import { describe, expect, it } from "vitest";

import {
  getBoothRegistrationAvailability,
  isAlreadyOnboardedError,
} from "./useBoothRegistrationForm";

const ADDRESS = "서울특별시 중구 세종대로 110";

const filled = {
  name: "시청 부스",
  address: ADDRESS,
  geocodedAddress: ADDRESS,
  mapState: "ready",
  isSaving: false,
} as const;

describe("getBoothRegistrationAvailability", () => {
  it("allows registering only a named booth whose typed address the map has found", () => {
    expect(getBoothRegistrationAvailability(filled)).toBe(true);
    expect(getBoothRegistrationAvailability({ ...filled, name: " " })).toBe(false);
    expect(getBoothRegistrationAvailability({ ...filled, mapState: "error" })).toBe(false);
    expect(getBoothRegistrationAvailability({ ...filled, address: `${ADDRESS} 1` })).toBe(false);
    expect(getBoothRegistrationAvailability({ ...filled, isSaving: true })).toBe(false);
  });
});

describe("isAlreadyOnboardedError", () => {
  it("recognises the answer the losing double submit gets, so it can go home", () => {
    expect(isAlreadyOnboardedError({ data: { code: "ALREADY_ONBOARDED" } })).toBe(true);
    expect(isAlreadyOnboardedError({ data: { code: "VALET_AGENT_REQUIRED" } })).toBe(false);
  });
});
