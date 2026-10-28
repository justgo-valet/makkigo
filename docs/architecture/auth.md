# 인증

공통 코드는 `packages/auth`, 고객 API 는 `apps/users/app/api/v1/auth/*`, 요원·업체 관리자 API 는 `apps/valetagents/app/api/v1/auth/*`에 둡니다. 토큰은 `aud`(`users` / `valetagents`)로 구분합니다.

## 흐름

소셜 로그인은 브라우저에서는 **Next.js 서버가 OAuth(인가 코드 방식)로 처리**하고, 앱(웹뷰)에서는 **앱이 각 사 SDK 로 로그인**해 받은 토큰을 서버가 확인합니다.

```
[일반 브라우저]
/login ─▶ GET /api/v1/auth/oauth/{provider}           state(서명) + CSRF 쿠키, 제공자 로그인 페이지로
             └▶ 제공자 로그인 ─▶ /api/v1/auth/oauth/{provider}/callback
                                   │ 인가 코드 → 제공자 토큰 → 회원 확인 · 처음이면 가입
                                   ▼
                    우리 토큰 쿠키 + /onboarding 또는 / 로 이동

[앱 (Flutter 웹뷰)]
웹뷰 /login ─▶ 앱에 {"type":"nativeLogin","provider":"kakao"}
앱이 SDK 로 로그인   카카오: 카카오톡 앱(없으면 카카오계정) · 구글: 계정 선택 · 애플: iOS 기본 시트
   └▶ window 에 makkigo:native-login 이벤트 { status, accessToken | idToken (+ authorizationCode) }
웹뷰 ─▶ POST /api/v1/auth/oauth/{provider}/native   (JSON)
          │ 토큰 확인 → 회원 확인 · 처음이면 가입
          ▼
   우리 토큰 쿠키가 **웹뷰에** 심김 + { redirectTo } → /onboarding 또는 / 로 이동
```

**왜 앱 SDK 로 하나** (decisions 2026-10-19): 웹 OAuth 를 시스템 브라우저 창으로 열면 iOS 가 매번 "'마끼고'이(가) 'app.makkigo.com'을(를) 사용하여 로그인하려고 합니다" 동의 모달을 띄우고, 카카오는 카카오톡이 있어도 아이디 · 비밀번호 화면부터 나옵니다. SDK 는 카카오톡 앱 · 애플 시트 · Android 계정 선택으로 바로 갑니다. 구글 iOS 는 SDK 도 내부에서 로그인 창을 써서 모달이 남습니다.

**SDK 토큰 확인**: 토큰이 **우리 앱에 발급된 것인지**만 봅니다.

| 제공자 | 앱이 넘기는 값 | 서버 확인 |
|---|---|---|
| 카카오 | 액세스 토큰 | `/v1/user/access_token_info` 의 `app_id` = `KAKAO_APP_ID` → `/v2/user/me` |
| 구글 | ID 토큰 | 공개키 서명, `aud` = `GOOGLE_CLIENT_ID` (앱이 `serverClientId` 로 웹 클라이언트 ID 를 넘김) |
| 애플 | ID 토큰 + 인가 코드 | 공개키 서명, `aud` = `APPLE_BUNDLE_ID`. 인가 코드는 번들 ID 로 리프레시 토큰과 교환(탈퇴 철회용) |

- `nonce` 는 보지 않습니다. 구글 SDK 는 nonce 를 앱 시작 때 한 번만 정할 수 있어 로그인마다 맞춰 볼 수 없습니다. 대신 토큰의 대상(`aud` · `app_id`)으로 다른 앱 토큰을 막고, ID 토큰 수명(구글 1시간 · 애플 10분)에 기댑니다.
- 로그인 CSRF: `native` API 는 `Content-Type: application/json` 요청만 받습니다. 다른 사이트의 폼 · `text/plain` 요청은 415 로 거절되고, JSON 은 CORS 확인을 통과하지 못합니다.
- 실패: 토큰이 틀리면 401, 그 밖은 500. 공통 API 클라이언트는 `/auth/oauth/*` 의 401 에 토큰 재발급을 하지 않습니다.

**예전 방식(시스템 브라우저 창)**: `app-session` → 창에서 웹 OAuth → `com.makkigo.user://auth?code=…` → `exchange` 흐름은 서버 · 앱에 남아 있습니다. 고객 웹은 지금 쓰지 않고, SDK 로그인에 문제가 생기면 웹 배포만으로 되돌릴 수 있습니다. 창과 웹뷰는 쿠키 저장소가 달라 2분짜리 1회용 코드로 로그인을 옮깁니다(구글은 웹뷰 안 로그인 페이지를 `disallowed_useragent` 로 막아 웹뷰에서 바로 할 수 없음).

**`app_challenge` / `verifier`**: 서버가 앱 로그인 준비(`app-session`) 때 임의 값(`verifier`, 43자)을 만들어 **웹뷰 쿠키**(`makkigo_app_login_verifier`, HttpOnly, path `/api/v1/auth/oauth`, 10분)에 심고, 그 SHA-256(base64url, 43자)을 `app_challenge` 로 `authUrl` 에 넣습니다. 교환할 때 그 쿠키가 있어야 합니다. 다른 앱이 같은 복귀 주소(`com.makkigo.user://`)를 가로채도 `verifier` 가 없어서 로그인할 수 없습니다 (OAuth PKCE 와 같은 원리).

**로그인 뒤 이동**: 필수 약관 동의 + 온보딩까지 끝났으면 `/`, 아니면 `/onboarding` (`GET /api/v1/users/me` 와 같은 기준).

**실패 · 취소**: 웹은 `/login?error=cancelled|failed`. 앱 SDK 로그인은 이벤트의 `status` 로 받아 로그인 화면에 같은 문구를 띄웁니다.

**앱이 아는 것** (← 변경 decisions 2026-10-19, 이전 2026-10-08 "앱은 심부름만"): 앱은 카카오 · 구글 · 애플 SDK 와 그 설정값(카카오 네이티브 앱 키, 구글 클라이언트 ID)을 압니다. 제공자를 더하거나 SDK 설정을 바꾸면 **앱 업데이트(스토어 심사)가 필요**합니다. 버튼 목록 · 로그인 뒤 이동 · 회원 처리는 여전히 웹 · 서버가 정합니다 → [mobile.md](mobile.md#웹--앱-브리지).

## OAuth 세부

| 제공자 | 받는 것 | 확인 | 이메일 |
|---|---|---|---|
| 카카오 | 인가 코드 → 액세스 토큰 → `/v2/user/me` | 우리 REST 키(+ 시크릿)로 교환 | 인증된 카카오계정 이메일 (동의 항목 설정 시) |
| 구글 | 인가 코드 → ID 토큰 | 공개키 서명, `aud` = `GOOGLE_CLIENT_ID`, `nonce` | 인증된 이메일 |
| 애플 | ID 토큰 (`form_post` 로 콜백에 POST) + 고객은 인가 코드 → 리프레시 토큰 | 공개키 서명, `aud` = `APPLE_SERVICES_ID`, `nonce` | 이메일 (가리기 선택 시 중계 주소) |

- `state` = 우리 키로 서명한 JWT (10분, 제공자 · nonce · CSRF 값 · 웹/앱 · `app_challenge`). CSRF 값은 `makkigo_oauth_csrf` 쿠키(path `/api/v1/auth/oauth`)와 맞춰 봅니다. 애플은 다른 사이트에서 POST 로 돌아오므로 운영에서 이 쿠키는 `SameSite=None; Secure` 입니다.
- 애플 탈퇴 토큰 철회 (App Store 심사 5.1.1(v)): 고객이 애플로 로그인하면 인가 코드를 애플 리프레시 토큰으로 바꿔 `user_social_accounts.provider_refresh_token` 에 저장하고, 탈퇴 때 `https://appleid.apple.com/auth/revoke` 로 철회합니다. 애플 키(`APPLE_TEAM_ID` · `APPLE_KEY_ID` · `APPLE_PRIVATE_KEY`)가 없으면 교환 · 철회 모두 건너뜁니다. 교환이 실패해도 로그인은 되고, 철회가 실패해도 탈퇴는 됩니다. 이 토큰은 우리 애플 키 없이는 쓸 수 없고 API 응답에 내보내지 않습니다. 요원 로그인은 교환하지 않습니다.
- 애플 리프레시 토큰은 발급받은 클라이언트 ID(웹 = Services ID, 앱 SDK = 번들 ID)로만 철회되므로 `user_social_accounts.provider_client_id` 에 함께 저장합니다. 이 칸이 비어 있는 예전 토큰은 Services ID 로 철회합니다.
- 1회용 로그인 코드: `user_login_codes` 에 해시만 저장, 2분, 한 번 쓰면 끝 (틀린 `verifier` 로 시도해도 버려짐).

## 로그인 화면

목업(카톡으로 받은 시안) 기준 (decisions 2026-10-09). **고객 앱 · 업체 · 발렛요원 앱이 같은 화면**을 씁니다 (decisions 2026-10-10).

- 화면 · 버튼 · 그림 · 로고: `packages/ui` 의 `components/common/login/LoginScreen.tsx` · `SocialLoginButton.tsx`, 이미지는 `src/assets/` (`@makkigo/ui/assets` 로 가져옴)
- 각 앱에는 동작만: 기기별 버튼 목록, 로그인 시작(웹 OAuth / 앱 브리지), 오류 문구 — `features/auth/hooks/useSocialLogin.ts` → `LoginScreen` 에 넘김


- 화면 너비(최대 448px)만 파란 바탕 `#0970E9`, 양옆은 기존처럼 `--surface-color`
- 위: 흰 로고 `brand/makkigo_logo_white.svg` + 문구 "주차는 **맡기고,** 편하게 가세요"(맡기고만 노랑 `#F5C518`). 로고는 반짝이를 빼고 '마끼고' 글자가 가운데 오도록 오른쪽으로 20px 옮김. 위 여백에는 `var(--safe-area-inset-top)` 을 더해 상태바와 겹치지 않음
- 앱에서는 이 화면이 떠 있는 동안 상태바 글자를 흰색으로 바꾸고(`setStatusBarStyle` → [mobile.md](mobile.md#웹--앱-브리지)), 벗어나면 검은색으로 되돌림 (`useAppStatusBarStyle`)
- 가운데: 그림 `login/login_illustration.png` — 화면 너비에 꽉 차게 아래에 붙이고, 높이가 모자라면 위(하늘)부터 잘림. 위쪽은 바탕색으로 흐려져 경계가 보이지 않음
- 아래: 위 모서리가 둥근 흰 시트 안에 로그인 버튼. 시트 높이는 고정하지 않고 버튼 + 위아래 여백으로 정해짐. 위아래 여백은 같은 값 `clamp(24px, 4dvh, 32px)`, 아래는 여기에 `var(--safe-area-inset-bottom)` 을 더해 아이폰 홈 막대 · 앱 하단 여백과 겹치지 않음 (`viewport-fit=cover`, 루트 layout. 변수는 [mobile.md](mobile.md#웹--앱-브리지))
- 버튼 아래에는 약관 안내 줄을 두지 않음 (고객 · 요원 앱 같음). 서비스 이용약관 · 개인정보 처리방침은 공개 주소(`/terms` · `/privacy`), 가입 동의 시트, 마이페이지에서 봄 (decisions 2026-10-29)
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

구글 버튼은 같은 틀에 흰 바탕 + 회색 테두리로 만들었습니다.

**각 사 가이드와 다른 점** (알고 쓰는 것): 애플은 글자가 버튼 높이의 43%(≈21px)보다 작음, 카카오는 색(#FEE500)과 문구("카카오 로그인")가 다름, 구글은 Roboto 가 아님. 애플은 심사에서 커스텀 버튼을 보므로 반려되면 애플 버튼만 가이드대로 되돌립니다.

## 소셜 아이콘

마이페이지의 "연결된 소셜 계정" 표시용 공식 아이콘은 `apps/users/public/images/social/` 에 둡니다.

| 파일 | 출처 |
|---|---|
| `kakao.svg` | 카카오 `kakao_login_light.svg` (노란 원 + 말풍선) |
| `google.svg` | 구글 `Theme=Light, Show text=No, Shape=Pill` (흰 원 + G) |
| `apple.png` | 애플 생성기 로고 전용 버튼 (검정 사각형 + 로고, 64px) |

## 콘솔 설정

고객 리다이렉트(콜백) 주소: `https://app.makkigo.com/api/v1/auth/oauth/{kakao|google|apple}/callback`. 요원 앱도 같은 도메인의 `https://app.makkigo.com/api/v1/staff/auth/oauth/{provider}/callback`을 사용하며, Caddy가 이 경로만 `valetagents`로 전달합니다. 로컬 요원 콜백은 `http://localhost:3000/api/v1/staff/auth/oauth/{provider}/callback`입니다 (애플은 HTTPS · 실제 도메인만 가능).

요원 로그인 시작은 `valet.makkigo.com`, 콜백은 `app.makkigo.com`이므로 운영의 `AUTH_COOKIE_DOMAIN`은 `.makkigo.com`, `OAUTH_CALLBACK_ORIGIN`은 `https://app.makkigo.com`으로 설정합니다. 도메인 공유 쿠키는 콜백 검증용 CSRF 값뿐입니다. 콜백은 verifier에 묶인 1회용 코드를 `valet.makkigo.com`으로 돌려보내고, Staff 액세스·리프레시 토큰은 그곳에서 host-only 쿠키로 발급합니다.

| 제공자 | 할 일 |
|---|---|
| 카카오 | 카카오 로그인 활성화, Redirect URI 등록, (선택) 보안 → Client Secret 사용, 동의 항목에 카카오계정(이메일). 앱 SDK: 플랫폼에 iOS 번들 ID · Android 패키지 + 키 해시 (makkigo-mobile README) |
| 구글 | OAuth 클라이언트 ID **웹 애플리케이션** 유형, 승인된 리디렉션 URI 등록, OAuth 동의 화면 게시. 앱 SDK: 같은 프로젝트에 **iOS**(번들 ID) · **Android**(패키지 + SHA-1) 클라이언트 |
| 애플 | App ID(`com.makkigo.user`)에 Sign in with Apple, **Services ID** 생성 → 도메인 `app.makkigo.com` · Return URL 등록 |

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
- **페이지 접근 규칙** — 두 단계로 확인합니다.
  1. 서버: `app/(member)/layout.tsx` 와 `/login` 페이지가 액세스 토큰 쿠키를 검사합니다 ([#55](https://github.com/justgo-valet/makkigo/pull/55)). 쿠키가 없거나 만료 · 탈퇴면 회원 페이지는 `/login` 으로, `/login` 은 로그인돼 있으면 `/` 또는 `/onboarding` 으로 보냅니다.
  2. 클라이언트: `features/auth` 의 `MemberGate` + `useMemberGate` 가 `GET /api/v1/users/me` 를 진입마다 새로 받아 약관 · 온보딩 상태로 보냅니다.

  | 페이지 | 로그인 안 함 | 약관 · 온보딩 미완료 | 완료 |
  |---|---|---|---|
  | `/onboarding` | `/login` | 그대로 (약관 동의했으면 바텀시트 안 띄움) | `/` |
  | 그 밖의 회원 페이지 (`app/(member)/`) | `/login` | `/onboarding` | 그대로 |

  리프레시 쿠키는 `/api/v1/auth` 에서만 보내지므로 서버 단계는 재발급을 하지 못합니다. 액세스 토큰(15분)이 만료된 뒤 페이지를 열면 재발급 없이 `/login` 으로 가는지 실기기 확인이 필요합니다 → [open-questions.md](../planning/open-questions.md#개발). API 요청의 401 은 공통 API 클라이언트가 재발급을 한 번 시도하고, 실패하면 `/login` 으로 보냅니다.

## 환경변수

로컬은 `apps/users/.env.development.local` 등, 운영은 SSM Parameter Store `/makkigo/prod/users/` → [deployment.md](deployment.md)


| 이름 | 값 |
|---|---|
| `DATABASE_URL` | Postgres 접속 주소 |
| `AUTH_JWT_SECRET` | `openssl rand -base64 32` |
| `PUBLIC_URL` | 고객 앱 주소. 운영 `https://app.makkigo.com`, 로컬 `http://localhost:3001`. 콜백 주소 · 이동 주소를 만듭니다 |
| `KAKAO_REST_API_KEY` | 카카오 앱 키 → REST API 키 |
| `KAKAO_CLIENT_SECRET` | 카카오 보안 → Client Secret (사용 안 하면 비우거나 SSM 에 만들지 않음) |
| `KAKAO_APP_ID` | 카카오 앱 ID (숫자, `1596995`). 앱 SDK 로그인 토큰이 우리 앱 것인지 확인. 고객 앱만 |
| `GOOGLE_CLIENT_ID` | 구글 웹 애플리케이션 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | 위 클라이언트의 보안 비밀번호 |
| `APPLE_SERVICES_ID` | 애플 Services ID (예: `com.makkigo.user.web`) |
| `APPLE_BUNDLE_ID` | 고객 앱 번들 ID (`com.makkigo.user`). 앱 SDK 로그인 ID 토큰의 `aud`. 고객 앱만 |
| `APPLE_TEAM_ID` | 애플 팀 ID (`8Z9ZNRXURC`). 고객 앱만 |
| `APPLE_KEY_ID` | Sign in with Apple 을 켠 키(.p8)의 Key ID. 고객 앱만 |
| `APPLE_PRIVATE_KEY` | 위 .p8 파일 내용을 **한 줄로** (줄바꿈을 `\n` 으로), SecureString. 고객 앱만 |
