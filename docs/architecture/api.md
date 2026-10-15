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
| `POST /api/v1/consents` | 약관 동의 기록 (선택 항목 동의 · 철회도 같은 API, 필수 항목 철회는 400). 앱 푸시를 철회하면 그 회원의 푸시 기기를, 위치기반서비스를 철회하면 위치 이용 기록을 모두 삭제 | ✅ | [#14](https://github.com/justgo-valet/makkigo/pull/14), 이 PR |
| `GET /api/v1/users/me` | 내 정보: 필수 약관 동의 여부(`requiredConsentsAgreed`), 온보딩 완료 여부(`onboardingCompleted`), 앱 푸시 동의 여부(`appPushAgreed`), 위치기반서비스 동의 여부(`locationAgreed`) | ✅ | [#37](https://github.com/justgo-valet/makkigo/pull/37), 이 PR |
| `GET /api/v1/users/me/vehicle` | 내 차량 목록 조회(차량 번호, 브랜드, 모델, 차량 이미지 `carImageUrl`). 브랜드 · 모델을 직접 입력했으면 `carImageUrl` 은 기본 이미지(`cars/_default.png`) | ✅ | [#67](https://github.com/justgo-valet/makkigo/pull/67) |
| `GET /api/v1/users/me/profile` | 마이페이지 내 정보: 휴대폰 번호(`phoneNumber`), 차량 번호(`plateNumber`), 연동 계정(`socialAccounts`: 제공자 · 이메일), 선택 동의 상태(`consents`: `appPush` · `alimtalk` · `locationBasedService`) | ✅ | 이 PR |
| `PATCH /api/v1/users/me/phone-number` | 휴대폰 번호 수정: `{ phoneNumber }` (하이픈 · 공백 허용, 숫자만 저장) → 204. 다른 회원(탈퇴 후 보관 중 포함) 번호면 409 `DUPLICATE_PHONE`, 형식 오류 400 | ✅ | 이 PR |
| `PATCH /api/v1/users/me/vehicle` | 차량 번호 수정: `{ vehicleNumber }` → 204. 브랜드 · 모델은 그대로. 다른 회원 차량이면 409 `DUPLICATE_VEHICLE`, 진행 중인 발렛 세션(완료 · 취소 아님)이 있으면 409 `ACTIVE_SESSION_EXISTS`, 차량 없음 404 `VEHICLE_REQUIRED`, 형식 오류 400 | ✅ | 이 PR |
| `DELETE /api/v1/users/me` | 회원 탈퇴 (푸시 기기도 삭제) → 204. 진행 중인 발렛 세션(도착 예정 · 주차 완료 · 출차 요청 · 출차 준비 중)이 있으면 409 `ACTIVE_VALET_SESSION` | ✅ | [#15](https://github.com/justgo-valet/makkigo/pull/15) |
| `POST /api/v1/push-devices` | 앱 푸시 기기 등록: `{ token, platform: "IOS" \| "ANDROID" }`. 같은 토큰이 있으면 지금 회원으로 옮김 (204) | ✅ | 이 PR |
| `DELETE /api/v1/push-devices` | 앱 푸시 기기 삭제: `{ token }` (내 기기만, 204). 로그아웃 때 부름 | ✅ | 이 PR |
| `POST /api/v1/onboarding` | 휴대폰 번호 · 차량 저장 | ✅ | [#16](https://github.com/justgo-valet/makkigo/pull/16) |
| `POST /api/v1/onboarding/phone-number/check` | 온보딩 휴대폰 번호 단계에서 다음으로 넘어가기 전 중복 확인 (204 사용 가능 · 409 `DUPLICATE_PHONE`, 내 번호는 통과) | ✅ | 이 PR |
| `POST /api/v1/onboarding/vehicle-number/check` | 온보딩 차량 번호 단계에서 다음으로 넘어가기 전 중복 확인 (204 사용 가능 · 409 `DUPLICATE_VEHICLE`, 내 차량은 통과) | ✅ | 이 PR |
| `GET /api/v1/merchants/{id}` | 업체 상세: `{ id, name, address, addressDetail, latitude, longitude, photoUrls, booths: [{ id, name, feePolicy }] }`. 사진은 순서대로 전체 주소, `booths` 는 계약이 승인되고 **현재 요금이 등록된** 부스와 그 요금(요금 없는 부스는 빠짐). 그런 부스가 없거나 삭제된 업체는 검색과 같이 404 `MERCHANT_NOT_FOUND` | ✅ | 이 PR |
| `GET /api/v1/merchants?q=` | 업체 검색: 이름 · 주소에 검색어가 들어간 업체 중 **계약이 승인되고 현재 요금이 등록된 부스가 있는** 곳만 (삭제 제외, 이름 순 최대 20개). `q` 없음 · 50자 초과는 400 | ✅ | [#72](https://github.com/justgo-valet/makkigo/pull/72) |
| `POST /api/v1/valet-sessions` | 도착 알림 보내기: `{ merchantId, location? }` → 도착 예정 세션 생성(201 `{ id }`) + 받을 요원에게 알림 기록, 응답 뒤 푸시. `location`(`{ latitude, longitude }`)이 있고 위치기반서비스에 동의했으면 예상 도착 시각을 계산해 저장(실패해도 세션은 만듦, **예정**). 403 `VEHICLE_REQUIRED` · 404 `MERCHANT_NOT_FOUND` · 409 `ACTIVE_SESSION_EXISTS` · 422 `NO_AVAILABLE_BOOTH` | ✅ | [#73](https://github.com/justgo-valet/makkigo/pull/73) |
| `POST /api/v1/valet-sessions/{id}/cancel` | 도착 알림 취소: 내 도착 예정 세션 → 취소(204) + 도착 알림을 받았던 요원에게 취소 알림 기록, 응답 뒤 푸시. 404 `SESSION_NOT_FOUND` · 409 `NOT_CANCELLABLE`(이미 취소 · 주차 시작) | ✅ | 이 PR |
| `GET /api/v1/notifications?cursor=` | 내 알림 내역: 최신순 20개씩 `{ notifications: [{ id, type, title, body, valetSessionId, readAt, createdAt }], nextCursor }`. 다음 페이지는 `nextCursor` 를 `cursor` 로 넘김(없으면 `null`). 잘못된 `cursor` 는 400 `INVALID_CURSOR` | ✅ | [#105](https://github.com/justgo-valet/makkigo/pull/105) |
| `GET /api/v1/valet-sessions/current` | 현재 세션 조회: 내 세션 중 출차 완료 · 취소가 아닌 가장 최근 것 → `{ session }`(없으면 `null`). 업체 · 부스 이름, 도착 알림 · 지연, 입차 · 출차 요청 시각, 같은 부스 출차 대기 대수(`waitingPickupCount`), 요금(`fee`: 주차 완료는 지금 기준, 출차 요청 이후는 출차 요청 시각 기준), 실제 요금 · 예상 출차 시각, 출차 요청 이후 부스 계좌(`bankAccount`). 형식은 `libs/valet/contracts/currentSession.ts` | ✅ | 이 PR |
| `POST /api/v1/valet-sessions/{id}/pickup-request` | 출차 요청: 내 주차 완료 세션 → 출차 요청(출차 요청 시각 · 기준 요금 저장) + 세션 부스의 승인된 요원 중 알림 켜진 사람에게 알림 기록(응답 뒤 푸시) → 200 `{ session }`(현재 세션 조회와 같은 형식, 계좌 포함). 요금 기준표가 없는 부스면 기준 요금을 비워 두고 접수. 404 `SESSION_NOT_FOUND`(남의 세션 · 끝난 세션) · 409 `NOT_PARKED`(도착 예정) · 409 `ALREADY_REQUESTED`(이미 요청 · 출차 준비 중, 동시 요청의 나머지) · 422 `NO_BOOTH`(부스 없는 세션) | ✅ | 이 PR |
| `POST /api/v1/valet-sessions/{id}/delay` | 지연 알림 보내기: `{ minutes: 5 \| 10 \| 15 }`(15 = 15분 이상) → 내 도착 예정 세션의 지연 시간 · 시각 저장(204, 다시 보내면 덮어씀) + 도착 알림을 받았던 요원에게 지연 알림 기록, 응답 뒤 푸시. 400 잘못된 `minutes` · 404 `SESSION_NOT_FOUND` · 409 `NOT_DELAYABLE`(이미 취소 · 주차 시작) | ✅ | 이 PR |
| `POST /api/v1/notifications/read` | 내 안 읽은 알림을 모두 읽음으로(204). 알림 바텀시트를 열 때 부름 | ✅ | 이 PR |

상태 코드, 요청 예시, 확인 결과는 각 PR 본문에 있습니다.

## 요원 앱 (`apps/valetagents`)

| 메서드 · 경로 | 하는 일 | 로그인 | PR |
|---|---|---|---|
| `GET /api/v1/booths?q=` | 부스 검색: 이름 · 주소에 검색어가 들어간 부스 (삭제 제외, 이름 순 최대 20개) + 최신 요금 정책 + **내** 등록 요청. `q` 없음 · 50자 초과는 400 `INVALID_QUERY`, 요원이 아니면 403 `VALET_AGENT_REQUIRED` | ✅ 요원 | 이 PR |
| `POST /api/v1/booths` | 부스 생성: `{ name, address, addressDetail? }` (앞뒤 공백 제거 후 이름 1~50자 · 주소 1~200자 · 상세 주소 100자 이하, 비면 `null`) → 201 `{ id }`. **온보딩을 마치지 않은 요원만** 만들 수 있고, 만든 사람은 같은 트랜잭션에서 그 부스의 승인된 요원(근무 시간 없음)이 되어 온보딩이 끝남. 주소가 지도에서 찾아지는지는 화면에서만 확인. 400 `INVALID_REQUEST`(모르는 키 포함) · 403 `VALET_AGENT_REQUIRED` · `ALREADY_ONBOARDED` · 409 `REQUEST_CONFLICT` | ✅ 요원 | 이 PR |
| `PUT /api/v1/booths/{boothId}/agent-request` | 부스 등록 요청: `{ workStartTime, workEndTime }` (HH:mm). 처음이면 201 `CREATED`, 대기 중이면 근무시간만 바꿔 200 `UPDATED`, 거절됐으면 다시 요청 상태로 200 `REOPENED`. 400 `INVALID_REQUEST` · `INVALID_WORK_TIME` · 403 `VALET_AGENT_REQUIRED` · 404 `BOOTH_NOT_FOUND` · 409 `ALREADY_APPROVED` · `REQUEST_CONFLICT` | ✅ 요원 | 이 PR |
| `GET /api/v1/onboarding/status` | 온보딩 상태: `role`, `state`(`ROLE_REQUIRED` · `BOOTH_REQUIRED` · `AWAITING_APPROVAL` · `MERCHANT_REGISTRATION_REQUIRED` · `MERCHANT_APPROVAL_PENDING` · `COMPLETE`), `nextPath`, 내 등록 요청 목록(부스 · 최신 요금 정책 포함). 요원은 승인된 소속이 하나라도 있으면 `COMPLETE`. 업체 관리자는 업체가 없으면 `MERCHANT_REGISTRATION_REQUIRED`, 업체는 있지만 승인된 부스 계약이 없으면 `MERCHANT_APPROVAL_PENDING`, 승인된 계약이 하나라도 있으면 `COMPLETE` | ✅ | 이 PR |
| `GET /api/v1/booths/{boothId}/agents?page=` | 부스 요원 목록: 이름 · 근무시간 · 근무 중 여부(`working`) · 등록 상태, 등록 → 요청 중 → 거절 순(같은 상태 안에서는 요청한 순) 10명씩 (`page`, `totalPages`). 탈퇴한 요원 제외. 400 `INVALID_PAGE` · 403 `BOOTH_MANAGER_REQUIRED` · 404 `BOOTH_NOT_FOUND` | ✅ 부스 관리자 | 이 PR |
| `PATCH /api/v1/booths/{boothId}/agents` | 요원 등록 수락 · 거절: `{ status: "APPROVED" \| "REJECTED", agents: [{ id, updatedAt }] }` → 204. 고른 요원 전부를 한 번에 바꾸거나 하나도 바꾸지 않음. **이미 등록된 요원은 거절할 수 없음**(409 `AGENT_ALREADY_APPROVED`). 목록을 본 뒤 요원이 요청을 고쳤으면 409 `AGENT_CHANGED`. 400 `INVALID_REQUEST` · 403 `BOOTH_MANAGER_REQUIRED` · 404 `BOOTH_NOT_FOUND` · `AGENT_NOT_FOUND` | ✅ 부스 관리자 | 이 PR |
| `GET /api/v1/booths/{boothId}/merchants?page=` | 부스 계약 업체 목록: 부스와 계약 행이 있는 업체의 업체명 · 주소 · 상세 주소 · 계약 상태(`APPROVED` 등록 · `PENDING` 대기 · `REJECTED` 거절) · `updatedAt`, 계약 요청 순 5곳씩 (`page`, `totalPages`). 거절된 업체도 남고 삭제된 업체는 제외. 등록일자 필드는 없고 화면이 `status` + `updatedAt` 으로 만듦. 400 `INVALID_REQUEST` · `INVALID_PAGE` · 403 `BOOTH_MANAGER_REQUIRED` · 404 `BOOTH_NOT_FOUND` | ✅ 부스 관리자 | 이 PR |
| `PATCH /api/v1/booths/{boothId}/merchants` | 업체 계약 수락 · 거절: `{ status: "APPROVED" \| "REJECTED", merchants: [{ id, updatedAt }] }` (업체 1~5곳, `id` 는 업체 id) → 204. 고른 업체 전부를 한 번에 바꾸거나 하나도 바꾸지 않음. **이미 등록된 업체는 거절할 수 없음**(409 `MERCHANT_ALREADY_APPROVED`), 거절된 업체는 다시 수락할 수 있음. 목록을 본 뒤 계약 행이 바뀌었으면 409 `MERCHANT_CHANGED` (겹친 두 요청도 한쪽만 성공). 이미 그 상태인 업체는 건드리지 않음. 400 `INVALID_REQUEST` · 403 `BOOTH_MANAGER_REQUIRED` · 404 `BOOTH_NOT_FOUND` · `MERCHANT_NOT_FOUND` | ✅ 부스 관리자 | 이 PR |
| `GET /api/v1/booths/{boothId}/valet-sessions` | 부스 차량 목록: 진행 중인 세션 전부를 들어온 순으로 `{ items: [{ id, status, plateNumber, carImageUrl, expectedArrivalAt, arrivalDelayMinutes, parkedAt, pickupRequestedAt, fee, expectedPickupAt }] }`. `fee` 는 출차 요청 차만 — 출차 요청 시각의 부스 기준표로 계산한 요금 내역, 합계는 출차 요청 때 고정된 기준 요금(기준 요금 · 기준표가 없으면 `null`). 도착 예정(`ARRIVING`)은 부스와 **승인된 계약**을 맺은 업체로 온 차, 주차 완료 · 출차 요청 · 출차 준비 중은 이 부스에 주차된 차. 취소 · 출차 완료는 빠짐. `carImageUrl` 은 차량 모델 이미지, 모델을 모르면 기본 이미지(`cars/_default.png`). 페이지 없음 — 화면이 5초마다 다시 부름. 400 `INVALID_REQUEST` · 403 `BOOTH_AGENT_REQUIRED` · 404 `BOOTH_NOT_FOUND` | ✅ 부스의 승인된 요원 | 이 PR |
| `POST /api/v1/booths/{boothId}/valet-sessions/{sessionId}/park` | 주차 처리: 도착 예정 차 → 주차 완료(204). 부스 = 이 부스, 주차 시각 · 처리한 요원 기록, **업체의 최신 티켓** 연결, 회원 차면(탈퇴 보관 중 제외) 응답 뒤 고객에게 주차 완료 알림. 이 부스와 승인된 계약을 맺은 업체로 온 차만 됨. 400 `INVALID_REQUEST` · 403 `BOOTH_AGENT_REQUIRED` · 404 `BOOTH_NOT_FOUND` · `SESSION_NOT_FOUND` · 409 `NOT_PARKABLE`(이미 주차 처리 · 취소) | ✅ 부스의 승인된 요원 | 이 PR |
| `POST /api/v1/booths/{boothId}/valet-sessions/{sessionId}/pickup-response` | 출차 응답: `{ actualFee, expectedPickupMinutes }` (실제 요금 0~10,000,000원, 예상 출차 1~180분) → 204. 이 부스의 출차 요청 차 → 출차 준비 중, 응답 시각 · 응답한 요원 · 실제 요금 · 예상 출차 시각(지금 + 분, 분 단위로 올림) 기록, 회원 차면(탈퇴 보관 중 제외) 응답 뒤 고객에게 출차 응답 알림. 실제 요금은 이후 바꿀 수 없음. 400 `INVALID_REQUEST` · 403 `BOOTH_AGENT_REQUIRED` · 404 `BOOTH_NOT_FOUND` · `SESSION_NOT_FOUND` · 409 `NOT_RESPONDABLE`(이미 응답 · 출차 요청 아님) | ✅ 부스의 승인된 요원 | 이 PR |
| `POST /api/v1/booths/{boothId}/valet-sessions/{sessionId}/complete` | 출차 완료: 이 부스의 출차 준비 중 차 → 출차 완료(204), 완료 시각 · 처리한 요원 기록, 회원 차면(탈퇴 보관 중 제외) 응답 뒤 고객에게 출차 완료 알림. 차량 목록에서 빠짐. 400 `INVALID_REQUEST` · 403 `BOOTH_AGENT_REQUIRED` · 404 `BOOTH_NOT_FOUND` · `SESSION_NOT_FOUND` · 409 `NOT_COMPLETABLE`(이미 완료 · 출차 준비 중 아님) | ✅ 부스의 승인된 요원 | 이 PR |
| `POST /api/v1/booths/{boothId}/valet-sessions` | 차량 추가(알림 없이 온 차): `{ plateNumber }` (공백 · 하이픈 허용, `12가3456` 형태로 저장) → 주차 완료 세션 생성(201 `{ id }`). 그 번호로 가입한 회원이 있으면(탈퇴 보관 중 제외) 연결하고 응답 뒤 주차 완료 알림, 부스의 승인 계약 업체가 **1곳이면** 업체 · 최신 티켓 연결. 같은 번호로 진행 중인 세션이 있으면 409 `ACTIVE_SESSION_EXISTS`. 400 `INVALID_REQUEST` · 403 `BOOTH_AGENT_REQUIRED` · 404 `BOOTH_NOT_FOUND` | ✅ 부스의 승인된 요원 | 이 PR |
| `POST /api/v1/staff/push-devices` | 요원 앱 푸시 기기 등록: `{ token, platform: "IOS" \| "ANDROID" }`. 같은 토큰이 있으면 지금 요원으로 옮김(고객 기기였어도) → 204. 400 `INVALID_REQUEST` | ✅ | 이 PR |
| `DELETE /api/v1/staff/push-devices` | 요원 앱 푸시 기기 삭제: `{ token }` (내 기기만, 204). 로그아웃 때 부름 | ✅ | 이 PR |
| `GET /api/v1/merchant-booths?query=` | 업체 등록용 부스 검색: 이름 · 주소에 검색어가 들어간 부스의 `id` · `name` · `address` 만 (삭제 제외, 이름 순 최대 20개). 요원용 `GET /api/v1/booths` 와 달리 요금 정책 · 등록 요청을 싣지 않음. 승인 대기 중인 업체 관리자는 403 `MERCHANT_APPROVAL_PENDING`. 400 `INVALID_QUERY`(없음 · 50자 초과) · 403 `MERCHANT_ADMIN_REQUIRED` | ✅ 업체 관리자 | 이 PR |
| `GET /api/v1/merchants/me` | 내 업체 목록: 삭제되지 않은 내 업체의 업체명 · 주소 · 상세 주소 · 우편번호 · 좌표 · 사진 URL(등록한 순서) · 계약한 부스와 계약 상태(`PENDING` · `APPROVED` · `REJECTED`). 승인 대기 중에도 볼 수 있음. 403 `MERCHANT_ADMIN_REQUIRED` | ✅ 업체 관리자 | 이 PR |
| `POST /api/v1/merchant-registration-sessions` | 업체 등록 세션 열기: 등록 화면을 열 때 한 번 부름. 새로 만들면 201 `SESSION_CREATED`, 쓰던 세션이 있으면 200 `SESSION_RESUMED` (이때 앞서 예약만 해 둔 사진은 취소됨). 세션은 24시간 뒤 만료, 한 사람에 진행 중인 세션은 1개. 제출이 처리 중이면 409 `UNRESOLVED_SUBMISSION`. 403 `MERCHANT_ADMIN_REQUIRED` · `MERCHANT_APPROVAL_PENDING` | ✅ 업체 관리자 | 이 PR |
| `GET /api/v1/merchant-registration-sessions/{sessionId}` | 업체 등록 세션 상태: `state`(`OPEN` · `PROCESSING` · `RETRYABLE` · `COMMITTED` · `FAILED`) 와, 등록이 끝났으면 `merchantId`. 승인 대기 중에도 볼 수 있음. 만료된 세션은 410 `SESSION_EXPIRED`. 403 `MERCHANT_ADMIN_REQUIRED` · `SESSION_FORBIDDEN`(남의 세션) · 404 `SESSION_NOT_FOUND` | ✅ 업체 관리자 | 이 PR |
| `POST /api/v1/merchant-image-uploads/presign` | 업체 사진 업로드 예약: `{ sessionId, contentType, size, uploadId? }` (JPEG · PNG · WebP, 1바이트~5MiB) → 201 `{ uploadId, slot, expiresAt, upload: { url, fields } }`. 받은 `fields` 를 그대로 넣고 파일을 마지막에 붙여 S3 로 직접 POST. 예약은 5분 동안 유효하고 세션마다 5장까지(409 `SLOTS_FULL`). `uploadId` 를 주면 같은 예약의 유효 시간만 늘림(200). 400 `INVALID_INPUT` · 403 `SESSION_FORBIDDEN` · `UPLOAD_FORBIDDEN` · 404 `SESSION_NOT_FOUND` · `UPLOAD_NOT_FOUND` · 409 `SESSION_FROZEN` · `UPLOAD_NOT_REFRESHABLE` · `UPLOAD_MISMATCH` · 410 `SESSION_EXPIRED` · 503 `UPLOAD_SIGNING_FAILED` | ✅ 업체 관리자 | 이 PR |
| `DELETE /api/v1/merchant-registration-sessions/{sessionId}/uploads/{uploadId}` | 업체 사진 업로드 예약 취소: 등록 전에 사진을 뺄 때 부름 → 200 `UPLOAD_REVOKED`. 취소한 예약은 다시 쓸 수 없고 자리가 비어 새로 예약할 수 있음. 제출한 뒤에는 409 `SESSION_FROZEN`. 403 `SESSION_FORBIDDEN` · `UPLOAD_FORBIDDEN` · 404 `SESSION_NOT_FOUND` · `UPLOAD_NOT_FOUND` · 409 `UPLOAD_NOT_REMOVABLE` · 410 `SESSION_EXPIRED` | ✅ 업체 관리자 | 이 PR |
| `POST /api/v1/merchants` | 업체 등록: 헤더 `Idempotency-Key`, `{ sessionId, name, roadAddress, addressDetail?, postalCode, latitude, longitude, boothId, uploadIds }` (업체명 1~100자, 우편번호 5자리, 사진 1~5장 · 보낸 순서가 사진 순서) → 201 `CREATED` `{ merchantId }`. 업체 · 사진 · 부스 계약(`PENDING`)을 한 번에 만듦. **같은 키 + 같은 내용을 다시 보내면 같은 업체**를 200 `COMMITTED` 로 돌려줌. 처리 중이면 202 `PROCESSING`, 저장소 일시 오류면 503 `RETRYABLE_FAILURE` (둘 다 `Retry-After: 2`, 같은 요청을 그대로 다시 보냄). 400 `INVALID_INPUT` · 403 `INVALID_ORIGIN` · `MERCHANT_ADMIN_REQUIRED` · `MERCHANT_APPROVAL_PENDING` · `SESSION_FORBIDDEN` · `UPLOAD_FORBIDDEN` · 404 `SESSION_NOT_FOUND` · `BOOTH_NOT_FOUND` · 409 `IDEMPOTENCY_CONFLICT`(같은 키에 다른 내용) · 410 `SESSION_EXPIRED` · `UPLOAD_EXPIRED` · 422 `TERMINAL_FAILURE`(사진 검증 실패 등, 새 세션으로 다시 시작) | ✅ 업체 관리자 | 이 PR |

## 기반 PR

| PR | 내용 |
|---|---|
| [#9](https://github.com/justgo-valet/makkigo/pull/9) | 발렛 도메인 Prisma 모델 + 마이그레이션 (요원 · 부스 · 업체 · 티켓 · 세션 · 알림) |
| [#10](https://github.com/justgo-valet/makkigo/pull/10) | `database` 패키지 Prisma 클라이언트 export, Postgres adapter |

고객 인증 · 온보딩 API 와 기반 PR 은 모두 dev 에 머지됐습니다 (2026-10-04). #11 · #12 는 쌓인 상태에서 앞 브랜치로 머지되어, 같은 내용을 [#23](https://github.com/justgo-valet/makkigo/pull/23) · [#24](https://github.com/justgo-valet/makkigo/pull/24) 로 dev 에 다시 머지했습니다. 남은 것: #9 정리.

## 예정

- 탈퇴 회원 개인정보 삭제 배치
- 요원 쪽 인증 (로그인 후 유형 선택)
- 애플 로그인 회원 탈퇴 때 애플 토큰 철회
