# 인증

공통 코드는 `packages/auth`, 고객 API 는 `apps/users/app/api/v1/auth/*`. 요원 쪽은 같은 패키지에 나중에 붙입니다 (토큰 `aud` 로 구분).

## 흐름

```
Flutter (네이티브 소셜 로그인) ──소셜 토큰──▶ POST /api/v1/auth/social/{provider}
                                                │ 제공자에게 토큰 검증
                                                │ 처음 보는 계정이면 가입
                                                ▼
                                   액세스 · 리프레시 토큰을 httpOnly 쿠키로
                                                │
웹뷰(Next.js) ── 쿠키 자동 전송 ──▶ 로그인이 필요한 API
     │ 액세스 토큰 만료(401)
     └──▶ POST /api/v1/auth/refresh ── 새 토큰 쿠키
```

**왜 Flutter 에서 로그인하나**: 구글은 앱 안 웹뷰에서의 로그인을 막고(`disallowed_useragent`), 애플도 iOS 에선 네이티브가 표준입니다.

**Flutter → 웹뷰로 로그인 상태 넘기기**: 아직 미정. 소셜 토큰을 웹 페이지에 넘겨 웹이 API 를 부르는 방식(쿠키가 웹뷰에 바로 심김)을 추천. 어느 방식이든 API 는 같습니다.

## 토큰

| | 액세스 토큰 | 리프레시 토큰 |
|---|---|---|
| 형식 | JWT HS256 (`sub`=회원 ID, `aud`=`users`, `iss`=`makkigo`) | 무작위 32바이트 |
| 유효기간 | 15분 | 30일 |
| 쿠키 | `makkigo_access_token`, path `/` | `makkigo_refresh_token`, path `/api/v1/auth` |
| 저장 | 안 함 | DB 에 **SHA-256 해시만** |
| 폐기 | 불가 (짧은 수명) | 재발급(교체) · 로그아웃(이 기기) · 탈퇴(모든 기기) |

쿠키: `HttpOnly`, `SameSite=Lax`, 운영에서 `Secure`.

로그인 확인(`getCurrentUserId`)은 서명·만료·`aud`·`iss` 와 **탈퇴 여부**까지 봅니다. 탈퇴 직후 액세스 토큰도 바로 막힙니다.

## 프론트 주의점

- **재발급은 한 번만 보내기**: 여러 요청이 동시에 401 을 받고 각자 재발급을 부르면 하나만 성공하고, 실패 응답이 쿠키를 지워 새 쿠키까지 지울 수 있습니다. 공통 API 클라이언트에서 재발급을 하나로 묶고 나머지는 결과를 기다리게 합니다.
- 소셜 로그인 응답의 `isNewUser: true` 면 약관 동의 → 온보딩으로 보냅니다.

## 소셜 토큰 검증

| 제공자 | 받는 토큰 | 검증 |
|---|---|---|
| 카카오 | 액세스 토큰 | 토큰 정보의 `app_id` 가 `KAKAO_APP_ID` 인지 |
| 구글 | ID 토큰 | 공개키 서명 + `aud` 가 iOS·Android 클라이언트 ID 중 하나 |
| 애플 | ID 토큰 | 공개키 서명 + `aud` 가 번들 ID |
| 네이버 | 액세스 토큰 | 프로필 조회 성공 여부만 ⚠️ |

⚠️ 네이버는 토큰이 우리 앱에서 발급됐는지 확인하는 공식 수단을 찾지 못했습니다. `NAVER_CLIENT_ID` 는 현재 쓰이지 않습니다.

## 환경변수

로컬은 `apps/users/.env.development.local` 등, 운영은 SSM Parameter Store `/makkigo/prod/users/` → [deployment.md](deployment.md)


| 이름 | 값 |
|---|---|
| `DATABASE_URL` | Postgres 접속 주소 |
| `AUTH_JWT_SECRET` | `openssl rand -base64 32` |
| `KAKAO_APP_ID` | 카카오 개발자 콘솔의 앱 ID (숫자) |
| `GOOGLE_IOS_CLIENT_ID` | 구글 iOS 클라이언트 ID |
| `GOOGLE_ANDROID_CLIENT_ID` | Flutter `google_sign_in` 의 `serverClientId` (웹 유형 클라이언트 ID). iOS 에서도 `serverClientId` 를 쓰면 iOS 토큰의 대상도 이 값이 되므로 `GOOGLE_IOS_CLIENT_ID` 에도 같은 값을 넣습니다 |
| `APPLE_BUNDLE_ID` | iOS 앱 번들 ID |
| `NAVER_CLIENT_ID` | 현재 미사용 |
