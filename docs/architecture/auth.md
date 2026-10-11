# 인증

공통 코드는 `packages/auth`, 고객 API 는 `apps/users/app/api/v1/auth/*`, 요원·업체 관리자 API 는 `apps/valetagents/app/api/v1/auth/*`에 둡니다. 토큰은 `aud`(`users` / `valetagents`)로 구분합니다.

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
웹뷰 /login ─▶ POST /api/v1/auth/oauth/{provider}/app-session
                 └ verifier 를 웹뷰 쿠키에 심고 { authUrl, returnUrl } 응답
웹뷰 ─▶ 앱에 "이 주소로 창 열어줘" (authUrl, returnUrl)
앱이 시스템 브라우저 창으로 authUrl 열기   (iOS ASWebAuthenticationSession, Android Custom Tabs)
   = GET /api/v1/auth/oauth/{provider}?app_challenge=…
             └▶ 제공자 로그인 ─▶ callback ─▶ 1회용 로그인 코드 발급
                                              └▶ com.makkigo.user://auth?code=… 로 앱 복귀
앱이 웹뷰에서 returnUrl + 받은 쿼리를 그대로 열기
   = GET /api/v1/auth/oauth/exchange?code=…   (verifier 는 웹뷰 쿠키에 있음)
   └▶ 우리 토큰 쿠키가 **웹뷰에** 심김 + /onboarding 또는 / 로 이동
```

**왜 웹뷰 안에서 바로 로그인하지 않나**: 구글은 앱 안 웹뷰의 로그인 페이지를 막습니다(`disallowed_useragent`). 시스템 브라우저 창은 허용됩니다.

**왜 1회용 코드를 거치나**: 시스템 브라우저 창과 웹뷰는 쿠키 저장소가 다릅니다. 창에서 받은 로그인을 웹뷰로 옮기려고, 2분짜리 1회용 코드를 앱 복귀 주소에 실어 보내고 웹뷰가 그 코드를 쿠키로 바꿉니다.

**`app_challenge` / `verifier`**: 서버가 앱 로그인 준비(`app-session`) 때 임의 값(`verifier`, 43자)을 만들어 **웹뷰 쿠키**(`makkigo_app_login_verifier`, HttpOnly, path `/api/v1/auth/oauth`, 10분)에 심고, 그 SHA-256(base64url, 43자)을 `app_challenge` 로 `authUrl` 에 넣습니다. 교환할 때 그 쿠키가 있어야 합니다. 다른 앱이 같은 복귀 주소(`com.makkigo.user://`)를 가로채도 `verifier` 가 없어서 로그인할 수 없습니다 (OAuth PKCE 와 같은 원리).

**로그인 뒤 이동**: 필수 약관 동의 + 온보딩까지 끝났으면 `/`, 아니면 `/onboarding` (`GET /api/v1/users/me` 와 같은 기준).

**실패 · 취소**: 웹은 `/login?error=cancelled|failed`, 앱은 `com.makkigo.user://auth?error=cancelled|failed`.

**앱은 심부름만 합니다** (decisions 2026-10-08): 앱은 웹이 준 `authUrl` 을 창으로 열고, 돌아온 쿼리를 웹이 준 `returnUrl` 에 붙여 웹뷰에서 열 뿐입니다. 제공자 목록 · API 경로 · `verifier` 를 앱이 모르므로, 로그인 · 회원가입을 바꿔도 **서버 배포만** 하면 되고 앱 업데이트(스토어 심사)는 필요 없습니다. 앱 업데이트가 필요한 것은 브리지 메시지 형식이나 복귀 주소(`com.makkigo.user://auth`)를 바꿀 때뿐입니다 → [mobile.md](mobile.md#웹--앱-브리지).

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

## 로그인 화면

목업(카톡으로 받은 시안) 기준 (decisions 2026-10-09). **고객 앱 · 업체 · 발렛요원 앱이 같은 화면**을 씁니다 (decisions 2026-10-10).

- 화면 · 버튼 · 그림 · 로고: `packages/ui` 의 `components/common/login/LoginScreen.tsx` · `SocialLoginButton.tsx`, 이미지는 `src/assets/` (`@makkigo/ui/assets` 로 가져옴)
- 각 앱에는 동작만: 기기별 버튼 목록, 로그인 시작(웹 OAuth / 앱 브리지), 오류 문구 — `features/auth/hooks/useSocialLogin.ts` → `LoginScreen` 에 넘김


- 화면 너비(최대 448px)만 파란 바탕 `#0970E9`, 양옆은 기존처럼 `--surface-color`
- 위: 흰 로고 `brand/makkigo_logo_white.svg` + 문구 "주차는 **맡기고,** 편하게 가세요"(맡기고만 노랑 `#F5C518`). 로고는 반짝이를 빼고 '마끼고' 글자가 가운데 오도록 오른쪽으로 20px 옮김
- 가운데: 그림 `login/login_illustration.png` — 화면 너비에 꽉 차게 아래에 붙이고, 높이가 모자라면 위(하늘)부터 잘림. 위쪽은 바탕색으로 흐려져 경계가 보이지 않음
- 아래: 위 모서리가 둥근 흰 시트 안에 로그인 버튼. 시트 높이는 고정하지 않고 버튼 + 위아래 여백으로 정해짐. 위아래 여백은 같은 값 `clamp(24px, 4dvh, 32px)`, 아래는 여기에 `env(safe-area-inset-bottom)` 을 더해 아이폰 홈 막대와 겹치지 않음 (`viewport-fit=cover`, 루트 layout)
- 높이가 모자라면(가로 폰 등) 그림이 112px 까지 줄고, 그래도 모자라면 화면 전체가 스크롤 — 버튼은 잘리지 않음

그림은 디자이너 원본이 아니라 **목업 캡처에서 오려낸 것**입니다. 글자를 지우고 업스케일(Real-ESRGAN anime, 2배)했지만 뒤쪽 건물 · 나무는 조금 뭉개져 있습니다. 원본(글자 없는 버전)을 받으면 이 파일만 바꿉니다.

## 로그인 버튼

**버튼 4개를 같은 틀**로 코드에서 그립니다 (decisions 2026-10-08). 로고는 각 사 공식 리소스에서 가져왔습니다 (`packages/ui/src/assets/login/`).

- 공통: 높이 48px, 모서리 8px, 버튼 간격 12px, Pretendard(`pretendard` 패키지, 쓰는 글자만 받는 dynamic subset) 16px SemiBold
- 로고는 왼쪽 16px 에 고정(20px 칸 가운데), 문구는 버튼 정가운데 (decisions 2026-10-09)

| 제공자 | 바탕 / 글자 | 로고 | 문구 |
|---|---|---|---|
| 카카오 | #FBE200 / #333333 | 공식 말풍선 심볼 18px (`kakao_symbol.svg`) | 카카오로 계속하기 |
| 구글 | 흰색, 테두리 #D0D5DD / #333333 | 공식 G 로고 20px (`google_logo_square.png` 의 가운데) | Google로 계속하기 |
| 애플 | 검정 / 흰색 | 버튼 생성기 로고를 흰 로고만 남기고 자름, 19×24 (`apple_logo_white.png`) | Apple로 계속하기 |
| 네이버 | #1BC500 / 흰색 | 공식 이미지에서 뽑은 흰 N 로고 18px (`naver_logo.png`) | 네이버로 계속하기 |

구글 버튼은 같은 틀에 흰 바탕 + 회색 테두리로 만들었습니다.

**각 사 가이드와 다른 점** (알고 쓰는 것): 애플은 글자가 버튼 높이의 43%(≈21px)보다 작음, 카카오는 색(#FEE500)과 문구("카카오 로그인")가 다름, 네이버는 지정 녹색과 다름, 구글은 Roboto 가 아님. 애플은 심사에서 커스텀 버튼을 보므로 반려되면 애플 버튼만 가이드대로 되돌립니다.

## 소셜 아이콘

마이페이지의 "연결된 소셜 계정" 표시용 공식 아이콘은 `apps/users/public/images/social/` 에 둡니다.

| 파일 | 출처 |
|---|---|
| `kakao.svg` | 카카오 `kakao_login_light.svg` (노란 원 + 말풍선) |
| `naver.png` | 네이버 `NAVER_login_Light_KR_green_icon_H56.png` (녹색 원 + N, 224px) |
| `google.svg` | 구글 `Theme=Light, Show text=No, Shape=Pill` (흰 원 + G) |
| `apple.png` | 애플 생성기 로고 전용 버튼 (검정 사각형 + 로고, 64px) |

## 콘솔 설정

고객 리다이렉트(콜백) 주소: `https://app.makkigo.com/api/v1/auth/oauth/{kakao|google|apple|naver}/callback`. 요원 앱도 같은 도메인의 `https://app.makkigo.com/api/v1/staff/auth/oauth/{provider}/callback`을 사용하며, Caddy가 이 경로만 `valetagents`로 전달합니다. 로컬 요원 콜백은 `http://localhost:3000/api/v1/staff/auth/oauth/{provider}/callback`입니다 (애플은 HTTPS · 실제 도메인만 가능).

요원 로그인 시작은 `valet.makkigo.com`, 콜백은 `app.makkigo.com`이므로 운영의 `AUTH_COOKIE_DOMAIN`은 `.makkigo.com`, `OAUTH_CALLBACK_ORIGIN`은 `https://app.makkigo.com`으로 설정합니다. 도메인 공유 쿠키는 콜백 검증용 CSRF 값뿐입니다. 콜백은 verifier에 묶인 1회용 코드를 `valet.makkigo.com`으로 돌려보내고, Staff 액세스·리프레시 토큰은 그곳에서 host-only 쿠키로 발급합니다.

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
