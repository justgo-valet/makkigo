export { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS } from "./config";
export { AuthConfigError, InvalidRefreshTokenError, InvalidSocialTokenError } from "./errors";
export { parseSocialProvider, verifySocialToken } from "./providers";
export { revokeUserRefreshToken } from "./user-logout";
export { signInUserWithSocial } from "./user-social-sign-in";
export { refreshUserTokens } from "./user-token-refresh";

export type { SocialIdentity } from "./providers";
export type { IssuedToken } from "./tokens";
export type { UserSocialSignInResult } from "./user-social-sign-in";
