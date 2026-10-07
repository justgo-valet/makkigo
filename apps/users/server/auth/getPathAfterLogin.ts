import "server-only";
import { getMe } from "@/server/user/getMe";

const getPathAfterLogin = async (userId: number) => {
  const me = await getMe(userId);

  return me.requiredConsentsAgreed && me.onboardingCompleted ? "/" : "/onboarding";
};

export { getPathAfterLogin };
