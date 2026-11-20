import { getActiveAdminIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import LoginForm from "@/features/auth/LoginForm";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";

export default async function LoginPage() {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (token && (await getActiveAdminIdFromAccessToken(token))) redirect("/");
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <LoginForm />
    </main>
  );
}
