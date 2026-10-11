import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import QueryProvider from "@/components/providers/QueryProvider";
import AgentManagement from "@/features/agents/components/AgentManagement";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { listBoothAgents } from "@/server/booth/listBoothAgents";

interface BoothAgentsPageProps {
  params: Promise<{ boothId: string }>;
}

export default async function BoothAgentsPage({ params }: Readonly<BoothAgentsPageProps>) {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) redirect("/login");

  const boothId = Number((await params).boothId);
  if (!Number.isSafeInteger(boothId) || boothId <= 0) notFound();

  const initialAgents = await listBoothAgents(staffId, boothId, 1);
  if (!initialAgents.ok) notFound();

  return (
    <QueryProvider sessionKey={staffId}>
      <AgentManagement staffId={staffId} boothId={boothId} initialData={initialAgents.value} />
    </QueryProvider>
  );
}
