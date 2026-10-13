import { afterEach, describe, expect, it, vi } from "vitest";

import { createUuid } from "./createUuid";

describe("createUuid", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("builds a version 4 UUID where crypto.randomUUID is missing", () => {
    vi.stubGlobal("crypto", { getRandomValues: (bytes: Uint8Array) => bytes.fill(0xff) });

    expect(createUuid()).toBe("ffffffff-ffff-4fff-bfff-ffffffffffff");
  });
});
