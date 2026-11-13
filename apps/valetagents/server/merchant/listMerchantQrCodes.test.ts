import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("database", () => ({ prisma: {} }));

import { guestUrl } from "./listMerchantQrCodes";

describe("guestUrl", () => {
  it("points the merchant QR at the guest page of the customer app", () => {
    expect(guestUrl("https://app.makkigo.com", 12)).toBe("https://app.makkigo.com/guest?merchant=12");
    expect(guestUrl("http://localhost:3001/", 3)).toBe("http://localhost:3001/guest?merchant=3");
  });
});
