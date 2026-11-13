import { describe, expect, it } from "vitest";

import {
  getBoothInfoAvailability,
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

describe("getBoothInfoAvailability", () => {
  it("moves on only with a named booth whose typed address the map has found", () => {
    expect(getBoothInfoAvailability(filled)).toBe(true);
    expect(getBoothInfoAvailability({ ...filled, name: " " })).toBe(false);
    expect(getBoothInfoAvailability({ ...filled, mapState: "error" })).toBe(false);
    expect(getBoothInfoAvailability({ ...filled, address: `${ADDRESS} 1` })).toBe(false);
    expect(getBoothInfoAvailability({ ...filled, isSaving: true })).toBe(false);
  });
});

describe("isAlreadyOnboardedError", () => {
  it("recognises the answer the losing double submit gets, so it can go home", () => {
    expect(isAlreadyOnboardedError({ data: { code: "ALREADY_ONBOARDED" } })).toBe(true);
    expect(isAlreadyOnboardedError({ data: { code: "VALET_AGENT_REQUIRED" } })).toBe(false);
  });
});
