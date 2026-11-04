import "server-only";
import { revokeAppleRefreshToken } from "@makkigo/auth";

type AppleAccount = { providerRefreshToken: string | null; providerClientId: string | null };

/** 탈퇴한 요원의 애플 로그인 연결을 끊는다. 철회가 실패해도 탈퇴는 그대로 둔다. */
const revokeAppleTokens = (accounts: AppleAccount[]) =>
  Promise.all(
    accounts.flatMap(({ providerRefreshToken, providerClientId }) =>
      providerRefreshToken
        ? [
            revokeAppleRefreshToken(providerRefreshToken, providerClientId).catch(
              (error: unknown) => {
                console.error("Failed to revoke Apple token", {
                  errorName: error instanceof Error ? error.name : "UnknownError",
                });
              },
            ),
          ]
        : [],
    ),
  );

export { revokeAppleTokens };
