import { describe, expect, it } from "vitest";

import { formatTicketNumber } from "./ticketNumber";

describe("formatTicketNumber", () => {
  it("shows the daily ticket number as six digits", () => {
    expect(formatTicketNumber(1)).toBe("000001");
    expect(formatTicketNumber(123456)).toBe("123456");
  });
});
