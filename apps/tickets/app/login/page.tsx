import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import LoginForm from "@/features/auth/LoginForm";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { getMerchantAdminFromToken } from "@/server/auth/merchantAdminSession";

export default async function LoginPage() {
  if (await getMerchantAdminFromToken((await cookies()).get(ACCESS_TOKEN_COOKIE)?.value)) redirect("/");
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <LoginForm />
    </main>
  );
}
