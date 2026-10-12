import { describe, expect, it } from "vitest";

import {
  getBoothRegistrationAvailability,
  getBoothRegistrationMapView,
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

describe("getBoothRegistrationMapView", () => {
  it("shows nothing before an address is typed, whatever the geocoder last said", () => {
    expect(
      getBoothRegistrationMapView({ address: "", geocodedAddress: "", mapState: "error" }),
    ).toBe("idle");
    expect(
      getBoothRegistrationMapView({ address: "   ", geocodedAddress: ADDRESS, mapState: "ready" }),
    ).toBe("idle");
  });

  it("is loading until the geocoder has been given the address that is typed now", () => {
    expect(
      getBoothRegistrationMapView({
        address: `${ADDRESS} 1`,
        geocodedAddress: ADDRESS,
        mapState: "ready",
      }),
    ).toBe("loading");
  });

  it.each(["loading", "ready", "error"] as const)(
    "follows the geocoder once it works on the typed address: %s",
    (mapState) => {
      expect(
        getBoothRegistrationMapView({ address: ` ${ADDRESS} `, geocodedAddress: ADDRESS, mapState }),
      ).toBe(mapState);
    },
  );
});

describe("getBoothRegistrationAvailability", () => {
  it("allows registering a named booth whose typed address is on the map", () => {
    expect(getBoothRegistrationAvailability(filled)).toBe(true);
  });

  it.each([
    ["the name is empty", { name: "" }],
    ["the name is blank", { name: "   " }],
    ["the address is empty", { address: "", geocodedAddress: "" }],
    ["the address is still being looked up", { mapState: "loading" }],
    ["the address is not on the map", { mapState: "error" }],
    ["the map shows an address that was typed before", { address: `${ADDRESS} 1` }],
    ["the booth is being saved", { isSaving: true }],
  ] as const)("refuses while %s", (_label, change) => {
    expect(getBoothRegistrationAvailability({ ...filled, ...change })).toBe(false);
  });
});

describe("isAlreadyOnboardedError", () => {
  it("recognises the answer given to the losing double submit", () => {
    expect(isAlreadyOnboardedError({ data: { code: "ALREADY_ONBOARDED" } })).toBe(true);
  });

  it.each([
    [{ data: { code: "VALET_AGENT_REQUIRED" } }],
    [{ data: null }],
    [new Error("network")],
    [null],
  ])("ignores %j", (error) => {
    expect(isAlreadyOnboardedError(error)).toBe(false);
  });
});
