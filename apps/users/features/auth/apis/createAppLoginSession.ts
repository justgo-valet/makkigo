import { apiClient } from "@/libs/common/api/apiClient";

import type { SocialLoginProvider } from "@/features/auth/socialLoginProviders";
import type { AppLoginSession } from "@/libs/auth/contracts/appLoginSession";

const createAppLoginSession = (provider: SocialLoginProvider) =>
  apiClient.post(`auth/oauth/${provider}/app-session`).json<AppLoginSession>();

export { createAppLoginSession };
