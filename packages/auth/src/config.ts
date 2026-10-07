import { AuthConfigError } from "./errors";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
export const OAUTH_STATE_TTL_SECONDS = 10 * 60;
export const LOGIN_CODE_TTL_SECONDS = 2 * 60;

export const requireEnv = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new AuthConfigError(name);
  }

  return value;
};

export const optionalEnv = (name: string): string | null => process.env[name]?.trim() || null;

export const getJwtSecret = () => new TextEncoder().encode(requireEnv("AUTH_JWT_SECRET"));
