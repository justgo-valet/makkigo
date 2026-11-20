import "server-only";

import { getActiveMerchantAdminIdFromAccessToken } from "@makkigo/auth";
import { prisma } from "database";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_TOKEN_COOKIE } from "./authCookies";

const findMerchantAdmin = async (merchantAdminId: number) => {
  const merchantAdmin = await prisma.merchantAdmin.findFirst({
    where: { id: merchantAdminId, disabledAt: null },
    select: {
      id: true,
      passwordChangeRequired: true,
      merchant: { select: { id: true, name: true, deletedAt: true } },
    },
  });
  if (!merchantAdmin) return null;
  const { merchant } = merchantAdmin;
  return {
    id: merchantAdmin.id,
    passwordChangeRequired: merchantAdmin.passwordChangeRequired,
    merchant: merchant && !merchant.deletedAt ? { id: merchant.id, name: merchant.name } : null,
  };
};

const getMerchantAdminFromToken = async (token: string | undefined) => {
  const merchantAdminId = token ? await getActiveMerchantAdminIdFromAccessToken(token) : null;
  return merchantAdminId ? findMerchantAdmin(merchantAdminId) : null;
};

const getMerchantAdminSession = async (path: string) => {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) redirect(`/api/v1/auth/refresh?${new URLSearchParams({ next: path })}`);
  const merchantAdmin = await getMerchantAdminFromToken(token);
  if (!merchantAdmin) redirect("/login");
  return merchantAdmin;
};

const requireMerchantAdminPage = async (path: string) => {
  const merchantAdmin = await getMerchantAdminSession(path);
  if (merchantAdmin.passwordChangeRequired) redirect("/account/password");
  if (!merchantAdmin.merchant) redirect("/no-merchant");
  return { merchantAdminId: merchantAdmin.id, merchant: merchantAdmin.merchant };
};

export { getMerchantAdminFromToken, getMerchantAdminSession, requireMerchantAdminPage };
