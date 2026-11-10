import { describe, expect, it } from "vitest";

import { takeGuestRequest } from "./rateLimit";

describe("takeGuestRequest", () => {
  it("allows 30 guest requests a minute per client and starts over after the window", () => {
    const now = 1_000_000;
    const results = Array.from({ length: 31 }, () => takeGuestRequest("1.2.3.4", now));

    expect(results.slice(0, 30).every(Boolean)).toBe(true);
    expect(results[30]).toBe(false);
    expect(takeGuestRequest("5.6.7.8", now)).toBe(true);
    expect(takeGuestRequest("1.2.3.4", now + 60_000)).toBe(true);
  });
});
