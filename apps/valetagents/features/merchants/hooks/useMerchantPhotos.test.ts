import { describe, expect, it } from "vitest";

import { MAX_MERCHANT_IMAGE_BYTES } from "@/libs/merchant/contracts/image-upload";

import { arePhotosReady, getMerchantImageError, moveItem } from "./useMerchantPhotos";

describe("getMerchantImageError", () => {
  it("accepts supported images from 1 byte up to the size limit", () => {
    expect(getMerchantImageError({ type: "image/jpeg", size: 1 })).toBeNull();
    expect(getMerchantImageError({ type: "image/webp", size: MAX_MERCHANT_IMAGE_BYTES })).toBeNull();
  });

  it("rejects unsupported types, empty files and oversized files", () => {
    expect(getMerchantImageError({ type: "image/gif", size: 10 })).not.toBeNull();
    expect(getMerchantImageError({ type: "image/png", size: 0 })).not.toBeNull();
    expect(
      getMerchantImageError({ type: "image/png", size: MAX_MERCHANT_IMAGE_BYTES + 1 }),
    ).not.toBeNull();
  });
});

describe("moveItem", () => {
  it("moves one item and keeps the rest in order", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("ignores positions outside the list", () => {
    const items = ["a", "b"];
    expect(moveItem(items, 0, 2)).toBe(items);
    expect(moveItem(items, -1, 0)).toBe(items);
  });
});

describe("arePhotosReady", () => {
  it("is false while an uploaded photo is being removed", () => {
    const ready = { status: "ready" as const, removing: false };

    expect(arePhotosReady([ready, ready])).toBe(true);
    expect(arePhotosReady([ready, { ...ready, removing: true }])).toBe(false);
  });
});
