import MerchantProfileView from "@/features/merchant/MerchantProfileView";
import StudioHeader from "@/features/tickets/components/StudioHeader";
import { requireMerchantAdminPage } from "@/server/auth/merchantAdminSession";
import { getMerchantProfile } from "@/server/merchant/getMerchantProfile";

export default async function MerchantPage() {
  const { merchant } = await requireMerchantAdminPage("/merchant");
  const imageBaseUrl = process.env.IMAGE_BASE_URL;
  if (!imageBaseUrl) throw new Error("IMAGE_BASE_URL is required");
  const usersPublicUrl = process.env.USERS_PUBLIC_URL;
  if (!usersPublicUrl) throw new Error("USERS_PUBLIC_URL is required");
  const profile = await getMerchantProfile(merchant.id, { imageBaseUrl, usersPublicUrl });

  return (
    <>
      <StudioHeader />
      <MerchantProfileView profile={profile} />
    </>
  );
}
