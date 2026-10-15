import { getActiveUserIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import TicketContent from "@/features/valet/components/TicketContent";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { getCurrentTicket } from "@/server/valet/getCurrentTicket";

export default async function TicketPage() {
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const userId = accessToken ? await getActiveUserIdFromAccessToken(accessToken) : null;
  if (!userId) redirect("/login");
  const design = await getCurrentTicket(userId);
  if (!design) notFound();
  const imageBaseUrl = process.env.IMAGE_BASE_URL?.trim();
  if (!imageBaseUrl) throw new Error("IMAGE_BASE_URL is required to render ticket images");
  return <TicketContent design={design} imageBaseUrl={imageBaseUrl} />;
}
