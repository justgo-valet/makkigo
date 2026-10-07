# 인증

공통 코드는 `packages/auth`, 고객 API 는 `apps/users/app/api/v1/auth/*`. 요원 쪽은 같은 패키지에 나중에 붙입니다 (토큰 `aud` 로 구분).

## 흐름

소셜 로그인은 **Next.js 서버가 OAuth(인가 코드 방식)로 처리**합니다. 앱은 로그인 페이지를 **시스템 브라우저 창**으로 열어 주기만 합니다.

```
[일반 브라우저]
/login ─▶ GET /api/v1/auth/oauth/{provider}           state(서명) + CSRF 쿠키, 제공자 로그인 페이지로
             └▶ 제공자 로그인 ─▶ /api/v1/auth/oauth/{provider}/callback
                                   │ 인가 코드 → 제공자 토큰 → 회원 확인 · 처음이면 가입
                                   ▼
                    우리 토큰 쿠키 + /onboarding 또는 / 로 이동

[앱 (Flutter 웹뷰)]
웹뷰 /login ─▶ 앱에 로그인 요청 ─▶ 앱이 시스템 브라우저 창으로
   GET /api/v1/auth/oauth/{provider}?app_challenge=…   (iOS ASWebAuthenticationSession, Android Custom Tabs)
             └▶ 제공자 로그인 ─▶ callback ─▶ 1회용 로그인 코드 발급
                                              └▶ com.makkigo.user://auth?code=… 로 앱 복귀
앱이 웹뷰에서 GET /api/v1/auth/oauth/exchange?code=…&verifier=… 를 열기
   └▶ 우리 토큰 쿠키가 **웹뷰에** 심김 + /onboarding 또는 / 로 이동
```

**왜 웹뷰 안에서 바로 로그인하지 않나**: 구글은 앱 안 웹뷰의 로그인 페이지를 막습니다(`disallowed_useragent`). 시스템 브라우저 창은 허용됩니다.

**왜 1회용 코드를 거치나**: 시스템 브라우저 창과 웹뷰는 쿠키 저장소가 다릅니다. 창에서 받은 로그인을 웹뷰로 옮기려고, 2분짜리 1회용 코드를 앱 복귀 주소에 실어 보내고 웹뷰가 그 코드를 쿠키로 바꿉니다.

**`app_challenge` / `verifier`**: 앱이 시작할 때 임의 값(`verifier`, 43~128자)을 만들고 그 SHA-256(base64url, 43자)을 `app_challenge` 로 보냅니다. 교환할 때 원래 `verifier` 가 있어야 합니다. 다른 앱이 같은 복귀 주소(`com.makkigo.user://`)를 가로채도 `verifier` 가 없어서 로그인할 수 없습니다 (OAuth PKCE 와 같은 원리).

**로그인 뒤 이동**: 필수 약관 동의 + 온보딩까지 끝났으면 `/`, 아니면 `/onboarding` (`GET /api/v1/users/me` 와 같은 기준).

**실패 · 취소**: 웹은 `/login?error=cancelled|failed`, 앱은 `com.makkigo.user://auth?error=cancelled|failed`.

## OAuth 세부

| 제공자 | 받는 것 | 확인 | 이메일 |
|---|---|---|---|
| 카카오 | 인가 코드 → 액세스 토큰 → `/v2/user/me` | 우리 REST 키(+ 시크릿)로 교환 | 인증된 카카오계정 이메일 (동의 항목 설정 시) |
| 구글 | 인가 코드 → ID 토큰 | 공개키 서명, `aud` = `GOOGLE_CLIENT_ID`, `nonce` | 인증된 이메일 |
| 애플 | ID 토큰 (`form_post` 로 콜백에 POST) | 공개키 서명, `aud` = `APPLE_SERVICES_ID`, `nonce` | 이메일 (가리기 선택 시 중계 주소) |
| 네이버 | 인가 코드 → 액세스 토큰 → `/v1/nid/me` | 우리 Client ID · Secret 으로 교환 | 프로필 이메일 |

- 토큰을 우리 서버가 직접 교환하므로, 예전 "네이버 토큰이 우리 앱에서 발급됐는지 확인할 수단 없음" 문제는 사라졌습니다.
- `state` = 우리 키로 서명한 JWT (10분, 제공자 · nonce · CSRF 값 · 웹/앱 · `app_challenge`). CSRF 값은 `makkigo_oauth_csrf` 쿠키(path `/api/v1/auth/oauth`)와 맞춰 봅니다. 애플은 다른 사이트에서 POST 로 돌아오므로 운영에서 이 쿠키는 `SameSite=None; Secure` 입니다.
- 1회용 로그인 코드: `user_login_codes` 에 해시만 저장, 2분, 한 번 쓰면 끝 (틀린 `verifier` 로 시도해도 버려짐).

## 콘솔 설정

리다이렉트(콜백) 주소: `https://app.makkigo.com/api/v1/auth/oauth/{kakao|google|apple|naver}/callback`. 로컬은 `http://localhost:3001/...` 도 등록합니다 (애플은 HTTPS · 실제 도메인만 가능).

| 제공자 | 할 일 |
|---|---|
| 카카오 | 카카오 로그인 활성화, Redirect URI 등록, (선택) 보안 → Client Secret 사용, 동의 항목에 카카오계정(이메일) |
| 구글 | OAuth 클라이언트 ID **웹 애플리케이션** 유형, 승인된 리디렉션 URI 등록, OAuth 동의 화면 게시 |
| 애플 | App ID(`com.makkigo.user`)에 Sign in with Apple, **Services ID** 생성 → 도메인 `app.makkigo.com` · Return URL 등록 |
| 네이버 | 애플리케이션 등록(네이버 로그인), 서비스 URL `https://app.makkigo.com`, Callback URL 등록, 이메일 권한. 운영 전 **검수 요청** |

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
- 로그인 뒤 어디로 갈지는 서버가 정해서 보냅니다.
- **페이지 접근 규칙** (`features/auth` 의 `MemberGate` + `useMemberGate`, `GET /api/v1/users/me` 를 진입마다 새로 받아 확인):

  | 페이지 | 로그인 안 함 | 약관 · 온보딩 미완료 | 완료 |
  |---|---|---|---|
  | `/onboarding` | `/login` | 그대로 (약관 동의했으면 바텀시트 안 띄움) | `/` |
  | 그 밖의 회원 페이지 (`app/(member)/`) | `/login` | `/onboarding` | 그대로 |

  로그인 안 함 = `/me` 가 401 → 재발급 시도 → 실패하면 공통 API 클라이언트가 `/login` 으로 보냄. 서버 컴포넌트에서 막지 않는 이유: 리프레시 쿠키가 `/api/v1/auth` 에서만 보내져서, 액세스 토큰(15분)이 만료된 페이지 요청은 서버가 재발급할 수 없습니다.

## 환경변수

로컬은 `apps/users/.env.development.local` 등, 운영은 SSM Parameter Store `/makkigo/prod/users/` → [deployment.md](deployment.md)


| 이름 | 값 |
|---|---|
| `DATABASE_URL` | Postgres 접속 주소 |
| `AUTH_JWT_SECRET` | `openssl rand -base64 32` |
| `PUBLIC_URL` | 고객 앱 주소. 운영 `https://app.makkigo.com`, 로컬 `http://localhost:3001`. 콜백 주소 · 이동 주소를 만듭니다 |
| `KAKAO_REST_API_KEY` | 카카오 앱 키 → REST API 키 |
| `KAKAO_CLIENT_SECRET` | 카카오 보안 → Client Secret (사용 안 하면 비우거나 SSM 에 만들지 않음) |
| `GOOGLE_CLIENT_ID` | 구글 웹 애플리케이션 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | 위 클라이언트의 보안 비밀번호 |
| `APPLE_SERVICES_ID` | 애플 Services ID (예: `com.makkigo.user.web`) |
| `NAVER_CLIENT_ID` | 네이버 Client ID |
| `NAVER_CLIENT_SECRET` | 네이버 Client Secret |
