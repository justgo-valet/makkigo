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
| `GET /api/v1/cars/brands` | 차량 브랜드 이름 · 로고 전체 주소 (`display_order` 순) | | [#51](https://github.com/justgo-valet/makkigo/pull/51) |
| `GET /api/v1/cars/models?brand=` | 브랜드별 차량 모델 이름 (한국어 순). 옛 경로 `/api/car/get-car-models` 는 삭제 | | dev (#5), [#26](https://github.com/justgo-valet/makkigo/pull/26) |
| `GET /api/v1/auth/oauth/{kakao\|google\|apple}` | 소셜 로그인 시작 → 제공자 로그인 페이지로 이동. 앱은 `?app_challenge=` | | [#38](https://github.com/justgo-valet/makkigo/pull/38) |
| `GET · POST /api/v1/auth/oauth/{provider}/callback` | 제공자 콜백: 회원 확인 · 가입 → 웹은 쿠키 + 이동, 앱은 1회용 코드로 앱 복귀 | | [#38](https://github.com/justgo-valet/makkigo/pull/38) |
| `POST /api/v1/auth/oauth/{provider}/app-session` | 앱 로그인 준비: `verifier` 를 웹뷰 쿠키에 심고, 앱이 열 `authUrl` · 돌아올 `returnUrl` 을 돌려줌 | | [#46](https://github.com/justgo-valet/makkigo/pull/46) |
| `GET /api/v1/auth/oauth/exchange?code=` (또는 `?error=`) | 앱 웹뷰에서 1회용 코드 + `verifier` 쿠키 → 로그인 쿠키 + 이동 | | [#38](https://github.com/justgo-valet/makkigo/pull/38) |
| `POST /api/v1/auth/refresh` | 토큰 재발급 (리프레시 토큰 교체) | 리프레시 쿠키 | [#12](https://github.com/justgo-valet/makkigo/pull/12) → [#24](https://github.com/justgo-valet/makkigo/pull/24) |
| `POST /api/v1/auth/logout` | 이 기기 로그아웃 | | [#13](https://github.com/justgo-valet/makkigo/pull/13) |
| `POST /api/v1/consents` | 약관 동의 기록 (선택 항목 동의 · 철회도 같은 API, 필수 항목 철회는 400). 위치기반서비스를 철회하면 위치 이용 기록을 모두 삭제 | ✅ | [#14](https://github.com/justgo-valet/makkigo/pull/14), [#113](https://github.com/justgo-valet/makkigo/pull/113), [#117](https://github.com/justgo-valet/makkigo/pull/117), [#176](https://github.com/justgo-valet/makkigo/pull/176) |
| `GET /api/v1/users/me` | 내 정보: 필수 약관 동의 여부(`requiredConsentsAgreed`), 온보딩 완료 여부(`onboardingCompleted`), 위치기반서비스 동의 여부(`locationAgreed`) | ✅ | [#37](https://github.com/justgo-valet/makkigo/pull/37), [#75](https://github.com/justgo-valet/makkigo/pull/75), [#112](https://github.com/justgo-valet/makkigo/pull/112), [#176](https://github.com/justgo-valet/makkigo/pull/176) |
| `GET /api/v1/users/me/vehicle` | 내 차량 목록 조회(차량 번호, 브랜드, 모델, 차량 이미지 `carImageUrl`). 브랜드 · 모델을 직접 입력했거나 모델 이미지가 아직 없으면 `carImageUrl` 은 기본 이미지(`cars/_default.png`)이고 `isCarImagePlaceholder` 가 `true` | ✅ | [#67](https://github.com/justgo-valet/makkigo/pull/67) |
| `GET /api/v1/users/me/profile` | 마이페이지 내 정보: 휴대폰 번호(`phoneNumber`), 차량 번호(`plateNumber`), 연동 계정(`socialAccounts`: 제공자 · 이메일), 선택 동의 상태(`consents`: `locationBasedService`) | ✅ | [#110](https://github.com/justgo-valet/makkigo/pull/110), [#176](https://github.com/justgo-valet/makkigo/pull/176) |
| `PATCH /api/v1/users/me/phone-number` | 휴대폰 번호 수정: `{ phoneNumber }` (하이픈 · 공백 허용, 숫자만 저장) → 204. 다른 회원(탈퇴 후 보관 중 포함) 번호면 409 `DUPLICATE_PHONE`, 형식 오류 400 | ✅ | [#111](https://github.com/justgo-valet/makkigo/pull/111) |
| `PATCH /api/v1/users/me/vehicle` | 차량 번호 수정: `{ vehicleNumber }` → 204. 브랜드 · 모델은 그대로. 다른 회원 차량이면 409 `DUPLICATE_VEHICLE`, 진행 중인 발렛 세션(완료 · 취소 아님)이 있으면 409 `ACTIVE_SESSION_EXISTS`, 차량 없음 404 `VEHICLE_REQUIRED`, 형식 오류 400 | ✅ | [#114](https://github.com/justgo-valet/makkigo/pull/114) |
| `DELETE /api/v1/users/me` | 회원 탈퇴 (푸시 기기도 삭제) → 204. 진행 중인 발렛 세션(도착 예정 · 주차 완료 · 출차 요청 · 출차 준비 중)이 있으면 409 `ACTIVE_VALET_SESSION`. 애플 회원은 애플 토큰도 철회 | ✅ | [#15](https://github.com/justgo-valet/makkigo/pull/15), [#169](https://github.com/justgo-valet/makkigo/pull/169), [#170](https://github.com/justgo-valet/makkigo/pull/170) |
| `POST /api/v1/push-devices` | 앱 푸시 기기 등록: `{ token, platform: "IOS" \| "ANDROID" }`. 같은 토큰이 있으면 지금 회원으로 옮김 (204) | ✅ | [#75](https://github.com/justgo-valet/makkigo/pull/75) |
| `DELETE /api/v1/push-devices` | 앱 푸시 기기 삭제: `{ token }` (내 기기만, 204). 로그아웃 때 부름 | ✅ | [#75](https://github.com/justgo-valet/makkigo/pull/75) |
| `POST /api/v1/onboarding` | 휴대폰 번호 · 차량 저장 | ✅ | [#16](https://github.com/justgo-valet/makkigo/pull/16) |
| `POST /api/v1/onboarding/phone-number/check` | 온보딩 휴대폰 번호 단계에서 다음으로 넘어가기 전 중복 확인 (204 사용 가능 · 409 `DUPLICATE_PHONE`, 내 번호는 통과) | ✅ | [#45](https://github.com/justgo-valet/makkigo/pull/45) |
| `POST /api/v1/onboarding/vehicle-number/check` | 온보딩 차량 번호 단계에서 다음으로 넘어가기 전 중복 확인 (204 사용 가능 · 409 `DUPLICATE_VEHICLE`, 내 차량은 통과) | ✅ | [#47](https://github.com/justgo-valet/makkigo/pull/47) |
| `GET /api/v1/merchants/{id}` | 업체 상세: `{ id, name, address, addressDetail, latitude, longitude, photoUrls, booths: [{ id, name, photoUrls, feePolicy }] }`. 사진(업체 · 부스 각각)은 순서대로 전체 주소, `booths` 는 계약이 승인되고 **현재 요금이 등록된** 부스와 그 요금(요금 없는 부스는 빠짐). 그런 부스가 없거나 삭제된 업체는 검색과 같이 404 `MERCHANT_NOT_FOUND` | ✅ | [#101](https://github.com/justgo-valet/makkigo/pull/101) |
| `GET /api/v1/merchants?q=` | 업체 검색: 이름 · 주소에 검색어가 들어간 업체 중 **계약이 승인되고 현재 요금이 등록된 부스가 있는** 곳만 (삭제 제외, 이름 순 최대 20개). `q` 없음 · 50자 초과는 400 | ✅ | [#72](https://github.com/justgo-valet/makkigo/pull/72) |
| `POST /api/v1/valet-sessions` | 도착 알림 보내기: `{ merchantId, location? }` → 도착 예정 세션 생성(201 `{ id }`) + 받을 요원에게 알림 기록, 응답 뒤 푸시. `location`(`{ latitude, longitude }`)이 있고 위치기반서비스에 동의했으면 예상 도착 시각을 계산해 저장(실패해도 세션은 만듦). 403 `VEHICLE_REQUIRED` · 404 `MERCHANT_NOT_FOUND` · 409 `ACTIVE_SESSION_EXISTS` · 422 `NO_AVAILABLE_BOOTH` | ✅ | [#73](https://github.com/justgo-valet/makkigo/pull/73), [#100](https://github.com/justgo-valet/makkigo/pull/100) |
| `POST /api/v1/valet-sessions/{id}/cancel` | 도착 알림 취소: 내 도착 예정 세션 → 취소(204) + 도착 알림을 받았던 요원에게 취소 알림 기록, 응답 뒤 푸시. 404 `SESSION_NOT_FOUND` · 409 `NOT_CANCELLABLE`(이미 취소 · 주차 시작) | ✅ | [#74](https://github.com/justgo-valet/makkigo/pull/74) |
| `GET /api/v1/notifications?cursor=` | 내 알림 내역: 최신순 20개씩 `{ notifications: [{ id, type, title, body, valetSessionId, readAt, createdAt }], nextCursor }`. 다음 페이지는 `nextCursor` 를 `cursor` 로 넘김(없으면 `null`). 잘못된 `cursor` 는 400 `INVALID_CURSOR` | ✅ | [#105](https://github.com/justgo-valet/makkigo/pull/105) |
| `GET /api/v1/valet-sessions/current` | 현재 세션 조회: 내 세션 중 출차 완료 · 취소가 아닌 가장 최근 것 → `{ session }`(없으면 `null`). 주차된 뒤에는 `ticketNumber`(업체별 그날 일련번호, 화면에서는 6자리 `000001`). 업체 id(`merchantId`, 메인이 도착 예정일 때 업체 상세로 부스 위치 사진을 받음) · 업체 · 부스 이름, 도착 알림 · 지연, 입차 · 출차 요청 시각, 같은 부스 출차 대기 대수(`waitingPickupCount`), 요금(`fee`: 주차 완료는 지금 기준, 출차 요청 이후는 출차 요청 시각 기준), 실제 요금 · 예상 출차 시각, 출차 요청 이후 부스 계좌(`bankAccount`), 세션의 `ticketVersionId` 유무(`hasTicket`). 티켓 디자인 본문은 별도 페이지가 로그인 회원의 세션을 확인해 불러옴. 형식은 `libs/valet/contracts/currentSession.ts` | ✅ | [#115](https://github.com/justgo-valet/makkigo/pull/115), [#157](https://github.com/justgo-valet/makkigo/pull/157) |
| `POST /api/v1/valet-sessions/{id}/pickup-request` | 출차 요청: 내 주차 완료 세션 → 출차 요청(출차 요청 시각 · 기준 요금 저장) + 세션 부스의 승인된 요원 중 알림 켜진 사람에게 알림 기록, 응답 뒤 푸시 → 200 `{ session }`(현재 세션 조회와 같은 형식, 계좌 포함). 요금 기준표가 없는 부스면 기준 요금을 비워 두고 접수. 404 `SESSION_NOT_FOUND`(남의 세션 · 끝난 세션) · 409 `NOT_PARKED`(도착 예정) · 409 `ALREADY_REQUESTED`(이미 요청 · 출차 준비 중, 동시 요청의 나머지) · 422 `NO_BOOTH`(부스 없는 세션) | ✅ | [#119](https://github.com/justgo-valet/makkigo/pull/119) |
| `POST /api/v1/valet-sessions/{id}/delay` | 지연 알림 보내기: `{ minutes }`(5분 단위, 5 ~ 60) → 내 도착 예정 세션의 지연 시간 · 시각 저장(204, 다시 보내면 덮어씀) + 도착 알림을 받았던 요원에게 지연 알림 기록, 응답 뒤 푸시. 400 잘못된 `minutes` · 404 `SESSION_NOT_FOUND` · 409 `NOT_DELAYABLE`(이미 취소 · 주차 시작) | ✅ | [#121](https://github.com/justgo-valet/makkigo/pull/121) |
| `POST /api/v1/notifications/read` | 내 안 읽은 알림을 모두 읽음으로(204). 알림 바텀시트를 열 때 부름 | ✅ | [#130](https://github.com/justgo-valet/makkigo/pull/130) |
| `GET /api/v1/guest/merchants/{id}` | **비회원(업체 QR)**: 업체 정보와 최신 티켓 `{ merchant: { id, name }, ticket }`(티켓 없으면 `null`). 닫힌 업체 · 승인된 부스 계약이 없는 업체는 404 `MERCHANT_NOT_FOUND` | 없음 | |
| `POST /api/v1/guest/merchants/{id}/session` | **비회원**: `{ plateNumber }`(공백 · 하이픈 허용) → `{ session, ticket }`. `session` 은 현재 세션 조회와 같은 형식. 찾는 범위는 그 번호의 진행 중 세션 중 **이 업체와 승인된 계약이 있는 부스**에 있거나 **이 업체로 연결된** 것. `ticket` 은 세션의 티켓, 세션에 티켓이 없으면 (세션에 업체가 없거나 이 업체일 때만) 이 업체 최신 티켓. 번호가 주소 · 로그에 남지 않게 POST. 400 `INVALID_PLATE_NUMBER` · 404 `MERCHANT_NOT_FOUND` · `SESSION_NOT_FOUND` | 없음 | |
| `POST /api/v1/guest/merchants/{id}/pickup-request` | **비회원 출차 요청**: `{ plateNumber, agreed: true, documentVersion }` → 회원 출차 요청과 같은 처리(기준 요금 고정 · 요원 알림 · 푸시) + 세션에 업체가 없었으면 **이 업체 · 최신 티켓 연결** + `guest_consents` 에 이용약관 · 제3자 제공 동의 기록 → 200 `{ session, ticket }`. 400 `CONSENT_REQUIRED` · 404 · 409 `NOT_PARKED` · `ALREADY_REQUESTED` · 422 `NO_BOOTH` | 없음 | |
| (비회원 API 공통) | 로그인 없음, `Cache-Control: no-store`. **IP 당 분당 조회 120회 · 출차 요청 10회**(따로 셈, 서버 메모리 — EC2 한 대 기준) 넘으면 429 `TOO_MANY_REQUESTS`. 화면이 5초마다 다시 읽어(탭 하나 분당 12회) 같은 와이파이 · 통신사 IP 를 쓰는 손님 여럿을 고려. IP 는 Caddy 가 채우는 `X-Forwarded-For` 첫 값 | | |

상태 코드, 요청 예시, 확인 결과는 각 PR 본문에 있습니다.

## 요원 앱 (`apps/valetagents`)

| 메서드 · 경로 | 하는 일 | 로그인 | PR |
|---|---|---|---|
| `GET /api/v1/booths?q=` | 부스 검색: 이름 · 주소에 검색어가 들어간 부스 (삭제 제외, 이름 순 최대 20개) + 최신 요금 정책 + **내** 등록 요청. `q` 없음 · 50자 초과는 400 `INVALID_QUERY`, 요원이 아니면 403 `VALET_AGENT_REQUIRED` | ✅ 요원 | [#77](https://github.com/justgo-valet/makkigo/pull/77) |
| `POST /api/v1/booths` | 부스 생성: `{ name, address, addressDetail?, feePolicy, bankAccount, managerName, photoUploads? }` (앞뒤 공백 제거 후 이름 1~50자 · 주소 1~200자 · 상세 주소 100자 이하, 비면 `null`. `managerName` 은 만든 사람(부스 관리자) 이름 1~20자, 같은 트랜잭션에서 `staff.name` 에 저장해 요원 관리 화면에 보임. `feePolicy` 는 **필수** 요금표 `{ baseMinutes, baseFee, extraUnitMinutes, extraUnitFee }`, 규칙은 요금 · 계좌 API 와 같음(기본 60분 단위 1~24시간, 추가 1~180분, 금액 0~1,000,000원), 같은 트랜잭션에서 `booth_fee_policies` 에 기록. `photoUploads` 는 사진 업로드 예약 API 가 준 `uploadId` · `contentType` · `size` 목록, 보낸 순서가 사진 순서, 최대 5장) → 201 `{ id }`. 사진은 임시 위치에서 크기 · 형식 · 파일 머리 바이트를 확인한 뒤 최종 위치로 복사하고 `booth_photos` 에 기록. **온보딩을 마치지 않은 요원만** 만들 수 있고, 만든 사람은 같은 트랜잭션에서 그 부스의 승인된 요원(근무 시간 없음)이 되어 온보딩이 끝남. 주소가 지도에서 찾아지는지는 화면에서만 확인. 400 `INVALID_REQUEST`(모르는 키 포함) · 403 `VALET_AGENT_REQUIRED` · `ALREADY_ONBOARDED` · 409 `REQUEST_CONFLICT` | ✅ 요원 | [#97](https://github.com/justgo-valet/makkigo/pull/97), [#168](https://github.com/justgo-valet/makkigo/pull/168) |
| `POST /api/v1/booth-image-uploads/presign` | 부스 사진 업로드 예약: `{ uploads: [{ contentType, size }] }` (1~5장, JPEG · PNG · WebP, 장당 1바이트~5MiB) → `{ uploads: [{ uploadId, contentType, size, post: { url, fields } }] }`. 받은 `fields` 로 S3 `booths/staging` 에 직접 POST 하고, 부스 생성 때 `photoUploads` 로 넘김. 같은 출처 요청만(403 `INVALID_ORIGIN`), 부스 생성과 같은 자격 검사(403 `VALET_AGENT_REQUIRED` · `ALREADY_ONBOARDED`, 409 `REQUEST_CONFLICT`), 400 `INVALID_REQUEST` | ✅ 요원 | [#168](https://github.com/justgo-valet/makkigo/pull/168) |
| `PUT /api/v1/booths/{boothId}/agent-request` | 부스 등록 요청: `{ name, workStartTime, workEndTime }` (이름 1~20자, 같은 트랜잭션에서 `staff.name` 에 저장 · HH:mm). 처음이면 201 `CREATED`, 대기 중이면 근무시간만 바꿔 200 `UPDATED`, 거절됐으면 다시 요청 상태로 200 `REOPENED`. 400 `INVALID_REQUEST` · `INVALID_WORK_TIME` · 403 `VALET_AGENT_REQUIRED` · 404 `BOOTH_NOT_FOUND` · 409 `ALREADY_APPROVED` · `REQUEST_CONFLICT` | ✅ 요원 | [#78](https://github.com/justgo-valet/makkigo/pull/78) |
| `POST /api/v1/staff/me/consents` | 요원 약관 동의: 동의를 기록하고, 역할이 비어 있으면 **같은 트랜잭션에서 `VALET_AGENT` 로 정함** → 부스 온보딩으로. 역할 선택 API(`POST · DELETE /api/v1/onboarding`)는 업체 관리자가 요원 앱에서 빠지며 없앰 (decisions 2026-11-19) | ✅ | |
| `GET /api/v1/onboarding/status` | 온보딩 상태: `role`, `state`(`ROLE_REQUIRED` · `BOOTH_REQUIRED` · `AWAITING_APPROVAL` · `COMPLETE`), `nextPath`, 내 등록 요청 목록(부스 · 최신 요금 정책 포함). 요원은 승인된 소속이 하나라도 있으면 `COMPLETE`. 업체 관리자는 업체가 없으면 `MERCHANT_REGISTRATION_REQUIRED`, 업체는 있지만 승인된 부스 계약이 없으면 `MERCHANT_APPROVAL_PENDING`, 승인된 계약이 하나라도 있으면 `COMPLETE` | ✅ | [#79](https://github.com/justgo-valet/makkigo/pull/79), [#133](https://github.com/justgo-valet/makkigo/pull/133) |
| `GET /api/v1/booths/{boothId}/agents?page=` | 부스 요원 목록: 이름 · 근무시간 · 근무 중 여부(`working`) · 등록 상태, 등록 → 요청 중 → 거절 순(같은 상태 안에서는 요청한 순) 10명씩 (`page`, `totalPages`). 탈퇴한 요원 제외. 400 `INVALID_PAGE` · 403 `BOOTH_MANAGER_REQUIRED` · 404 `BOOTH_NOT_FOUND` | ✅ 부스 관리자 | [#81](https://github.com/justgo-valet/makkigo/pull/81) |
| `PATCH /api/v1/booths/{boothId}/agents` | 요원 등록 수락 · 거절: `{ status: "APPROVED" \| "REJECTED", agents: [{ id, updatedAt }] }` → 204. 고른 요원 전부를 한 번에 바꾸거나 하나도 바꾸지 않음. **이미 등록된 요원은 거절할 수 없음**(409 `AGENT_ALREADY_APPROVED`). 목록을 본 뒤 요원이 요청을 고쳤으면 409 `AGENT_CHANGED`. 400 `INVALID_REQUEST` · 403 `BOOTH_MANAGER_REQUIRED` · 404 `BOOTH_NOT_FOUND` · `AGENT_NOT_FOUND` | ✅ 부스 관리자 | [#82](https://github.com/justgo-valet/makkigo/pull/82) |
| `PUT /api/v1/booths/{boothId}/agents/me/notifications` | 내 알림 켜기 · 끄기: `{ enabled }` → 204. 이 부스에서 승인된 내 소속의 `notifications_enabled` 를 바꿈(도착 알림 · 출차 요청 알림을 받을지). 400 `INVALID_REQUEST` · 403 `BOOTH_AGENT_REQUIRED` · 404 `BOOTH_NOT_FOUND` | ✅ 부스의 승인된 요원 | [#157](https://github.com/justgo-valet/makkigo/pull/157) |
| `GET /api/v1/staff/me/notifications?cursor=` | 내가 받은 알림(도착 · 지연 · 취소 · 출차 요청 등) 최신순 20개씩 → `{ notifications: [{ id, type, title, body, createdAt }], nextCursor }`. 알림이 꺼져 있을 때는 알림이 만들어지지 않으므로 받은 것만 보임. 400 `INVALID_CURSOR` · 401 | ✅ 요원 | |
| `GET /api/v1/booths/{boothId}/merchants?page=` | 부스 계약 업체 목록: 부스와 계약 행이 있는 업체의 업체명 · 주소 · 상세 주소 · 계약 상태(`APPROVED` 등록 · `PENDING` 대기 · `REJECTED` 거절) · `updatedAt`, 계약 요청 순 5곳씩 (`page`, `totalPages`). 거절된 업체도 남고 삭제된 업체는 제외. 등록일자 필드는 없고 화면이 `status` + `updatedAt` 으로 만듦. 400 `INVALID_REQUEST` · `INVALID_PAGE` · 403 `BOOTH_MANAGER_REQUIRED` · 404 `BOOTH_NOT_FOUND` | ✅ 부스 관리자 | [#98](https://github.com/justgo-valet/makkigo/pull/98) |
| `PATCH /api/v1/booths/{boothId}/merchants` | 업체 계약 수락 · 거절: `{ status: "APPROVED" \| "REJECTED", merchants: [{ id, updatedAt }] }` (업체 1~5곳, `id` 는 업체 id) → 204. 고른 업체 전부를 한 번에 바꾸거나 하나도 바꾸지 않음. **이미 등록된 업체는 거절할 수 없음**(409 `MERCHANT_ALREADY_APPROVED`), 거절된 업체는 다시 수락할 수 있음. 목록을 본 뒤 계약 행이 바뀌었으면 409 `MERCHANT_CHANGED` (겹친 두 요청도 한쪽만 성공). 이미 그 상태인 업체는 건드리지 않음. 400 `INVALID_REQUEST` · 403 `BOOTH_MANAGER_REQUIRED` · 404 `BOOTH_NOT_FOUND` · `MERCHANT_NOT_FOUND` | ✅ 부스 관리자 | [#99](https://github.com/justgo-valet/makkigo/pull/99) |
| `PUT /api/v1/booths/{boothId}/payment-settings` | 부스 요금 · 계좌 저장: `{ feePolicy: { baseMinutes, baseFee, extraUnitMinutes, extraUnitFee }, bankAccount: { bankName, accountNumber, accountHolder } }` → 204. 기본 시간은 1~24시간(60분 단위), 요금 0~1,000,000원, 추가 단위 1~180분, 은행 1~20자 · 계좌번호 숫자로 시작하고 끝나는 숫자 · 하이픈 30자 이하 · 예금주 1~30자(세 값 모두 앞뒤 공백 제거). 지금 값과 다른 것만 **새 행으로 쌓고**(이전 행은 남김) 이미 출차 요청한 차의 기준 요금(합계)은 그대로. 400 `INVALID_REQUEST` · 403 `BOOTH_MANAGER_REQUIRED` · 404 `BOOTH_NOT_FOUND` | ✅ 부스 관리자 | [#157](https://github.com/justgo-valet/makkigo/pull/157) |
| `GET /api/v1/booths/{boothId}/valet-sessions` | 부스 차량 목록: 진행 중인 세션 전부를 들어온 순으로 `{ items: [{ id, status, plateNumber, ticketNumber, carImageUrl, expectedArrivalAt, arrivalDelayMinutes, parkedAt, pickupRequestedAt, fee }], completedCount, notificationsEnabled }`. `notificationsEnabled` 는 이 부스에서 내 소속의 알림 켜짐 여부(홈 종 아이콘). `completedCount` 는 이 부스에서 **오늘(서울 시간 0시 이후)** 출차 완료된 차 대수(홈 대수 줄의 "완료"). 출차 완료 차 목록은 집계 화면(`/booths/{boothId}/history`)이 서버에서 직접 읽음. 배포 직전에 열려 있던 옛 화면이 깨지지 않게 당분간 빈 `completed: []` 도 같이 보냄(다음 배포에서 뺌). `fee` 는 출차 요청 때 고정된 기준 요금(원, 출차 요청 전이거나 기준표가 없었으면 `null`). 홈은 출차 요청 · 출차 준비 중 칸에만 보임. 도착 예정(`ARRIVING`)은 부스와 **승인된 계약**을 맺은 업체로 온 차, 주차 완료 · 출차 요청 · 출차 준비 중은 이 부스에 주차된 차. 취소 · 출차 완료는 빠짐. `carImageUrl` 은 차량 모델 이미지, 모델을 모르면 기본 이미지(`cars/_default.png`). 페이지 없음 — 화면이 5초마다 다시 부름. 400 `INVALID_REQUEST` · 403 `BOOTH_AGENT_REQUIRED` · 404 `BOOTH_NOT_FOUND` | ✅ 부스의 승인된 요원 | [#149](https://github.com/justgo-valet/makkigo/pull/149), [#157](https://github.com/justgo-valet/makkigo/pull/157) |
| `POST /api/v1/booths/{boothId}/valet-sessions/{sessionId}/park` | 주차 처리: 도착 예정 차 → 주차 완료(204). 부스 = 이 부스, 주차 시각 · 처리한 요원 기록, **업체의 최신 티켓** 연결, **티켓 일련번호** 배정(아래), 회원 차면(탈퇴 보관 중 제외) 응답 뒤 고객에게 주차 완료 알림. 이 부스와 승인된 계약을 맺은 업체로 온 차만 됨. 400 `INVALID_REQUEST` · 403 `BOOTH_AGENT_REQUIRED` · 404 `BOOTH_NOT_FOUND` · `SESSION_NOT_FOUND` · 409 `NOT_PARKABLE`(이미 주차 처리 · 취소) | ✅ 부스의 승인된 요원 | [#152](https://github.com/justgo-valet/makkigo/pull/152) |
| `POST /api/v1/booths/{boothId}/valet-sessions/{sessionId}/pickup-response` | 출차 응답: `{ actualFee, expectedPickupMinutes }` (실제 요금 0~10,000,000원, 예상 출차 1~180분) → 204. 이 부스의 출차 요청 차 → 출차 준비 중, 응답 시각 · 응답한 요원 · 실제 요금 · 예상 출차 시각(지금 + 분, 분 단위로 올림) 기록, 회원 차면(탈퇴 보관 중 제외) 응답 뒤 고객에게 출차 응답 알림. 실제 요금은 이후 바꿀 수 없음. 400 `INVALID_REQUEST` · 403 `BOOTH_AGENT_REQUIRED` · 404 `BOOTH_NOT_FOUND` · `SESSION_NOT_FOUND` · 409 `NOT_RESPONDABLE`(이미 응답 · 출차 요청 아님) | ✅ 부스의 승인된 요원 | [#157](https://github.com/justgo-valet/makkigo/pull/157) |
| `POST /api/v1/booths/{boothId}/valet-sessions/{sessionId}/complete` | 출차 완료: 이 부스의 출차 준비 중 차 → 출차 완료(204), 완료 시각 · 처리한 요원 기록, 회원 차면(탈퇴 보관 중 제외) 응답 뒤 고객에게 출차 완료 알림. 차량 목록의 `items` 에서 빠지고 `completed`(오늘 출차 완료)에 들어감. 400 `INVALID_REQUEST` · 403 `BOOTH_AGENT_REQUIRED` · 404 `BOOTH_NOT_FOUND` · `SESSION_NOT_FOUND` · 409 `NOT_COMPLETABLE`(이미 완료 · 출차 준비 중 아님) | ✅ 부스의 승인된 요원 | [#157](https://github.com/justgo-valet/makkigo/pull/157) |
| `POST /api/v1/booths/{boothId}/valet-sessions` | 차량 추가(알림 없이 온 차): `{ plateNumber, merchantId? }` (공백 · 하이픈 허용, `12가3456` 형태로 저장) → 주차 완료 세션 생성(201 `{ id }`). 그 번호로 가입한 회원이 있으면(탈퇴 보관 중 제외) 연결하고 응답 뒤 주차 완료 알림, `merchantId` 를 주면 그 업체 · 최신 티켓 연결(이 부스와 승인된 계약이 아니면 409 `MERCHANT_NOT_CONTRACTED`), `null` 이면 업체 없이(요원이 "선택 안 함"), 아예 안 주면 부스의 승인 계약 업체가 **1곳일 때만** 자동 연결. 같은 번호로 진행 중인 세션이 있으면 409 `ACTIVE_SESSION_EXISTS`. 400 `INVALID_REQUEST` · 403 `BOOTH_AGENT_REQUIRED` · 404 `BOOTH_NOT_FOUND` | ✅ 부스의 승인된 요원 | [#153](https://github.com/justgo-valet/makkigo/pull/153) |
| `POST /api/v1/staff/push-devices` | 요원 앱 푸시 기기 등록: `{ token, platform: "IOS" \| "ANDROID" }`. 같은 토큰이 있으면 지금 요원으로 옮김(고객 기기였어도) → 204. 400 `INVALID_REQUEST` | ✅ | [#171](https://github.com/justgo-valet/makkigo/pull/171) |
| `DELETE /api/v1/staff/push-devices` | 요원 앱 푸시 기기 삭제: `{ token }` (내 기기만, 204). 로그아웃 때 부름 | ✅ | [#171](https://github.com/justgo-valet/makkigo/pull/171) |
| `PATCH /api/v1/staff/me` | 내 이름 바꾸기 `{ name }`(앞뒤 공백 제거 후 1~20자, 모르는 키 거부) → 204. 요원 관리 화면 등에 보이는 `staff.name`. 400 `INVALID_REQUEST` · 401 | ✅ | |
| `DELETE /api/v1/staff/me` | 요원 탈퇴 → 204 (인증 쿠키 삭제). 소셜 연결 · 로그인 코드 · 푸시 기기 · 요원 알림 삭제, 리프레시 토큰 모두 폐기, 직접 만든 부스도 삭제 표시. 그 부스에 진행 중인 발렛이 있으면 409 `ACTIVE_VALET_SESSION` (아무것도 바뀌지 않음) → [policies.md](../planning/policies.md#요원-탈퇴) | ✅ | |

업체 관리자용 API(`merchant-booths`, `merchants*`, `merchant-registration-sessions*`, `merchant-image-uploads/presign`, `tickets`, `ticket-image-uploads/*`)는 2026-11-19 에 요원 앱에서 없앴습니다. 업체 관리자는 티켓 웹, 업체 등록은 슈퍼 어드민이 맡습니다.

## 업체 관리자 포털 (`apps/tickets`)

아이디 · 비밀번호 로그인 → [auth.md](auth.md#아이디--비밀번호-로그인-업체-관리자--슈퍼-어드민). 로그인한 업체 관리자에 **연결된 업체(삭제 제외)** 로만 범위를 정합니다. 비밀번호 변경이 필요한 계정은 아래 API 에서 403 `PASSWORD_CHANGE_REQUIRED`, 업체가 연결되지 않은 계정은 403 `MERCHANT_REQUIRED`. 바꾸는 요청은 모두 같은 출처만 받음(403 `INVALID_ORIGIN`).

| 메서드 · 경로 | 하는 일 |
|---|---|
| `POST /api/v1/auth/login` | `{ loginId, password }` → 204 + 쿠키. 401 틀림 · 429 잠김 · 403 비활성 |
| `GET · POST /api/v1/auth/refresh` | 토큰 재발급. GET 은 `?next=` 로 페이지 이동(같은 앱 경로만) |
| `POST /api/v1/auth/logout` | 이 기기 리프레시 토큰 폐기 + 쿠키 삭제 |
| `POST /api/v1/account/password` | `{ currentPassword, newPassword }` → 204 + 새 쿠키(다른 기기 로그아웃). 현재 비밀번호가 틀리면 **400**(401 이면 공통 클라이언트가 로그인 만료로 처리함). 실패 횟수는 로그인과 같이 셈 |
| `GET /api/v1/valet-sessions` | 내 업체의 발렛 현황(요원 앱에 있던 업체용 차량 현황을 옮김). 진행 중 · 오늘 출차 완료 모두 `ticketNumber`(그날 티켓 일련번호) 포함 |
| `GET · POST /api/v1/tickets` | 티켓 목록 · 생성 · 새 버전. 이미지 경로는 **같은 업체**의 확정된 업로드만(올린 관리자는 따지지 않음) |
| `POST /api/v1/ticket-image-uploads/presign` · `complete` | 티켓 이미지 업로드(`tickets/staging/` → `tickets/final/`). 다른 업체면 404 |
| `POST /api/v1/merchant-account-requests` | **로그인 없이** 업체 관리자 계정 요청 `{ merchantId, merchantName, merchantAddress, requesterName, requesterPhone, privacyConsent: true }` → 201. `merchantId` 가 있으면 그 업체(삭제 제외, 없으면 404), `null` 이면 새 업체 이름 · 주소 필수. 연락처는 숫자만 저장. 같은 연락처로 같은 업체에 대기 중인 요청이 있으면 409 `ALREADY_REQUESTED`. IP 당 15분에 20번(429) |

화면 `/find-merchant`(로그인 없이 업체 이름 · 주소 검색, 2자 이상, 20개까지, IP 당 15분에 20번) · `/find-merchant/request?merchant=<id>`(계정 요청, 업체가 없으면 업체 등록 요청). 로그인 화면에 "내 업체 찾기" 링크.

## 슈퍼 어드민 (`apps/admin`)

모두 슈퍼 어드민 로그인 필요, 바꾸는 요청은 같은 출처만. 목록은 20개씩.

| 메서드 · 경로 | 하는 일 |
|---|---|
| `POST /api/v1/auth/login` · `GET · POST /api/v1/auth/refresh` · `POST /api/v1/auth/logout` | 업체 관리자 포털과 같은 규칙 |
| `GET /api/v1/kakao-places?query=` | 카카오 로컬 키워드 검색(서버에서 `KAKAO_REST_API_KEY` 로 호출) → 이름 · 주소 · 우편번호 · 좌표 · 전화 · 장소 ID |
| `GET · POST /api/v1/merchants` | 업체 검색(선택 목록용) · 추가. 같은 카카오 장소 ID 는 409 |
| `PUT · DELETE /api/v1/merchants/{id}` | 업체 수정 · 삭제 표시(장소 ID 도 비워 다시 등록 가능) |
| `POST /api/v1/merchant-account-requests/{id}/reject` | 대기 중인 계정 요청 거절. 대기가 아니면 404 `REQUEST_NOT_PENDING` |
| `POST /api/v1/merchants/{id}/photos/presign` → `POST /api/v1/merchants/{id}/photos` | 사진 업로드: `merchants/staging/` 에 직접 POST 뒤 완료 요청이 크기 · 형식 · 파일 signature 를 보고 `merchants/final/{id}/` 로 복사, 행 추가, staging 삭제. **업체당 5장**(업체 행 잠금으로 동시 요청도 막음) |
| `PUT /api/v1/merchants/{id}/photos` · `DELETE …/photos/{photoId}` | 사진 순서 바꾸기 · 삭제(S3 파일도) |
| `POST /api/v1/merchant-admins` | 업체 관리자 계정 만들기 `{ loginId, name, merchantId?, accountRequestId? }` → 임시 비밀번호를 **한 번만** 보여 줌. 같은 아이디는 409. `accountRequestId` 를 주면 같은 트랜잭션에서 그 계정 요청을 발급 완료로 바꾸고 계정을 이어 둠. 요청이 이미 처리됐으면 409 `REQUEST_NOT_PENDING`(계정도 만들지 않음) |
| `PATCH /api/v1/merchant-admins/{id}` | 업체 연결 · 해제 `{ merchantId \| null }` |
| `POST /api/v1/merchant-admins/{id}/password-reset` · `disable` | 임시 비밀번호 재설정(변경 필수 + 모든 기기 로그아웃) · 사용 중지 |
| `PUT · DELETE /api/v1/booths/{boothId}/merchants/{merchantId}` | 부스 연결 요청(없음 · 거절 → `PENDING`, 대기 · 등록이면 409) · 대기 취소 또는 등록 해제. 승인은 부스 관리자가 요원 앱에서 |
| `GET /api/v1/regions?query=` | 업체 수집 지역 찾기: 카카오 주소 검색의 법정동코드 앞 5자리 → `{ region: { code, name } }`. 시군구가 아니면 404 `REGION_NOT_FOUND` |
| `GET /api/v1/industry-categories?parent=` | 상가정보 업종 분류. `parent` 없으면 대분류, 있으면(2자리) 그 중분류. 서비스키가 없으면 503 `PUBLIC_DATA_KEY_MISSING` |
| `POST /api/v1/merchant-import-targets` | 수집 대상 추가 `{ signguCode, signguName, industries: [{ code, name }] }`(중분류 1~50개) |
| `DELETE /api/v1/merchant-import-targets/{id}` | 수집 대상 삭제. 가져온 업체는 남음 |
| `POST /api/v1/merchant-import-targets/{id}/run` | 그 대상 하나를 바로 수집하고 `{ result }`(실패도 200 + `ok: false`, 대상에 저장). 서비스키가 없으면 503. 화면의 "전체 수집" 은 이 API 를 대상마다 차례로 부름(따로 API 없음). 규칙(추가 · 건너뜀 · 삭제 · 되살림 · 대량 삭제 멈춤) → [runbook.md](../operations/runbook.md#업체-수집) |

화면: 대시보드(업체 · 업체 관리자 · 부스 · 요원 · 고객 수, 오늘 · 진행 중 세션, 연결 대기, 계정 요청 대기, 최근 세션), 업체(출처 수동/공공데이터 · 업종, "부스 연결된 업체만" `?linked=1`), 업체 수집, 업체 관리자, 계정 요청(대기/전체, 계정 발급 · 거절. 처리한 요청은 목록을 열 때 30일 지난 것을 지움), 부스, 발렛 세션.

## 기반 PR

| PR | 내용 |
|---|---|
| [#9](https://github.com/justgo-valet/makkigo/pull/9) | 발렛 도메인 Prisma 모델 + 마이그레이션 (요원 · 부스 · 업체 · 티켓 · 세션 · 알림) |
| [#10](https://github.com/justgo-valet/makkigo/pull/10) | `database` 패키지 Prisma 클라이언트 export, Postgres adapter |

고객 인증 · 온보딩 API 와 기반 PR 은 모두 dev 에 머지됐습니다 (2026-10-04). #11 · #12 는 쌓인 상태에서 앞 브랜치로 머지되어, 같은 내용을 [#23](https://github.com/justgo-valet/makkigo/pull/23) · [#24](https://github.com/justgo-valet/makkigo/pull/24) 로 dev 에 다시 머지했습니다. 남은 것: #9 정리.

