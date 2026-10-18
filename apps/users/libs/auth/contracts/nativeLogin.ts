import { z } from "zod";

const token = z.string().trim().min(1).max(8192);

/** 앱이 제공자 SDK 로 받아 넘긴 값. 카카오는 `accessToken`, 구글은 `idToken`, 애플은 `idToken` + `authorizationCode`. */
const nativeLoginRequestSchema = z.object({
  accessToken: token.optional(),
  idToken: token.optional(),
  authorizationCode: token.optional(),
});

type NativeLoginRequest = z.infer<typeof nativeLoginRequestSchema>;

interface NativeLoginResponse {
  /** 로그인 뒤 갈 경로 (`/` 또는 `/onboarding`) */
  redirectTo: string;
}

export { nativeLoginRequestSchema };
export type { NativeLoginRequest, NativeLoginResponse };
