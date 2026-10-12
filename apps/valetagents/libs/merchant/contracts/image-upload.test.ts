import { describe, expect, it } from "vitest";

import {
  MAX_MERCHANT_IMAGE_BYTES,
  merchantImageReservationBodySchema,
  merchantImageUploadStates,
} from "./image-upload";

const validBody = {
  sessionId: "018f47a3-7b4c-7b1f-8db8-743c634d9650",
  contentType: "image/jpeg",
  size: 1,
};

describe("merchantImageReservationBodySchema", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("accepts %s", (contentType) => {
    expect(merchantImageReservationBodySchema.safeParse({ ...validBody, contentType }).success).toBe(
      true,
    );
  });

  it("accepts the exact five MiB boundary", () => {
    expect(
      merchantImageReservationBodySchema.safeParse({
        ...validBody,
        size: MAX_MERCHANT_IMAGE_BYTES,
      }).success,
    ).toBe(true);
  });

  it("accepts only a UUID upload ID when refreshing an existing reservation", () => {
    expect(
      merchantImageReservationBodySchema.safeParse({
        ...validBody,
        uploadId: "018f47a3-7b4c-7b1f-8db8-743c634d9651",
      }).success,
    ).toBe(true);
    expect(
      merchantImageReservationBodySchema.safeParse({ ...validBody, uploadId: "staging/key" })
        .success,
    ).toBe(false);
  });

  it.each([
    { size: 0 },
    { size: MAX_MERCHANT_IMAGE_BYTES + 1 },
    { size: 1.5 },
    { contentType: "image/gif" },
    { contentType: "image/svg+xml" },
    { stagingKey: "merchants/forged" },
  ])("rejects invalid or server-owned input %#", (patch) => {
    expect(merchantImageReservationBodySchema.safeParse({ ...validBody, ...patch }).success).toBe(
      false,
    );
  });
});

describe("merchantImageUploadStates", () => {
  it("keeps upload lifecycle states separate from session states", () => {
    expect(merchantImageUploadStates).toEqual([
      "RESERVED",
      "READY",
      "CLAIMED",
      "COPYING",
      "VALIDATED",
      "ATTACHED",
      "REVOKED",
      "TOMBSTONED",
    ]);
  });
});
