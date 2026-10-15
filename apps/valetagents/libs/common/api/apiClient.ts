import { createApiClient } from "@makkigo/api-client";

import { cleanupActiveQuerySession } from "@/libs/common/query/querySession";

const LOGIN_PATH = "/login";

interface CreateValetApiClientOptions {
  baseUrl?: string;
  onAuthExpired?: () => void | Promise<void>;
}

const cleanupAndRedirectToLogin = async () => {
  await cleanupActiveQuerySession();
  window.location.replace(LOGIN_PATH);
};

export const createValetApiClient = ({
  baseUrl,
  onAuthExpired = cleanupAndRedirectToLogin,
}: CreateValetApiClientOptions = {}) => {
  let expiring = false;
  const expireSession = () => {
    if (expiring) return;
    expiring = true;
    void Promise.resolve(onAuthExpired());
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
