import { describe, expect, it } from "vitest";

import { boothAgentReviewBodySchema } from "./agents";

const agent = (id: number) => ({ id, updatedAt: "2026-10-10T01:00:00.000Z" });

describe("boothAgentReviewBodySchema", () => {
  it("accepts an approval or rejection for the listed agents", () => {
    expect(boothAgentReviewBodySchema.safeParse({ status: "APPROVED", agents: [agent(1)] }).success).toBe(true);
    expect(
      boothAgentReviewBodySchema.safeParse({ status: "REJECTED", agents: [agent(1), agent(2)] }).success,
    ).toBe(true);
  });

  it.each([
    ["a status managers cannot set", { status: "REQUESTED", agents: [agent(1)] }],
    ["no agents", { status: "APPROVED", agents: [] }],
    ["the same agent twice", { status: "APPROVED", agents: [agent(1), agent(1)] }],
    ["more agents than one page", { status: "APPROVED", agents: Array.from({ length: 11 }, (_, i) => agent(i + 1)) }],
    ["a missing updatedAt", { status: "APPROVED", agents: [{ id: 1 }] }],
    ["unknown keys", { status: "APPROVED", agents: [agent(1)], boothId: 2 }],
  ])("rejects %s", (_label, body) => {
    expect(boothAgentReviewBodySchema.safeParse(body).success).toBe(false);
  });
});
