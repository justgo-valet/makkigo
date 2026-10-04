export { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS } from "./config";
export { AuthConfigError, InvalidSocialTokenError } from "./errors";
export { parseSocialProvider, verifySocialToken } from "./providers";
export { signInUserWithSocial } from "./user-social-sign-in";

export type { SocialIdentity } from "./providers";
export type { IssuedToken } from "./tokens";
export type { UserSocialSignInResult } from "./user-social-sign-in";
