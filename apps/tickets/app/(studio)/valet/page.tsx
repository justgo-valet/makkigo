import StudioHeader from "@/features/tickets/components/StudioHeader";
import ValetBoard from "@/features/valet/ValetBoard";
import { requireMerchantAdminPage } from "@/server/auth/merchantAdminSession";
import { listMerchantValetSessions } from "@/server/valet/listMerchantValetSessions";

const loadSessions = async (merchantId: number, imageBaseUrl: string) => ({
  data: await listMerchantValetSessions(merchantId, imageBaseUrl),
  loadedAt: Date.now(),
});

export default async function ValetPage() {
  const { merchant } = await requireMerchantAdminPage("/valet");
  const imageBaseUrl = process.env.IMAGE_BASE_URL;
  if (!imageBaseUrl) throw new Error("IMAGE_BASE_URL is required");
  const sessions = await loadSessions(merchant.id, imageBaseUrl);

  return (
    <>
      <StudioHeader />
      <ValetBoard initialData={sessions.data} initialDataUpdatedAt={sessions.loadedAt} />
    </>
  );
}
