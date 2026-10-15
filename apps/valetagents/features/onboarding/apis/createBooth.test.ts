import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("@/libs/common/api/apiClient", () => ({ apiClient: api }));

import { createBooth } from "./createBooth";

describe("createBooth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.post.mockImplementation((path: string) => {
      if (path === "booth-image-uploads/presign") {
        return {
          json: async () => ({ uploads: [{
            uploadId: "018f47a3-7b4c-7b1f-8db8-743c634d9651",
            contentType: "image/jpeg",
            size: 3,
            post: { url: "https://s3.example.test", fields: { key: "booths/staging/7/id.jpg" } },
          }] }),
        };
      }
      return Promise.resolve();
    });
  });

  it("uploads photos to presigned staging before registering their references", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetch);
    const photo = new File([Uint8Array.from([0xff, 0xd8, 0xff])], "booth.jpg", { type: "image/jpeg" });

    await createBooth({ name: "시청 부스", address: "서울시", photos: [photo] });

    expect(fetch).toHaveBeenCalledWith("https://s3.example.test", expect.objectContaining({
      method: "POST",
      body: expect.any(FormData),
    }));
    expect(api.post).toHaveBeenLastCalledWith("booths", expect.objectContaining({
      json: expect.objectContaining({
        name: "시청 부스",
        photoUploads: [{
          uploadId: "018f47a3-7b4c-7b1f-8db8-743c634d9651",
          contentType: "image/jpeg",
          size: 3,
        }],
      }),
    }));
    vi.unstubAllGlobals();
  });

  it("keeps the existing JSON request when no photos are selected", async () => {
    await createBooth({ name: "시청 부스", address: "서울시", photos: [] });

    expect(api.post).toHaveBeenCalledOnce();
    expect(api.post).toHaveBeenCalledWith("booths", expect.objectContaining({
      json: { name: "시청 부스", address: "서울시" },
    }));
  });
});
