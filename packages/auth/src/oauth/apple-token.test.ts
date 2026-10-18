import { exportPKCS8, generateKeyPair } from "jose";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { exchangeAppleCodeForRefreshToken, revokeAppleRefreshToken } from "./apple-token";

const ENV_NAMES = ["APPLE_SERVICES_ID", "APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY"];
let privateKeyPem = "";

const setAppleEnv = () => {
  vi.stubEnv("APPLE_SERVICES_ID", "com.makkigo.web");
  vi.stubEnv("APPLE_TEAM_ID", "TEAM123456");
  vi.stubEnv("APPLE_KEY_ID", "KEY1234567");
  vi.stubEnv("APPLE_PRIVATE_KEY", privateKeyPem.replace(/\n/g, "\\n"));
};

const readForm = (call: unknown[]) =>
  Object.fromEntries((call[1] as RequestInit).body as URLSearchParams);

describe("apple token", () => {
  beforeAll(async () => {
    const { privateKey } = await generateKeyPair("ES256", { extractable: true });
    privateKeyPem = await exportPKCS8(privateKey);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("skips Apple when the key settings are missing", async () => {
    for (const name of ENV_NAMES) vi.stubEnv(name, "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(
      await exchangeAppleCodeForRefreshToken("code", {
        clientId: "com.makkigo.web",
        redirectUri: "https://app/callback",
      }),
    ).toBeNull();
    expect(await revokeAppleRefreshToken("refresh", null)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("exchanges the authorization code with a signed client secret", async () => {
    setAppleEnv();
    const fetchMock = vi.fn(async () => Response.json({ refresh_token: "apple-refresh" }));
    vi.stubGlobal("fetch", fetchMock);

    expect(
      await exchangeAppleCodeForRefreshToken("code", {
        clientId: "com.makkigo.web",
        redirectUri: "https://app/callback",
      }),
    ).toBe("apple-refresh");

    const [url] = fetchMock.mock.calls[0] as unknown[];
    const form = readForm(fetchMock.mock.calls[0] as unknown[]);
    expect(url).toBe("https://appleid.apple.com/auth/token");
    expect(form).toMatchObject({
      client_id: "com.makkigo.web",
      grant_type: "authorization_code",
      code: "code",
      redirect_uri: "https://app/callback",
    });
    expect(form.client_secret?.split(".")).toHaveLength(3);
  });

  it("revokes the refresh token and throws when Apple refuses", async () => {
    setAppleEnv();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await revokeAppleRefreshToken("apple-refresh", null)).toBe(true);
    expect(readForm(fetchMock.mock.calls[0] as unknown[])).toMatchObject({
      client_id: "com.makkigo.web",
      token: "apple-refresh",
      token_type_hint: "refresh_token",
    });
    await expect(revokeAppleRefreshToken("apple-refresh", null)).rejects.toThrow("400");
  });

  it("exchanges and revokes an app sign-in token with the bundle ID", async () => {
    setAppleEnv();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ refresh_token: "apple-refresh" }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    expect(
      await exchangeAppleCodeForRefreshToken("code", {
        clientId: "com.makkigo.user",
        redirectUri: null,
      }),
    ).toBe("apple-refresh");
    const exchangeForm = readForm(fetchMock.mock.calls[0] as unknown[]);
    expect(exchangeForm).toMatchObject({ client_id: "com.makkigo.user", code: "code" });
    expect(exchangeForm).not.toHaveProperty("redirect_uri");

    expect(await revokeAppleRefreshToken("apple-refresh", "com.makkigo.user")).toBe(true);
    expect(readForm(fetchMock.mock.calls[1] as unknown[])).toMatchObject({
      client_id: "com.makkigo.user",
    });
  });
});
