import { describe, expect, it } from "vitest";

import { takeGuestRequest } from "./rateLimit";

const take = (kind: "read" | "pickup", client: string, times: number, now: number) =>
  Array.from({ length: times }, () => takeGuestRequest(kind, client, now));

describe("takeGuestRequest", () => {
  it("allows 120 lookups and 10 pickup requests a minute per client, counted apart", () => {
    const now = 1_000_000;

    expect(take("read", "1.2.3.4", 120, now).every(Boolean)).toBe(true);
    expect(takeGuestRequest("read", "1.2.3.4", now)).toBe(false);
    expect(take("pickup", "1.2.3.4", 10, now).every(Boolean)).toBe(true);
    expect(takeGuestRequest("pickup", "1.2.3.4", now)).toBe(false);
    expect(takeGuestRequest("read", "5.6.7.8", now)).toBe(true);
    expect(takeGuestRequest("read", "1.2.3.4", now + 60_000)).toBe(true);
  });
});
