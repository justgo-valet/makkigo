import { AuthConfigError } from "./errors";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

export const requireEnv = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new AuthConfigError(name);
  }

  return value;
};
