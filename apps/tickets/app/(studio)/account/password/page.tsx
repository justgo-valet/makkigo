import PasswordForm from "@/features/auth/PasswordForm";
import StudioHeader from "@/features/tickets/components/StudioHeader";
import { getMerchantAdminSession } from "@/server/auth/merchantAdminSession";

export default async function PasswordPage() {
  const { passwordChangeRequired } = await getMerchantAdminSession("/account/password");

  return (
    <>
      <StudioHeader nav={!passwordChangeRequired} />
      <main className="flex justify-center px-4 pt-10 pb-[calc(4rem+var(--safe-area-inset-bottom))] sm:px-6 sm:pt-16">
        <PasswordForm required={passwordChangeRequired} />
      </main>
    </>
  );
}
