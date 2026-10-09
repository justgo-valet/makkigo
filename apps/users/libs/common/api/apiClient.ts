import { createApiClient } from "@makkigo/api-client";

const LOGIN_PATH = "/login";

const apiClient = createApiClient({
  onAuthExpired: () => {
    window.location.replace(LOGIN_PATH);
  },
});

export { apiClient };
