import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { readBoothRegistration } from "./readBoothRegistration";

const body = { name: "부스", address: "서울특별시 중구 세종대로 110" };
const upload = {
  uploadId: "018f47a3-7b4c-7b1f-8db8-743c634d9651",
  contentType: "image/png",
  size: 8,
};

describe("readBoothRegistration", () => {
  afterEach(() => vi.useRealTimers());
  it("accepts legacy JSON registration without photos", async () => {
    const request = new Request("https://example.test/api/v1/booths", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    await expect(readBoothRegistration(request)).resolves.toEqual({
      ok: true,
      value: { body: { ...body, addressDetail: null }, photoUploads: [] },
    });
  });

  it("accepts valid photo upload references", async () => {
    const request = new Request("https://example.test/api/v1/booths", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, photoUploads: [upload] }),
    });
    await expect(readBoothRegistration(request)).resolves.toMatchObject({
      ok: true,
      value: { body, photoUploads: [upload] },
    });
  });

  it("rejects malformed upload metadata", async () => {
    const request = new Request("https://example.test/api/v1/booths", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, photoUploads: [{ ...upload, size: 0 }] }),
    });
    await expect(readBoothRegistration(request)).resolves.toEqual({ ok: false, reason: "INVALID_REQUEST" });
  });

  it("times out a stalled JSON body read", async () => {
    vi.useFakeTimers();
    const request = new Request("https://example.test/api/v1/booths", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: new ReadableStream({ pull: () => new Promise<void>(() => undefined) }),
      // A custom stream has unknown length, matching a chunked request.
      duplex: "half",
    } as RequestInit);
    const result = readBoothRegistration(request);

    await vi.advanceTimersByTimeAsync(15_000);
    await expect(result).resolves.toEqual({ ok: false, reason: "REQUEST_TIMEOUT" });
  });
});
