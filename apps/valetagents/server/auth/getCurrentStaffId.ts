import "server-only";

import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";

import { ACCESS_TOKEN_COOKIE } from "./authCookies";

import type { NextRequest } from "next/server";

export const getCurrentStaffId = async (request: NextRequest) => {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  return accessToken ? getActiveStaffIdFromAccessToken(accessToken) : null;
};
