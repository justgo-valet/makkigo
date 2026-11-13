import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import LoginCard from "@/features/auth/LoginCard";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { isMerchantAdmin } from "@/server/auth/staffSession";

import type { LoginError } from "@/features/auth/LoginCard";

const parseError = (value: string | string[] | undefined): LoginError | null =>
  value === "cancelled" || value === "failed" || value === "role" ? value : null;

export default async function LoginPage({ searchParams }: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (staffId && (await isMerchantAdmin(staffId))) redirect("/");
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <LoginCard error={parseError((await searchParams).error)} />
    </main>
  );
}
