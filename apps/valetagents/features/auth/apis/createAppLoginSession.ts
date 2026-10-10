import type { SocialLoginProvider } from "@/features/auth/socialLoginProviders";
import type { AppLoginSession } from "@/libs/auth/contracts/appLoginSession";

const createAppLoginSession = async (provider: SocialLoginProvider) => {
  const response = await fetch(`/api/v1/auth/oauth/${provider}/app-session`, { method: "POST" });
  if (!response.ok) throw new Error("app session failed");
  return (await response.json()) as AppLoginSession;
};

export { createAppLoginSession };
