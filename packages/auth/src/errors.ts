export class InvalidSocialTokenError extends Error {
  constructor(message = "소셜 토큰이 유효하지 않습니다.", options?: ErrorOptions) {
    super(message, options);
    this.name = "InvalidSocialTokenError";
  }
}

export class AuthConfigError extends Error {
  constructor(name: string) {
    super(`인증 환경변수 ${name} 가 설정되지 않았습니다.`);
    this.name = "AuthConfigError";
  }
}

export class InvalidRefreshTokenError extends Error {
  constructor() {
    super("리프레시 토큰이 유효하지 않습니다.");
    this.name = "InvalidRefreshTokenError";
  }
}
