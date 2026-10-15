import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { cleanupExpiredTicketUploads } from "./cleanupExpiredTicketUploads";

describe("cleanupExpiredTicketUploads", () => {
  it("removes only expired reservations and completed staging keys, preserving completed records", async () => {
    const reserved = {
      id: "expired-reservation",
      stagingKey: "tickets/staging/expired.webp",
      state: "RESERVED",
    };
    const complete = {
      id: "issued-asset",
      stagingKey: "tickets/staging/complete.webp",
      state: "COMPLETE",
    };
    const findMany = vi.fn().mockResolvedValue([reserved, complete]);
    const count = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const database = { ticketImageUpload: { count, findMany, deleteMany, updateMany } };
    const storage = { deleteObject: vi.fn().mockResolvedValue(undefined) };

    await expect(
      cleanupExpiredTicketUploads(
        { dryRun: false, batchSize: 20 },
        {
          database: database as never,
          storage,
          now: () => new Date("2026-10-15T12:00:00.000Z"),
        },
      ),
    ).resolves.toMatchObject({ eligibleCount: 2, cleaned: 2, failed: 0, partial: false });

    expect(storage.deleteObject).toHaveBeenCalledTimes(2);
    expect(storage.deleteObject).toHaveBeenCalledWith({ key: "tickets/staging/expired.webp" });
    expect(storage.deleteObject).toHaveBeenCalledWith({ key: "tickets/staging/complete.webp" });
    expect(deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: "expired-reservation" }) }),
    );
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: "issued-asset", state: "COMPLETE" }) }),
    );
    expect(storage.deleteObject).not.toHaveBeenCalledWith(
      expect.objectContaining({ key: expect.stringContaining("tickets/final/") }),
    );
  });
});
