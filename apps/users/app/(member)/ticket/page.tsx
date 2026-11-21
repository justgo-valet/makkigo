import { getActiveUserIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import TicketHistory from "@/features/ticket/components/TicketHistory";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { getTickets } from "@/server/valet/getTickets";

export default async function TicketPage() {
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const userId = accessToken ? await getActiveUserIdFromAccessToken(accessToken) : null;
  if (!userId) redirect("/login");
  const imageBaseUrl = process.env.IMAGE_BASE_URL?.trim();
  if (!imageBaseUrl) throw new Error("IMAGE_BASE_URL is required to render ticket images");
  return <TicketHistory tickets={await getTickets(userId)} imageBaseUrl={imageBaseUrl} />;
}
