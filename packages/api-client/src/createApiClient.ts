import ky from "ky";

import type { KyInstance } from "ky";

const NO_REFRESH_PATHS = [
  /\/auth\/social\//,
  /\/auth\/oauth\//,
  /\/auth\/refresh$/,
  /\/auth\/logout$/,
];

export interface CreateApiClientOptions {
  onAuthExpired: () => void;
  prefix?: string;
  baseUrl?: string;
}

export const createApiClient = ({
  onAuthExpired,
  prefix = "/api/v1",
  baseUrl,
}: CreateApiClientOptions): KyInstance => {
  let refreshing: Promise<boolean> | null = null;

  const refreshTokens = () => {
    refreshing ??= ky
      .post("auth/refresh", {
        prefix,
        baseUrl,
        credentials: "same-origin",
        retry: 0,
        throwHttpErrors: false,
      })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });

    return refreshing;
  };

  return ky.create({
    prefix,
    baseUrl,
    credentials: "same-origin",
    timeout: 10_000,
    hooks: {
      afterResponse: [
        async ({ request, response, retryCount }) => {
          if (response.status !== 401 || retryCount > 0) {
            return;
          }

          const { pathname } = new URL(request.url);

          if (NO_REFRESH_PATHS.some((path) => path.test(pathname))) {
            return;
          }

          if (await refreshTokens()) {
            return ky.retry({ delay: 0 });
          }

          onAuthExpired();
        },
      ],
    },
  });
};
