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
| `GET /api/v1/users/me` | 내 정보: 필수 약관 동의 여부(`requiredConsentsAgreed`), 온보딩 완료 여부(`onboardingCompleted`), 앱 푸시 동의 여부(`appPushAgreed`) | ✅ | [#37](https://github.com/justgo-valet/makkigo/pull/37), 이 PR |
| `GET /api/v1/users/me/vehicle` | 내 차량 목록 조회(차량 번호, 브랜드, 모델, 차량 이미지 `carImageUrl`). 브랜드 · 모델을 직접 입력했으면 `carImageUrl` 은 기본 이미지(`cars/_default.png`) | ✅ | [#67](https://github.com/justgo-valet/makkigo/pull/67) |
| `DELETE /api/v1/users/me` | 회원 탈퇴 (푸시 기기도 삭제) | ✅ | [#15](https://github.com/justgo-valet/makkigo/pull/15) |
| `POST /api/v1/push-devices` | 앱 푸시 기기 등록: `{ token, platform: "IOS" \| "ANDROID" }`. 같은 토큰이 있으면 지금 회원으로 옮김 (204) | ✅ | 이 PR |
| `DELETE /api/v1/push-devices` | 앱 푸시 기기 삭제: `{ token }` (내 기기만, 204). 로그아웃 때 부름 | ✅ | 이 PR |
| `POST /api/v1/onboarding` | 휴대폰 번호 · 차량 저장 | ✅ | [#16](https://github.com/justgo-valet/makkigo/pull/16) |
| `POST /api/v1/onboarding/phone-number/check` | 온보딩 휴대폰 번호 단계에서 다음으로 넘어가기 전 중복 확인 (204 사용 가능 · 409 `DUPLICATE_PHONE`, 내 번호는 통과) | ✅ | 이 PR |
| `POST /api/v1/onboarding/vehicle-number/check` | 온보딩 차량 번호 단계에서 다음으로 넘어가기 전 중복 확인 (204 사용 가능 · 409 `DUPLICATE_VEHICLE`, 내 차량은 통과) | ✅ | 이 PR |
| `GET /api/v1/merchants?q=` | 업체 검색: 이름 · 주소에 검색어가 들어간 업체 중 **승인된 부스 계약이 있는** 곳만 (삭제 제외, 이름 순 최대 20개). `q` 없음 · 50자 초과는 400 | ✅ | [#72](https://github.com/justgo-valet/makkigo/pull/72) |
| `POST /api/v1/valet-sessions` | 도착 알림 보내기: `{ merchantId, location? }` → 도착 예정 세션 생성(201 `{ id }`) + 받을 요원에게 알림 기록. `location`(`{ latitude, longitude }`)이 있고 위치기반서비스에 동의했으면 예상 도착 시각을 계산해 저장(실패해도 세션은 만듦, **예정**). 403 `VEHICLE_REQUIRED` · 404 `MERCHANT_NOT_FOUND` · 409 `ACTIVE_SESSION_EXISTS` · 422 `NO_AVAILABLE_BOOTH` | ✅ | [#73](https://github.com/justgo-valet/makkigo/pull/73) |
| `POST /api/v1/valet-sessions/{id}/cancel` | 도착 알림 취소: 내 도착 예정 세션 → 취소(204) + 도착 알림을 받았던 요원에게 취소 알림 기록. 404 `SESSION_NOT_FOUND` · 409 `NOT_CANCELLABLE`(이미 취소 · 주차 시작) | ✅ | 이 PR |

상태 코드, 요청 예시, 확인 결과는 각 PR 본문에 있습니다.

## 요원 앱 (`apps/valetagents`)

| 메서드 · 경로 | 하는 일 | 로그인 | PR |
|---|---|---|---|
| `GET /api/v1/booths?q=` | 부스 검색: 이름 · 주소에 검색어가 들어간 부스 (삭제 제외, 이름 순 최대 20개) + 최신 요금 정책 + **내** 등록 요청. `q` 없음 · 50자 초과는 400 `INVALID_QUERY`, 요원이 아니면 403 `VALET_AGENT_REQUIRED` | ✅ 요원 | 이 PR |
| `POST /api/v1/booths` | 부스 생성: `{ name, address, addressDetail? }` (앞뒤 공백 제거 후 이름 1~50자 · 주소 1~200자 · 상세 주소 100자 이하, 비면 `null`) → 201 `{ id }`. **온보딩을 마치지 않은 요원만** 만들 수 있고, 만든 사람은 같은 트랜잭션에서 그 부스의 승인된 요원(근무 시간 없음)이 되어 온보딩이 끝남. 주소가 지도에서 찾아지는지는 화면에서만 확인. 400 `INVALID_REQUEST`(모르는 키 포함) · 403 `VALET_AGENT_REQUIRED` · `ALREADY_ONBOARDED` · 409 `REQUEST_CONFLICT` | ✅ 요원 | 이 PR |
| `PUT /api/v1/booths/{boothId}/agent-request` | 부스 등록 요청: `{ workStartTime, workEndTime }` (HH:mm). 처음이면 201 `CREATED`, 대기 중이면 근무시간만 바꿔 200 `UPDATED`, 거절됐으면 다시 요청 상태로 200 `REOPENED`. 400 `INVALID_REQUEST` · `INVALID_WORK_TIME` · 403 `VALET_AGENT_REQUIRED` · 404 `BOOTH_NOT_FOUND` · 409 `ALREADY_APPROVED` · `REQUEST_CONFLICT` | ✅ 요원 | 이 PR |
| `GET /api/v1/onboarding/status` | 온보딩 상태: `role`, `state`(`ROLE_REQUIRED` · `BOOTH_REQUIRED` · `AWAITING_APPROVAL` · `COMPLETE`), `nextPath`, 내 등록 요청 목록(부스 · 최신 요금 정책 포함). 승인된 소속이 하나라도 있으면 `COMPLETE` | ✅ | 이 PR |
| `GET /api/v1/booths/{boothId}/agents?page=` | 부스 요원 목록: 이름 · 근무시간 · 근무 중 여부(`working`) · 등록 상태, 등록 순 10명씩 (`page`, `totalPages`). 탈퇴한 요원 제외. 400 `INVALID_PAGE` · 403 `BOOTH_MANAGER_REQUIRED` · 404 `BOOTH_NOT_FOUND` | ✅ 부스 관리자 | 이 PR |
| `PATCH /api/v1/booths/{boothId}/agents` | 요원 등록 수락 · 거절: `{ status: "APPROVED" \| "REJECTED", agents: [{ id, updatedAt }] }` → 204. 고른 요원 전부를 한 번에 바꾸거나 하나도 바꾸지 않음. **이미 등록된 요원은 거절할 수 없음**(409 `AGENT_ALREADY_APPROVED`). 목록을 본 뒤 요원이 요청을 고쳤으면 409 `AGENT_CHANGED`. 400 `INVALID_REQUEST` · 403 `BOOTH_MANAGER_REQUIRED` · 404 `BOOTH_NOT_FOUND` · `AGENT_NOT_FOUND` | ✅ 부스 관리자 | 이 PR |
| `GET /api/v1/booths/{boothId}/merchants?page=` | 부스 계약 업체 목록: 부스와 계약 행이 있는 업체의 업체명 · 주소 · 상세 주소 · 계약 상태(`APPROVED` 등록 · `PENDING` 대기 · `REJECTED` 거절) · `updatedAt`, 계약 요청 순 5곳씩 (`page`, `totalPages`). 거절된 업체도 남고 삭제된 업체는 제외. 등록일자 필드는 없고 화면이 `status` + `updatedAt` 으로 만듦. 400 `INVALID_REQUEST` · `INVALID_PAGE` · 403 `BOOTH_MANAGER_REQUIRED` · 404 `BOOTH_NOT_FOUND` | ✅ 부스 관리자 | 이 PR |

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
