import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import LoginContent from "@/features/auth/components/LoginContent";
import { parseLoginError } from "@/features/auth/socialLoginProviders";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { getPathAfterLogin } from "@/server/auth/getPathAfterLogin";

export default async function LoginPage({ searchParams }: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (staffId) redirect(await getPathAfterLogin(staffId));
  return <LoginContent error={parseLoginError((await searchParams).error)} />;
}
