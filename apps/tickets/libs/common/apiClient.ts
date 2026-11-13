import { createApiClient } from "@makkigo/api-client";

export const apiClient = createApiClient({
  onAuthExpired: () => window.location.replace("/login"),
}).extend({ retry: { limit: 1, shouldRetry: () => false } });
