import { describe, expect, it, vi } from "vitest";

import { createPushDeviceSync } from "./pushDeviceSync";

describe("createPushDeviceSync", () => {
  it("serializes token updates on one stable installation", async () => {
    let stored = { staffId: 7 };
    const register = vi.fn(async () => undefined);
    const sync = createPushDeviceSync(7, {
      read: () => stored,
      save: (next) => { stored = next!; },
      register,
      remove: vi.fn(async () => undefined),
    });

    await Promise.all([
      sync.sync({ token: "new-1", platform: "IOS" }),
      sync.sync({ token: "new-2", platform: "IOS" }),
    ]);

    expect(register.mock.calls).toEqual([
      [{ token: "new-1", platform: "IOS" }],
      [{ token: "new-2", platform: "IOS" }],
    ]);
    expect(stored).toEqual({ staffId: 7 });
  });

  it("retries the same installation after a lost or failed registration response", async () => {
    let attempts = 0;
    const register = vi.fn(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("response lost");
    });
    const save = vi.fn();
    const sync = createPushDeviceSync(7, {
      read: () => null,
      save,
      register,
      remove: vi.fn(async () => undefined),
    });

    await expect(sync.sync({ token: "same", platform: "ANDROID" })).rejects.toThrow("response lost");
    await expect(sync.sync({ token: "same", platform: "ANDROID" })).resolves.toBeUndefined();

    expect(register).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenCalledWith({ staffId: 7 });
  });

  it("never sends another account's remembered token under the current account", async () => {
    let stored: { staffId: number } | null = { staffId: 6 };
    const save = vi.fn((next) => { stored = next; });
    const register = vi.fn(async () => undefined);
    const remove = vi.fn(async () => undefined);
    const sync = createPushDeviceSync(7, { read: () => stored, save, register, remove });

    await sync.sync({ token: "account-b", platform: "ANDROID" });

    expect(remove).not.toHaveBeenCalled();
    expect(register).toHaveBeenCalledWith({ token: "account-b", platform: "ANDROID" });
    expect(save).toHaveBeenLastCalledWith({ staffId: 7 });
  });

  it("keeps the remembered token when server removal fails so a later retry can clean it", async () => {
    const stored = { staffId: 7 };
    const save = vi.fn();
    const sync = createPushDeviceSync(7, {
      read: () => stored,
      save,
      register: vi.fn(async () => undefined),
      remove: vi.fn(async () => { throw new Error("offline"); }),
    });

    await expect(sync.sync(null)).rejects.toThrow("offline");
    expect(save).not.toHaveBeenCalled();
  });
});
