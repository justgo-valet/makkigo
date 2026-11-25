import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AppSessionBridge from "@/features/auth/components/AppSessionBridge";
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
  const ticketsPublicUrl = process.env.TICKETS_PUBLIC_URL?.trim();
  if (!ticketsPublicUrl) throw new Error("환경변수 TICKETS_PUBLIC_URL 이 설정되지 않았습니다.");
  return (
    <>
      <AppSessionBridge authenticated={false} />
      <LoginContent
        error={parseLoginError((await searchParams).error)}
        merchantAdminLoginUrl={new URL("/login", ticketsPublicUrl).toString()}
      />
    </>
  );
}
