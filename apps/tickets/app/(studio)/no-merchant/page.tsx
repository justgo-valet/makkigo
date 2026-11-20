import { redirect } from "next/navigation";

import StudioHeader from "@/features/tickets/components/StudioHeader";
import { getMerchantAdminSession } from "@/server/auth/merchantAdminSession";

export default async function NoMerchantPage() {
  const merchantAdmin = await getMerchantAdminSession("/no-merchant");
  if (merchantAdmin.passwordChangeRequired) redirect("/account/password");
  if (merchantAdmin.merchant) redirect("/");

  return (
    <>
      <StudioHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="mt-16 rounded-2xl border border-dashed border-black/10 bg-white p-10 text-center text-sm text-(--tertiary-color)">
          아직 연결된 업체가 없어요. 운영팀에 문의해 주세요.
        </p>
      </main>
    </>
  );
}
