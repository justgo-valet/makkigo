import { describe, expect, it } from "vitest";

import { agentRequestBodySchema } from "./agent-request";

describe("agentRequestBodySchema", () => {
  it("accepts an overnight work-time pair", () => {
    expect(
      agentRequestBodySchema.safeParse({
        name: "김요원",
        workStartTime: "22:00",
        workEndTime: "06:00",
      }).success,
    ).toBe(true);
  });

  it.each([
    { name: "김요원", workStartTime: "9:00", workEndTime: "18:00" },
    { name: "김요원", workStartTime: "09:00", workEndTime: "24:00" },
    { name: "김요원", workStartTime: "09:00" },
    { workStartTime: "09:00", workEndTime: "18:00" },
    { name: "  ", workStartTime: "09:00", workEndTime: "18:00" },
    { name: "김요원", workStartTime: "09:00", workEndTime: "18:00", staffId: 1 },
    { name: "김요원", workStartTime: "09:00", workEndTime: "18:00", status: "APPROVED" },
  ])("rejects malformed or over-posted body %#", (body) => {
    expect(agentRequestBodySchema.safeParse(body).success).toBe(false);
  });
});
