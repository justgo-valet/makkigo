# API

## 규칙

- 경로에 버전: `/api/v1/...` (Flutter 앱은 업데이트 안 한 옛 버전이 남으므로)
- 오류 응답: `{ "message": "사용자에게 보여줄 문장" }` + 상태 코드
  - 화면이 오류 종류에 따라 다르게 움직여야 하면 `code` 를 함께 보냄 (예: 온보딩 `DUPLICATE_PHONE`, `DUPLICATE_VEHICLE`, `ALREADY_COMPLETED`, `REQUIRED_CONSENTS_MISSING`)
- 요청·응답 스키마(zod): `apps/<앱>/libs/<도메인>/contracts/`
- 서버 로직: `apps/<앱>/server/<도메인>/` (`import "server-only"` 로 클라이언트에서 못 가져오게 막음), 공통 인증: `packages/auth`
- 클라이언트 기능 코드(화면 · 훅 · API 호출 · 폼 스키마): `apps/<앱>/features/<도메인>/{components,hooks,apis,schemas}/`
- **1 API = 1 PR = 1 커밋**. 앞 작업에 의존하면 앞 PR 위에 쌓습니다.
- 머지는 **Squash and merge** (기능 PR → dev). 쌓인 PR 은 앞 PR 이 머지되면 새 dev 위로 옮기고 **base 를 dev 로 바꾼 뒤** 머지합니다.
- **dev → main 은 merge commit 만** 씁니다. → [deployment.md](deployment.md#브랜치--버전--릴리스)
- PR 제목 · 커밋 메시지는 Conventional Commits (`feat(scope): ...`) — CI 가 검사합니다 ([#32](https://github.com/justgo-valet/makkigo/pull/32), dev 대상 PR 은 커밋 메시지까지).

## 프론트에서 API 부르기

공통 클라이언트 `@makkigo/api-client` ([#18](https://github.com/justgo-valet/makkigo/pull/18)) 를 씁니다. 고객 앱은 `apps/users/libs/common/api/apiClient.ts`.

- 기본 경로 `/api/v1`, 같은 출처 쿠키, 10초 시간 초과
- 401 → 재발급을 **한 번만** 보내고 원래 요청을 한 번 재시도. 재발급 실패 → 앱의 `onAuthExpired` (고객 앱: `/login` 이동)
- 오류 문장은 `getErrorMessage(error, 기본 문장)`
- 브라우저(웹뷰) 요청 전용. 서버 코드는 DB 를 직접 씁니다.

## 고객 앱 (`apps/users`)

| 메서드 · 경로 | 하는 일 | 로그인 | PR |
|---|---|---|---|
| `GET /api/v1/cars/brands` | 차량 브랜드 이름 · 로고 전체 주소 (등록 순) | | 이 PR |
| `GET /api/v1/cars/models?brand=` | 브랜드별 차량 모델 이름 (한국어 순). 옛 경로 `/api/car/get-car-models` 는 삭제 | | dev (#5), [#26](https://github.com/justgo-valet/makkigo/pull/26) |
| `GET /api/v1/auth/oauth/{kakao\|google\|apple\|naver}` | 소셜 로그인 시작 → 제공자 로그인 페이지로 이동. 앱은 `?app_challenge=` | | [#38](https://github.com/justgo-valet/makkigo/pull/38) |
| `GET · POST /api/v1/auth/oauth/{provider}/callback` | 제공자 콜백: 회원 확인 · 가입 → 웹은 쿠키 + 이동, 앱은 1회용 코드로 앱 복귀 | | [#38](https://github.com/justgo-valet/makkigo/pull/38) |
| `POST /api/v1/auth/oauth/{provider}/app-session` | 앱 로그인 준비: `verifier` 를 웹뷰 쿠키에 심고, 앱이 열 `authUrl` · 돌아올 `returnUrl` 을 돌려줌 | | [#46](https://github.com/justgo-valet/makkigo/pull/46) |
| `GET /api/v1/auth/oauth/exchange?code=` (또는 `?error=`) | 앱 웹뷰에서 1회용 코드 + `verifier` 쿠키 → 로그인 쿠키 + 이동 | | [#38](https://github.com/justgo-valet/makkigo/pull/38) |
| `POST /api/v1/auth/refresh` | 토큰 재발급 (리프레시 토큰 교체) | 리프레시 쿠키 | [#12](https://github.com/justgo-valet/makkigo/pull/12) → [#24](https://github.com/justgo-valet/makkigo/pull/24) |
| `POST /api/v1/auth/logout` | 이 기기 로그아웃 | | [#13](https://github.com/justgo-valet/makkigo/pull/13) |
| `POST /api/v1/consents` | 약관 동의 기록 | ✅ | [#14](https://github.com/justgo-valet/makkigo/pull/14) |
| `GET /api/v1/users/me` | 내 정보: 필수 약관 동의 여부(`requiredConsentsAgreed`), 온보딩 완료 여부(`onboardingCompleted`) | ✅ | [#37](https://github.com/justgo-valet/makkigo/pull/37) |
| `DELETE /api/v1/users/me` | 회원 탈퇴 | ✅ | [#15](https://github.com/justgo-valet/makkigo/pull/15) |
| `POST /api/v1/onboarding` | 휴대폰 번호 · 차량 저장 | ✅ | [#16](https://github.com/justgo-valet/makkigo/pull/16) |
| `POST /api/v1/onboarding/phone-number/check` | 온보딩 휴대폰 번호 단계에서 다음으로 넘어가기 전 중복 확인 (204 사용 가능 · 409 `DUPLICATE_PHONE`, 내 번호는 통과) | ✅ | 이 PR |
| `POST /api/v1/onboarding/vehicle-number/check` | 온보딩 차량 번호 단계에서 다음으로 넘어가기 전 중복 확인 (204 사용 가능 · 409 `DUPLICATE_VEHICLE`, 내 차량은 통과) | ✅ | 이 PR |
| `GET /api/v1/merchants?q=` | 업체 검색: 이름 · 주소에 검색어가 들어간 업체 중 **승인된 부스 계약이 있는** 곳만 (삭제 제외, 이름 순 최대 20개). `q` 없음 · 50자 초과는 400 | ✅ | [#72](https://github.com/justgo-valet/makkigo/pull/72) |
| `POST /api/v1/valet-sessions` | 도착 알림 보내기: `{ merchantId }` → 도착 예정 세션 생성(201 `{ id }`) + 받을 요원에게 알림 기록. 403 `VEHICLE_REQUIRED` · 404 `MERCHANT_NOT_FOUND` · 409 `ACTIVE_SESSION_EXISTS` · 422 `NO_AVAILABLE_BOOTH` | ✅ | 이 PR |

상태 코드, 요청 예시, 확인 결과는 각 PR 본문에 있습니다.

## 기반 PR

| PR | 내용 |
|---|---|
| [#9](https://github.com/justgo-valet/makkigo/pull/9) | 발렛 도메인 Prisma 모델 + 마이그레이션 (요원 · 부스 · 업체 · 티켓 · 세션 · 알림) |
| [#10](https://github.com/justgo-valet/makkigo/pull/10) | `database` 패키지 Prisma 클라이언트 export, Postgres adapter |

고객 인증 · 온보딩 API 와 기반 PR 은 모두 dev 에 머지됐습니다 (2026-10-04). #11 · #12 는 쌓인 상태에서 앞 브랜치로 머지되어, 같은 내용을 [#23](https://github.com/justgo-valet/makkigo/pull/23) · [#24](https://github.com/justgo-valet/makkigo/pull/24) 로 dev 에 다시 머지했습니다. 남은 것: #9 정리.

## 예정

- 마이페이지: 동의 상태 조회, 휴대폰·차량 번호 수정
- 탈퇴 회원 개인정보 삭제 배치
- 요원 쪽 인증 (로그인 후 유형 선택)
- 애플 로그인 회원 탈퇴 때 애플 토큰 철회
