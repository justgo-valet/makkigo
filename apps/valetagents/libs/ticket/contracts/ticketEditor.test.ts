import { describe, expect, it } from "vitest";

import { ticketEditorSaveBodySchema, ticketImageUploadBodySchema } from "./ticketEditor";

const design = { version: 1, shape: "RECTANGLE", backgroundColor: "#FFFFFF", layers: [] };

describe("ticket editor contracts", () => {
  it("requires exactly one ticket target and bounds image reservations", () => {
    expect(ticketEditorSaveBodySchema.safeParse({ merchantId: 1, design }).success).toBe(true);
    expect(ticketEditorSaveBodySchema.safeParse({ ticketId: 1, merchantId: 1, design }).success).toBe(false);
    expect(ticketImageUploadBodySchema.safeParse({ merchantId: 1, contentType: "image/png", size: 5 * 1024 * 1024 }).success).toBe(true);
    expect(ticketImageUploadBodySchema.safeParse({ merchantId: 1, contentType: "image/svg+xml", size: 10 }).success).toBe(false);
  });
});
