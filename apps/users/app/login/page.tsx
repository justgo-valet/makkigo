import { getActiveUserIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import LoginContent from "@/features/auth/components/LoginContent";
import { parseLoginError } from "@/features/auth/socialLoginProviders";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { getPathAfterLogin } from "@/server/auth/getPathAfterLogin";

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: Readonly<LoginPageProps>) {
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const userId = accessToken ? await getActiveUserIdFromAccessToken(accessToken) : null;

  if (userId) {
    redirect(await getPathAfterLogin(userId));
  }

  return <LoginContent error={parseLoginError((await searchParams).error)} />;
}
