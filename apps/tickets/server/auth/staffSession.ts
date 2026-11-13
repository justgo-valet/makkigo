import "server-only";

import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { prisma } from "database";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_TOKEN_COOKIE } from "./authCookies";

import type { NextRequest } from "next/server";

const isMerchantAdmin = async (staffId: number) => {
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, deletedAt: null },
    select: { role: true },
  });
  return staff?.role === "MERCHANT_ADMIN";
};

const requireMerchantAdminPage = async (path: string) => {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) redirect(`/api/v1/auth/refresh?${new URLSearchParams({ next: path })}`);
  const staffId = await getActiveStaffIdFromAccessToken(token);
  if (!staffId) redirect("/login");
  if (!(await isMerchantAdmin(staffId))) redirect("/login?error=role");
  return staffId;
};

const getMerchantAdminId = async (request: NextRequest) => {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) return { ok: false as const, status: 401 as const };
  if (!(await isMerchantAdmin(staffId))) return { ok: false as const, status: 403 as const };
  return { ok: true as const, staffId };
};

export { getMerchantAdminId, isMerchantAdmin, requireMerchantAdminPage };
