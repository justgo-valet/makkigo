import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const database = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("database", () => ({ prisma: { merchant: { findMany: database.findMany } } }));

import { listOwnMerchants, toImageUrl } from "./listOwnMerchants";

describe("listOwnMerchants", () => {
  beforeEach(() => vi.clearAllMocks());

  it("scopes rows to the owner and active merchants/booths", async () => {
    database.findMany.mockResolvedValue([]);

    await expect(listOwnMerchants(7, "https://images.example.com")).resolves.toEqual({ items: [] });
    expect(database.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { adminId: 7, deletedAt: null },
        select: expect.objectContaining({
          booths: expect.objectContaining({ where: { booth: { deletedAt: null } } }),
        }),
      }),
    );
  });

  it("serializes nullable legacy coordinates, ordered photos and contract status", async () => {
    database.findMany.mockResolvedValue([
      {
        id: 1,
        name: "매장",
        address: "서울 중구",
        addressDetail: null,
        postalCode: null,
        latitude: null,
        longitude: null,
        photos: [{ path: "merchants/final/photo.webp" }],
        booths: [
          {
            status: "REJECTED",
            booth: { id: 2, name: "시청", address: "서울 중구 세종대로" },
          },
        ],
      },
    ]);

    await expect(listOwnMerchants(7, "https://images.example.com/base/")).resolves.toEqual({
      items: [
        {
          id: 1,
          name: "매장",
          address: "서울 중구",
          addressDetail: null,
          postalCode: null,
          latitude: null,
          longitude: null,
          photoUrls: ["https://images.example.com/base/merchants/final/photo.webp"],
          booths: [
            {
              id: 2,
              name: "시청",
              address: "서울 중구 세종대로",
              status: "REJECTED",
            },
          ],
        },
      ],
    });
  });

  it("does not allow a stored absolute-looking path to replace the configured host", () => {
    expect(toImageUrl("https://images.example.com", "https://evil.example/file.jpg")).toBe(
      "https://images.example.com/https://evil.example/file.jpg",
    );
  });
});
