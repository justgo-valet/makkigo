import "server-only";
import { getActiveUserIdFromAccessToken } from "@makkigo/auth";

import { ACCESS_TOKEN_COOKIE } from "./authCookies";

import type { NextRequest } from "next/server";

const getCurrentUserId = async (request: NextRequest) => {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  return accessToken ? getActiveUserIdFromAccessToken(accessToken) : null;
};

export { getCurrentUserId };
