import { apiClient } from "@/libs/common/api/apiClient";

import type { AppNativeLoginCredential } from "@/features/auth/appBridge";
import type { SocialLoginProvider } from "@/features/auth/socialLoginProviders";
import type { NativeLoginResponse } from "@/libs/auth/contracts/nativeLogin";

const completeNativeLogin = (provider: SocialLoginProvider, credential: AppNativeLoginCredential) =>
  apiClient.post(`auth/oauth/${provider}/native`, { json: credential }).json<NativeLoginResponse>();

export { completeNativeLogin };
