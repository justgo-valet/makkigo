import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";

export default async function Home() {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) redirect("/login");
  return <div><h1>Valet Agents</h1><p>발렛 에이전트 앱이 준비되었습니다.</p></div>;
}
