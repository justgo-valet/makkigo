import { afterEach, describe, expect, it, vi } from "vitest";

import {
  readPushInstallationSecret,
  requirePushInstallationSecret,
} from "./installationSecret";

describe("push installation secret", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists and reads back a 256-bit base64url secret", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });
    vi.stubGlobal("crypto", { getRandomValues: (bytes: Uint8Array) => bytes.fill(7) });

    const secret = requirePushInstallationSecret();

    expect(secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(readPushInstallationSecret()).toBe(secret);
  });

  it("fails before registration when persistence cannot be verified", () => {
    vi.stubGlobal("window", {
      localStorage: { getItem: () => null, setItem: () => undefined },
    });
    vi.stubGlobal("crypto", { getRandomValues: (bytes: Uint8Array) => bytes.fill(8) });

    expect(() => requirePushInstallationSecret()).toThrow("확인하지 못했습니다");
  });

  it("fails before registration when storage rejects the write", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => null,
        setItem: () => { throw new Error("storage disabled"); },
      },
    });
    vi.stubGlobal("crypto", { getRandomValues: (bytes: Uint8Array) => bytes.fill(9) });

    expect(() => requirePushInstallationSecret()).toThrow("저장하지 못했습니다");
  });
});
