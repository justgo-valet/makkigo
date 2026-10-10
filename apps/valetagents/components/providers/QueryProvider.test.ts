import { describe, expect, it, vi } from "vitest";

import { cleanupSessionQueryClient, createSessionQueryClient } from "./QueryProvider";

describe("QueryProvider session client", () => {
  it("disables automatic query and mutation retries", () => {
    const queryClient = createSessionQueryClient();

    expect(queryClient.getDefaultOptions()).toMatchObject({
      mutations: { retry: false },
      queries: { retry: false },
    });
  });

  it("cancels pending work before clearing private cache data", async () => {
    const queryClient = createSessionQueryClient();
    queryClient.setQueryData(["staff", 1, "onboarding-status"], { state: "AWAITING_APPROVAL" });
    const cancelQueries = vi.spyOn(queryClient, "cancelQueries");
    const clear = vi.spyOn(queryClient, "clear");

    await cleanupSessionQueryClient(queryClient);

    expect(cancelQueries).toHaveBeenCalledOnce();
    expect(clear).toHaveBeenCalledOnce();
    expect(cancelQueries.mock.invocationCallOrder[0]).toBeLessThan(clear.mock.invocationCallOrder[0]);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it("creates a new cache for every authentication boundary", () => {
    const firstSession = createSessionQueryClient();
    const secondSession = createSessionQueryClient();
    firstSession.setQueryData(["staff", 1, "booths", "강남"], [{ id: 1 }]);

    expect(secondSession).not.toBe(firstSession);
    expect(secondSession.getQueryCache().getAll()).toHaveLength(0);
  });
});
