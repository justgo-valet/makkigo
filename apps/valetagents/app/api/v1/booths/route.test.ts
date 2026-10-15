import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const auth = vi.hoisted(() => ({ getCurrentStaffId: vi.fn(), getActiveStaffRole: vi.fn() }));
const boothService = vi.hoisted(() => ({ createBooth: vi.fn(), getCreateBoothPreflightFailure: vi.fn(), searchBooths: vi.fn() }));
const photoStorage = vi.hoisted(() => ({ promote: vi.fn(), delete: vi.fn() }));

vi.mock("@/server/auth/getCurrentStaffId", () => ({
  getCurrentStaffId: auth.getCurrentStaffId,
}));
vi.mock("@/server/auth/getActiveStaffRole", () => ({
  getActiveStaffRole: auth.getActiveStaffRole,
}));
vi.mock("@/server/booth/createBooth", () => ({
  createBooth: boothService.createBooth,
  getCreateBoothPreflightFailure: boothService.getCreateBoothPreflightFailure,
}));
vi.mock("@/server/booth/s3BoothPhotoStorage", () => ({
  boothPhotoKeys: (staffId: number, upload: { uploadId: string; contentType: string }, finalId = upload.uploadId) => {
    const extension = upload.contentType === "image/jpeg" ? "jpg" : upload.contentType === "image/png" ? "png" : "webp";
    return {
      stagingKey: `booths/staging/${staffId}/${upload.uploadId}.${extension}`,
      finalKey: `booths/final/${staffId}/${finalId}.${extension}`,
    };
  },
  createBoothPhotoStorage: () => photoStorage,
}));
vi.mock("@/server/booth/searchBooths", () => ({
  searchBooths: boothService.searchBooths,
}));

import { NextRequest } from "next/server";

import { POST } from "./route";

const callPost = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/v1/booths", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost", Host: "localhost" },
      body: JSON.stringify(body),
    }),
  );

const createBody = { name: "시청 부스", address: "서울특별시 중구 세종대로 110" };
const photoUpload = {
  uploadId: "018f47a3-7b4c-7b1f-8db8-743c634d9651",
  contentType: "image/jpeg",
  size: 3,
};

describe("POST /api/v1/booths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.getCurrentStaffId.mockResolvedValue(7);
    auth.getActiveStaffRole.mockResolvedValue("VALET_AGENT");
    boothService.getCreateBoothPreflightFailure.mockResolvedValue(null);
    boothService.createBooth.mockResolvedValue({ ok: true, value: { id: 3 } });
    photoStorage.promote.mockResolvedValue(undefined);
    photoStorage.delete.mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it("rejects an invalid body without calling the service", async () => {
    const response = await callPost({ address: createBody.address });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_REQUEST" });
    expect(boothService.createBooth).not.toHaveBeenCalled();
  });

  it("returns 201 with the new booth id", async () => {
    const response = await callPost(createBody);

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: 3 });
  });

  it("maps ALREADY_ONBOARDED to 403", async () => {
    boothService.createBooth.mockResolvedValue({ ok: false, reason: "ALREADY_ONBOARDED" });

    const response = await callPost(createBody);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "ALREADY_ONBOARDED" });
  });

  it("rejects an ineligible agent before reading or uploading photos", async () => {
    boothService.getCreateBoothPreflightFailure.mockResolvedValue("ALREADY_ONBOARDED");
    const response = await callPost({ ...createBody, photoUploads: [photoUpload] });

    expect(response.status).toBe(403);
    expect(photoStorage.promote).not.toHaveBeenCalled();
    expect(boothService.createBooth).not.toHaveBeenCalled();
  });

  it("promotes validated staged photos and passes unique final keys to the transaction", async () => {
    const response = await callPost({ ...createBody, photoUploads: [photoUpload] });

    expect(response.status).toBe(201);
    expect(photoStorage.promote).toHaveBeenCalledOnce();
    const [, , promotedFinalId] = photoStorage.promote.mock.calls[0] as [number, typeof photoUpload, string];
    const [, , paths] = boothService.createBooth.mock.calls[0] as [number, unknown, string[]];
    expect(paths).toHaveLength(1);
    expect(paths[0]).toMatch(/^booths\/final\/7\/[\da-f-]{36}\.jpg$/i);
    expect(paths[0]).not.toContain(photoUpload.uploadId);
    expect(paths[0]).toContain(promotedFinalId);
    expect(photoStorage.delete).toHaveBeenCalledWith("booths/staging/7/018f47a3-7b4c-7b1f-8db8-743c634d9651.jpg");
  });

  it("uses different final keys for repeated registrations with the same staged upload", async () => {
    await callPost({ ...createBody, photoUploads: [photoUpload] });
    await callPost({ ...createBody, photoUploads: [photoUpload] });

    const createCalls = boothService.createBooth.mock.calls as [number, unknown, string[]][];
    const finalPaths = createCalls.map((call) => call[2][0]);
    expect(finalPaths).toHaveLength(2);
    expect(finalPaths[0]).not.toBe(finalPaths[1]);
  });

  it("cleans unique final keys and staged photos after a definite transaction rejection", async () => {
    boothService.createBooth.mockResolvedValue({ ok: false, reason: "ALREADY_ONBOARDED" });
    await callPost({ ...createBody, photoUploads: [photoUpload] });

    expect(photoStorage.delete).toHaveBeenCalledTimes(2);
    expect(photoStorage.delete).toHaveBeenCalledWith(expect.stringMatching(/^booths\/final\/7\/(?!018f47a3-7b4c-7b1f-8db8-743c634d9651)[\da-f-]{36}\.jpg$/i));
    expect(photoStorage.delete).toHaveBeenCalledWith("booths/staging/7/018f47a3-7b4c-7b1f-8db8-743c634d9651.jpg");
  });

  it("preserves uploaded objects when transaction outcome is ambiguous", async () => {
    boothService.createBooth.mockRejectedValue(new Error("connection lost during commit"));
    await callPost({ ...createBody, photoUploads: [photoUpload] });

    expect(photoStorage.delete).toHaveBeenCalledOnce();
    expect(photoStorage.delete).toHaveBeenCalledWith("booths/staging/7/018f47a3-7b4c-7b1f-8db8-743c634d9651.jpg");
    expect(console.error).toHaveBeenCalledWith(
      "Booth creation outcome is ambiguous; preserving uploaded photos",
      expect.objectContaining({ keys: [expect.stringMatching(/^booths\/final\/7\/(?!018f47a3-7b4c-7b1f-8db8-743c634d9651)[\da-f-]{36}\.jpg$/i)] }),
    );
  });
});
