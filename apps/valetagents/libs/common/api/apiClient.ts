import { createApiClient } from "@makkigo/api-client";

import { cleanupExpiredPushSession } from "@/features/push/cleanupExpiredPushSession";
import { cleanupActiveQuerySession } from "@/libs/common/query/querySession";

const LOGIN_PATH = "/login";

interface CreateValetApiClientOptions {
  baseUrl?: string;
  onAuthExpired?: () => void | Promise<void>;
}

const cleanupAndRedirectToLogin = async () => {
  let cleanupFailed = false;
  try {
    await cleanupExpiredPushSession();
  } catch (error) {
    console.error("Failed to clean up expired staff push session", error);
    cleanupFailed = true;
  } finally {
    await cleanupActiveQuerySession();
    window.location.replace(cleanupFailed ? `${LOGIN_PATH}?error=failed` : LOGIN_PATH);
  }
};

export const createValetApiClient = ({
  baseUrl,
  onAuthExpired = cleanupAndRedirectToLogin,
}: CreateValetApiClientOptions = {}) => {
  let expiring = false;
  const expireSession = () => {
    if (expiring) return;
    expiring = true;
    void Promise.resolve(onAuthExpired()).catch((error: unknown) => {
      console.error("Failed to expire staff session", error);
    });
  };

  return createApiClient({ baseUrl, onAuthExpired: expireSession }).extend({
    hooks: {
      afterResponse: [
        ({ response, retryCount }) => {
          if (response.status === 401 && retryCount > 0) expireSession();
        },
      ],
    },
    retry: {
      limit: 1,
      shouldRetry: () => false,
    },
  });
};

const apiClient = createValetApiClient();

export { apiClient };
