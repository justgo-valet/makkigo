import { describe, expect, it } from "vitest";

import { getBoothPhotoError, selectBoothPhotoFiles } from "./useBoothPhotos";

const photo = (name: string, type = "image/jpeg", size = 10) =>
  new File([new Uint8Array(size)], name, { type });

describe("getBoothPhotoError", () => {
  it("accepts JPEG, PNG and WebP files up to 5 MiB", () => {
    expect(getBoothPhotoError(photo("booth.jpg"))).toBeNull();
    expect(getBoothPhotoError(photo("booth.png", "image/png"))).toBeNull();
    expect(getBoothPhotoError(photo("booth.webp", "image/webp", 5 * 1024 * 1024))).toBeNull();
  });

  it("rejects unsupported, empty and oversized files with a useful message", () => {
    expect(getBoothPhotoError(photo("booth.gif", "image/gif"))).toContain("JPG");
    expect(getBoothPhotoError(photo("empty.jpg", "image/jpeg", 0))).toContain("5MB");
    expect(getBoothPhotoError(photo("large.jpg", "image/jpeg", 5 * 1024 * 1024 + 1))).toContain(
      "5MB",
    );
  });
});

describe("selectBoothPhotoFiles", () => {
  it("keeps valid files and enforces the five-photo total", () => {
    const files = Array.from({ length: 4 }, (_, index) => photo(`${index}.jpg`));
    const selected = selectBoothPhotoFiles(2, files);

    expect(selected.accepted.map(({ name }) => name)).toEqual(["0.jpg", "1.jpg", "2.jpg"]);
    expect(selected.message).toContain("최대 5장");
  });

  it("does not let an invalid file prevent a later valid file from being selected", () => {
    const valid = photo("booth.png", "image/png");
    const selected = selectBoothPhotoFiles(0, [photo("booth.txt", "text/plain"), valid]);

    expect(selected.accepted).toEqual([valid]);
    expect(selected.message).toContain("JPG");
  });
});
