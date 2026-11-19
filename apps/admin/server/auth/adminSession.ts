import "server-only";

import { getActiveAdminIdFromAccessToken } from "@makkigo/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_TOKEN_COOKIE } from "./authCookies";

import type { NextRequest } from "next/server";

const requireAdminPage = async (path: string) => {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) redirect(`/api/v1/auth/refresh?${new URLSearchParams({ next: path })}`);
  const adminId = await getActiveAdminIdFromAccessToken(token);
  if (!adminId) redirect(`/api/v1/auth/refresh?${new URLSearchParams({ next: path })}`);
  return adminId;
};

const getAdminId = async (request: NextRequest) => {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  return token ? getActiveAdminIdFromAccessToken(token) : null;
};

export { getAdminId, requireAdminPage };
