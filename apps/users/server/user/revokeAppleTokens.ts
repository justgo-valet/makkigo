import "server-only";
import { revokeAppleRefreshToken } from "@makkigo/auth";

type AppleToken = { refreshToken: string; clientId: string | null };

const revokeAppleTokens = (tokens: AppleToken[]) =>
  Promise.all(
    tokens.map(({ refreshToken, clientId }) =>
      revokeAppleRefreshToken(refreshToken, clientId).catch((error: unknown) => {
        console.error("Failed to revoke Apple token", {
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
      }),
    ),
  );

const toAppleTokens = (
  accounts: { providerRefreshToken: string | null; providerClientId: string | null }[],
) =>
  accounts.flatMap(({ providerRefreshToken, providerClientId }) =>
    providerRefreshToken
      ? [{ refreshToken: providerRefreshToken, clientId: providerClientId }]
      : [],
  );

export { revokeAppleTokens, toAppleTokens };
