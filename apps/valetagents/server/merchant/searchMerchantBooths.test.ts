import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const database = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("database", () => ({ prisma: { booth: { findMany: database.findMany } } }));

import { searchMerchantBooths } from "./searchMerchantBooths";

describe("searchMerchantBooths", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns only neutral public booth fields in stable order", async () => {
    database.findMany.mockResolvedValue([{ id: 3, name: "강남", address: "서울 강남구" }]);

    await expect(searchMerchantBooths("강남")).resolves.toEqual({
      items: [{ id: 3, name: "강남", address: "서울 강남구" }],
    });
    expect(database.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        OR: [
          { name: { contains: "강남", mode: "insensitive" } },
          { address: { contains: "강남", mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, address: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 20,
    });
  });
});
