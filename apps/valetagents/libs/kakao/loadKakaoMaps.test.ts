import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  KAKAO_MAP_LOAD_TIMEOUT_MS,
  KAKAO_MAP_SCRIPT_ID,
  loadKakaoMaps,
  resetKakaoMapsLoaderForTests,
} from "./loadKakaoMaps";

interface FakeScript {
  id: string;
  async: boolean;
  src: string;
  isConnected: boolean;
  listeners: Map<string, () => void>;
  addEventListener: (name: string, listener: () => void) => void;
  removeEventListener: (name: string) => void;
  remove: ReturnType<typeof vi.fn>;
}

const createFakeBrowser = () => {
  const script: FakeScript = {
    id: "",
    async: false,
    src: "",
    isConnected: false,
    listeners: new Map(),
    addEventListener(name, listener) {
      this.listeners.set(name, listener);
    },
    removeEventListener(name) {
      this.listeners.delete(name);
    },
    remove: vi.fn(() => {
      script.isConnected = false;
    }),
  };
  const browserWindow = {
    kakao: undefined as
      | undefined
      | { maps: { load: (callback: () => void) => void } },
    setTimeout,
    clearTimeout,
  };
  const browserDocument = {
    getElementById: vi.fn(() => null),
    createElement: vi.fn(() => script),
    head: {
      append: vi.fn(() => {
        script.isConnected = true;
      }),
    },
  };

  vi.stubGlobal("window", browserWindow);
  vi.stubGlobal("document", browserDocument);

  return { browserDocument, browserWindow, script };
};

describe("loadKakaoMaps", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetKakaoMapsLoaderForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("maps.load 콜백이 완료될 때까지 동일한 promise를 대기한다", async () => {
    const { browserDocument, browserWindow, script } = createFakeBrowser();
    let finishLoading: (() => void) | undefined;
    const maps = {
      load: vi.fn((callback: () => void) => {
        finishLoading = callback;
      }),
    };

    const first = loadKakaoMaps("public-key");
    const second = loadKakaoMaps("public-key");

    expect(second).toBe(first);
    expect(browserDocument.head.append).toHaveBeenCalledTimes(1);
    expect(script.id).toBe(KAKAO_MAP_SCRIPT_ID);
    expect(script.src).toContain("https://dapi.kakao.com/v2/maps/sdk.js");
    expect(script.src).toContain("autoload=false&libraries=services");

    browserWindow.kakao = { maps };
    script.listeners.get("load")?.();
    expect(maps.load).toHaveBeenCalledTimes(1);

    let resolved = false;
    void first.then(() => {
      resolved = true;
    });
    await Promise.resolve();
    expect(resolved).toBe(false);

    finishLoading?.();
    await expect(first).resolves.toBe(maps);
    await expect(second).resolves.toBe(maps);
    await expect(loadKakaoMaps("public-key")).resolves.toBe(maps);
    expect(maps.load).toHaveBeenCalledTimes(1);
  });

  it("timeout 실패 후 promise와 script를 정리해 재시도할 수 있다", async () => {
    const { browserDocument, script } = createFakeBrowser();
    const first = loadKakaoMaps("public-key");
    const rejected = expect(first).rejects.toThrow("응답 시간이 초과");

    await vi.advanceTimersByTimeAsync(KAKAO_MAP_LOAD_TIMEOUT_MS);
    await rejected;
    expect(script.remove).toHaveBeenCalled();

    const second = loadKakaoMaps("public-key");
    expect(second).not.toBe(first);
    expect(browserDocument.createElement).toHaveBeenCalledTimes(2);
    void second.catch(() => undefined);
  });

  it("script 오류 후 로더 상태를 초기화해 재시도할 수 있다", async () => {
    const { browserDocument, script } = createFakeBrowser();
    const first = loadKakaoMaps("public-key");
    const rejected = expect(first).rejects.toThrow("SDK를 불러오지 못했습니다");

    script.listeners.get("error")?.();
    await rejected;
    expect(script.remove).toHaveBeenCalled();

    const second = loadKakaoMaps("public-key");
    expect(second).not.toBe(first);
    expect(browserDocument.createElement).toHaveBeenCalledTimes(2);
    void second.catch(() => undefined);
  });

  it("부분 글로벌이 남은 timeout 후에도 재시도 콜백 전에는 완료하지 않는다", async () => {
    const { browserDocument, browserWindow } = createFakeBrowser();
    const callbacks: Array<() => void> = [];
    const maps = {
      load: vi.fn((callback: () => void) => {
        callbacks.push(callback);
      }),
    };
    browserWindow.kakao = { maps };

    const first = loadKakaoMaps("public-key");
    const firstRejected = expect(first).rejects.toThrow("응답 시간이 초과");
    expect(maps.load).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(KAKAO_MAP_LOAD_TIMEOUT_MS);
    await firstRejected;

    const second = loadKakaoMaps("public-key");
    expect(second).not.toBe(first);
    expect(browserDocument.createElement).toHaveBeenCalledTimes(2);
    expect(maps.load).toHaveBeenCalledTimes(2);

    callbacks[0]?.();
    let resolved = false;
    void second.then(() => {
      resolved = true;
    });
    await Promise.resolve();
    expect(resolved).toBe(false);

    callbacks[1]?.();
    await expect(second).resolves.toBe(maps);
  });

  it("빈 공개 키는 script를 만들지 않고 실패한다", async () => {
    const { browserDocument } = createFakeBrowser();

    await expect(loadKakaoMaps(" ")).rejects.toThrow("앱 키가 설정되지 않았습니다");
    expect(browserDocument.createElement).not.toHaveBeenCalled();
  });
});
