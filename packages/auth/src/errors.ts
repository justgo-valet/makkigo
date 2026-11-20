export class SocialAuthError extends Error {
  constructor(message = "소셜 로그인 정보를 확인하지 못했습니다.", options?: ErrorOptions) {
    super(message, options);
    this.name = "SocialAuthError";
  }
}

export class AuthConfigError extends Error {
  constructor(name: string) {
    super(`인증 환경변수 ${name} 가 설정되지 않았습니다.`);
    this.name = "AuthConfigError";
  }
}

export type PasswordLoginFailure = "INVALID_CREDENTIALS" | "LOCKED" | "DISABLED";

const PASSWORD_LOGIN_MESSAGES: Record<PasswordLoginFailure, string> = {
  INVALID_CREDENTIALS: "아이디 또는 비밀번호가 맞지 않습니다.",
  LOCKED: "로그인을 여러 번 실패해 잠시 잠겼습니다. 15분 뒤에 다시 시도해 주세요.",
  DISABLED: "사용이 중지된 계정입니다.",
};

export class PasswordLoginError extends Error {
  readonly reason: PasswordLoginFailure;

  constructor(reason: PasswordLoginFailure) {
    super(PASSWORD_LOGIN_MESSAGES[reason]);
    this.name = "PasswordLoginError";
    this.reason = reason;
  }
}

export class InvalidPasswordError extends Error {
  constructor() {
    super("새 비밀번호는 8~72자이고 지금 비밀번호와 달라야 합니다.");
    this.name = "InvalidPasswordError";
  }
}

export class InvalidRefreshTokenError extends Error {
  constructor() {
    super("리프레시 토큰이 유효하지 않습니다.");
    this.name = "InvalidRefreshTokenError";
  }
}
