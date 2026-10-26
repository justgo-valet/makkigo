import { afterEach, describe, expect, it, vi } from "vitest";

import {
  askAppForPushToken,
  onAppPushToken,
  setAppAuthenticated,
} from "./appBridge";

describe("app bridge", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts push and authentication messages to the native channel", () => {
    const postMessage = vi.fn();
    vi.stubGlobal("window", { MakkigoApp: { postMessage } });

    askAppForPushToken();
    setAppAuthenticated(true);

    expect(postMessage.mock.calls.map(([message]) => JSON.parse(message))).toEqual([
      { type: "requestPushToken" },
      { type: "setAuthenticated", authenticated: true },
    ]);
  });

  it("distinguishes denied, retryable unavailable, and granted-without-token states", () => {
    const target = new EventTarget() as EventTarget & { MakkigoApp: { postMessage: () => void } };
    target.MakkigoApp = { postMessage: () => undefined };
    vi.stubGlobal("window", target);
    const listener = vi.fn();
    const unsubscribe = onAppPushToken(listener);

    for (const detail of [
      { token: null, platform: "IOS", permission: "denied" },
      { token: null, platform: "IOS", permission: "unavailable" },
      { token: null, platform: "IOS", permission: "granted" },
    ]) {
      target.dispatchEvent(new CustomEvent("makkigo:push-token", { detail }));
    }

    expect(listener.mock.calls.map(([state]) => state)).toEqual([
      { pushToken: null, isPermissionDenied: true, isUnavailable: false },
      { pushToken: null, isPermissionDenied: false, isUnavailable: true },
      { pushToken: null, isPermissionDenied: false, isUnavailable: false },
    ]);
    unsubscribe();
  });
});
