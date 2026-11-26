import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import LoginForm from "@/features/auth/LoginForm";
import PartnerLoginLink from "@/features/auth/PartnerLoginLink";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { getMerchantAdminFromToken } from "@/server/auth/merchantAdminSession";

export default async function LoginPage() {
  if (await getMerchantAdminFromToken((await cookies()).get(ACCESS_TOKEN_COOKIE)?.value)) redirect("/");
  const valetPublicUrl = process.env.VALET_PUBLIC_URL?.trim();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 pt-[calc(1.5rem+var(--safe-area-inset-top))] pb-[calc(1.5rem+var(--safe-area-inset-bottom))] sm:p-6">
      <div className="flex w-full max-w-sm flex-col gap-3">
        {valetPublicUrl && <PartnerLoginLink href={new URL("/login", valetPublicUrl).toString()} />}
        <LoginForm />
      </div>
    </main>
  );
}
