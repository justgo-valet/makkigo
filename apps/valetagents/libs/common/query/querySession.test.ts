import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupActiveQuerySession, registerQuerySessionCleanup } from "./querySession";

describe("query session cleanup", () => {
  afterEach(async () => {
    await cleanupActiveQuerySession();
  });

  it("runs only the currently registered session cleanup", async () => {
    const staleCleanup = vi.fn();
    const activeCleanup = vi.fn();

    registerQuerySessionCleanup(staleCleanup);
    registerQuerySessionCleanup(activeCleanup);
    await cleanupActiveQuerySession();
    await cleanupActiveQuerySession();

    expect(staleCleanup).not.toHaveBeenCalled();
    expect(activeCleanup).toHaveBeenCalledTimes(1);
  });

  it("does not unregister a newer session when an old provider unmounts", async () => {
    const oldCleanup = vi.fn();
    const activeCleanup = vi.fn();
    const unregisterOld = registerQuerySessionCleanup(oldCleanup);
    registerQuerySessionCleanup(activeCleanup);

    unregisterOld();
    await cleanupActiveQuerySession();

    expect(oldCleanup).not.toHaveBeenCalled();
    expect(activeCleanup).toHaveBeenCalledTimes(1);
  });
});
