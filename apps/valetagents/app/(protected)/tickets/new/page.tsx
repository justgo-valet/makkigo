import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import TicketEditor from "@/features/tickets/components/TicketEditor";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { getStaffMenuAccess } from "@/server/auth/getStaffMenuAccess";
import { listOwnMerchants } from "@/server/merchant/listOwnMerchants";
import { requireProtectedStaff } from "@/server/onboarding/requireProtectedStaff";

export default async function NewTicketPage() {
  const imageBaseUrl = process.env.IMAGE_BASE_URL;
  if (!imageBaseUrl) throw new Error("IMAGE_BASE_URL is required to edit tickets");
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) redirect("/login");
  const onboarding = await requireProtectedStaff(staffId);
  if (onboarding.role !== "MERCHANT_ADMIN") redirect(onboarding.nextPath);
  const [menu, merchants] = await Promise.all([
    getStaffMenuAccess(staffId),
    listOwnMerchants(staffId, imageBaseUrl),
  ]);
  if (!menu) redirect("/login");
  return (
    <TicketEditor
      initialDesign={{ version: 1, shape: "ROUND_RECT", backgroundColor: "#FFFFFF", layers: [] }}
      initialMerchantId={merchants.items.length === 1 ? merchants.items[0].id : undefined}
      merchants={merchants.items.map(({ id, name }) => ({ id, name }))}
      imageBaseUrl={imageBaseUrl}
      menu={menu}
    />
  );
}
