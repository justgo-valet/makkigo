# 데이터베이스

- PostgreSQL 16 (docker compose) + Prisma 7
- 패키지: `packages/database` — 모델은 `prisma/models/*.prisma` 에 나눠 둡니다.
- 앱에서 쓰기: `import { prisma } from "database"` (#10)
- 스키마 반영은 **마이그레이션 파일**(`prisma migrate deploy`)로 합니다. 스키마를 바꾸는 PR 은 마이그레이션 파일을 함께 올리고, CI 가 빠뜨린 것을 잡습니다.

## 규칙

| 항목 | 규칙 |
|---|---|
| ID | 자동 증가 `Int` (차량 브랜드·모델과 통일). 예외: 티켓 이미지 업로드(`ticket_image_uploads`)는 브라우저가 재시도에 쓰는 UUID |
| 이름 | 필드 camelCase, 컬럼 `@map` snake_case, 테이블 복수형 snake_case |
| 들여쓰기 | 4칸 (`prisma format` 은 2칸으로 바꾸므로 주의) |
| 시각 | `timestamptz(3)` |
| 금액 | 원 단위 `Int` |
| 삭제 | 회원은 탈퇴 시각 기록 (soft delete) + 개인정보 30일 후 삭제 |
| 주석 | 코드에는 최소화, 설명은 PR 과 이 문서에 |
| 이미지 | 전체 주소가 아니라 **경로만** 저장 (`booth_photos.path`, `merchant_photos.path`, `logo_url`, `image_url`). 서버가 `IMAGE_BASE_URL`(런타임 환경변수)과 합쳐 전체 주소로 응답 |

## 테이블

| 영역 | 테이블 | 어디에 |
|---|---|---|
| 차량 마스터 | `car_brands`(35), `car_models`(182) — 데이터는 `prisma/init/init.sql`, 컨테이너 시작마다 실행(같은 이름이면 이미지 경로 · 브랜드 표시 순서만 갱신). 브랜드 목록은 `display_order` 순 | dev (#8) |
| 고객 인증 | `users`, `user_social_accounts`(`provider_refresh_token` 은 애플 탈퇴 철회용), `user_refresh_tokens`, `user_login_codes`(앱 로그인 1회용 코드) | #11, [#38](https://github.com/justgo-valet/makkigo/pull/38), [#170](https://github.com/justgo-valet/makkigo/pull/170) |
| 약관 | `user_consents` (enum `PRIVACY_OVERSEAS_TRANSFER` · `APP_PUSH` · `ALIMTALK` 는 기존 기록용, 새로 받지 않음) | #14 |
| 차량 | `vehicles` | #16 |
| 요원 | `staff`, `staff_social_accounts`, `staff_refresh_tokens`, `staff_login_codes`, `staff_consents` | #9, [#56](https://github.com/justgo-valet/makkigo/pull/56) |
| 슈퍼 어드민 | `admins`(아이디 · 비밀번호 해시 · 실패 횟수 · 잠금 · 비활성), `admin_refresh_tokens` | `20261119090000_super_admin_console` |
| 업체 관리자 | `merchant_admins`(위 칸 + `merchant_id?` · `password_change_required`), `merchant_admin_refresh_tokens` | `20261119090000_super_admin_console` |
| 부스 | `booths`, `booth_photos`, `booth_agents`, `booth_fee_policies`, `booth_bank_accounts` | #9 |
| 업체 · 티켓 | `merchants`(우편번호 · 좌표 · 카카오 장소 ID · 전화번호 · 공공데이터 상가업소번호 · 업종 · 수집 대상 포함), `merchant_photos`, `booth_merchants`, `tickets`, `ticket_versions` | #9, [#96](https://github.com/justgo-valet/makkigo/pull/96), [#132](https://github.com/justgo-valet/makkigo/pull/132), `20261119120000_merchant_import` |
| 업체 수집 | `merchant_import_targets`(시군구 코드 · 이름, 업종 코드 · 이름 목록, 마지막 수집 시각 · 결과 요약 JSON) | `20261119120000_merchant_import` |
| 계정 요청 | `merchant_account_requests`(찾은 업체 `merchant_id?` 또는 새 업체 이름 · 주소, 요청한 분 이름 · 연락처, 상태 대기/발급 완료/거절, 발급한 계정 `merchant_admin_id?`, 처리 시각) | `20261120090000_merchant_account_requests` |
| 티켓 이미지 업로드 | `ticket_image_uploads` (예약 · 완료, 올린 업체 관리자) | |
| 발렛 | `valet_sessions` | #9 |
| 알림 | `push_devices`, `notifications` | #9 |
| 위치 | `location_use_logs` (위치정보 이용 사실 확인자료) | [#96](https://github.com/justgo-valet/makkigo/pull/96) |


## 관계

```
users ─┬─ user_social_accounts
       ├─ user_refresh_tokens · user_login_codes
       ├─ user_consents
       ├─ push_devices · notifications · location_use_logs
       └─ vehicles ── car_brands / car_models

staff ─┬─ staff_social_accounts · staff_refresh_tokens · staff_login_codes · staff_consents · push_devices · notifications
       └─ booth_agents ── booths ─┬─ booth_photos · booth_fee_policies · booth_bank_accounts
         (부스 생성자 = 관리자)     └─ booth_merchants ── merchants ─┬─ merchant_photos
                                                                  ├─ tickets ── ticket_versions
                                                                  ├─ ticket_image_uploads
                                                                  ├─ merchant_admins ── merchant_admin_refresh_tokens
                                                                  └─ merchant_import_targets? (수집해 온 업체만)

admins ── admin_refresh_tokens   (다른 테이블과 연결 없음)

valet_sessions ── (users?, vehicles?, merchants?, booths?, ticket_versions?, 처리 요원 staff ×3, location_use_logs, notifications)
```

## ERD 초안(version1.0)에서 바뀐 점과 이유

초안은 팀에서 테이블·관계 위주로 잡은 것입니다 (파일은 저장소 밖에 있음).

| 초안 | 지금 | 이유 |
|---|---|---|
| 발렛 이력: 실제 결제 금액 / 보여지는 금액 | **기준 요금 / 실제 요금** | 요원이 재량으로 최종 요금을 정함. 입금 확인이 없어 "결제 이후"를 알 수 없음 |
| 업체에 등록된 요원 | **부스 소속 요원** (`booth_agents`) | 요원은 부스에 등록됨 |
| 업체 관리자 / 요원 로그인 계정 | 요원은 `staff`, 업체 관리자는 `merchant_admins` (← 2026-11-19 변경, 이전엔 `staff` 하나 + 유형) | 업체 관리자는 아이디 · 비밀번호로 바뀌고 슈퍼 어드민이 계정을 만듦 → [decisions.md](../decisions.md) |
| (없음) | 부스 관리자 = 부스 생성자 | 별도 계정 유형이 아님 |
| 사용자 티켓 연관 테이블 | 세션에 **티켓 버전 FK** | 비회원도 티켓을 가져야 함 |
| 차량 → 고객 필수 | 세션에 **차량 번호 직접 저장**, 회원이면 FK | 비회원 차량은 행이 없음 |
| 상태: 주차 요청 · 주차 완료 · 출차 요청 · 출차 완료 | 6개 상태 | 출차 준비 중(응답 후), 취소 추가 → [valet-session.md](../planning/valet-session.md) |
| 알림 유형 테이블 | enum | |
| (없음) | 소셜 계정, 리프레시 토큰, 1회용 로그인 코드, 푸시 기기 | 소셜 로그인 · FCM |

## 모델 메모

- **요금 기준표 · 입금 계좌**(`booth_fee_policies`, `booth_bank_accounts`)는 덮어쓰지 않고 행을 쌓습니다. `effective_from` 이 지금 이전인 행 중 가장 최근 행이 현재 값입니다.
- **기준 요금** = `base_fee` (`base_minutes` 까지) + ceil((이용 시간 − `base_minutes`) ÷ `extra_unit_minutes`) × `extra_unit_fee`. 이용 시간 = 주차 완료 ~ 출차 요청 → [valet-session.md](../planning/valet-session.md#요금)
- **티켓 버전**(`ticket_versions`)은 수정할 때마다 새 행. 업체의 최신 티켓 = 그 업체 티켓 버전 중 `created_at` 이 가장 늦은 것
- **요원 근무 시간**(`booth_agents.work_start_time` · `work_end_time`)에 맞춰 알림을 켜고 끕니다 (`notifications_enabled`)
- **업체 관리의 등록일자**는 `APPROVED` 인 `booth_merchants.updated_at` 입니다 (따로 컬럼을 두지 않음). 이 표에서 바뀌는 컬럼이 `status` 뿐이라 `APPROVED` 행의 `updated_at` 이 마지막으로 수락한 시각입니다. `APPROVED` 행을 다시 쓰는 코드를 넣게 되면 그 전에 `approved_at` 컬럼을 만들어 `updated_at` 값을 옮깁니다
- **부스 · 업체 사진**은 사진 1장 = 행 1개 (`booth_photos`, `merchant_photos`). 한 장씩 추가 · 삭제 · 순서 변경(`sort_order`)하고, 행을 지울 때 S3 파일(`path`)도 함께 지웁니다. 업체 사진은 최대 5장 (서버에서 검사)
- **푸시 기기 · 알림**은 고객(`user_id`) 또는 staff(`staff_id`) 중 하나에만 속합니다 (서버에서 보장)
- **업체 좌표**(`merchants.latitude` · `longitude`): 예상 도착 시각 계산의 목적지. 비어 있으면 예상 시각은 미정
- **예상 도착 시각**(`valet_sessions.expected_arrival_at`): 도착 알림을 보낼 때 한 번 계산. 못 했으면 비움(도착 시간 미정) → [policies.md](../planning/policies.md#위치정보)
- **위치 이용 기록**(`location_use_logs`): 고객 위치를 쓸 때마다 누가 · 언제 · 무엇에(`purpose`) 썼는지만 남깁니다. **좌표는 어느 테이블에도 저장하지 않습니다.** 6개월이 지난 행과 동의 철회 · 탈퇴 회원의 행은 지웁니다 → [legal/README.md](../legal/README.md#위치정보)
- **알림 채널**(`notifications.channel`): 실제로 보낸 경로 `PUSH` / `ALIMTALK`. 보내지 않고 앱 알림 목록에만 남긴 경우는 비움 → [policies.md](../planning/policies.md#알림)

## 마이그레이션 `20261119090000_super_admin_console`

슈퍼 어드민 콘솔 · 업체 관리자 이전(decisions 2026-11-19). 데이터를 남기는 손으로 쓴 마이그레이션입니다.

- 소셜 로그인 업체 관리자(`staff.role = MERCHANT_ADMIN`)는 지우지 않고 **비활성화**: `role` 을 비우고 `deleted_at` 을 채우며(이미 있으면 그대로), 리프레시 토큰을 폐기합니다. 소셜 계정 · 푸시 기기 행은 남습니다. 그래서 같은 소셜 계정으로는 로그인도 새 요원 가입도 되지 않습니다.
- 업체 · 사진 · 티켓 · 부스 연결 · 발렛 이력은 그대로. `merchants.admin_id` 만 지우고, 슈퍼 어드민이 새 업체 관리자 계정을 만들어 다시 연결합니다.
- `ticket_image_uploads.staff_id` → `merchant_admin_id`(비워 둘 수 있음). 기존 행은 비어 있고, 티켓 저장 때 이미지 확인은 업체 기준이라 옛 이미지도 계속 씁니다.
- `merchant_registration_sessions` · `merchant_image_uploads` 와 그 enum 을 지웁니다. S3 에 남은 `merchants/staging/*` 는 수명 주기 규칙으로 지웁니다 → [infrastructure.md](../operations/infrastructure.md)
- `StaffRole` 에서 `MERCHANT_ADMIN` 을 뺍니다(PostgreSQL 은 enum 값을 못 지워 새 타입으로 바꿔 끼움). 위 비활성화가 먼저 돌아야 형 변환이 실패하지 않습니다.
- 되돌리면 옛 코드가 `merchants.admin_id` 를 찾으므로, 이 마이그레이션 전 이미지로는 되돌릴 수 없습니다.

## 업체 수집 칸 (`20261119120000_merchant_import`)

- `merchants.public_data_id`: 상가(상권)정보의 상가업소번호(`bizesId`), 유니크. 있으면 출처가 공공데이터, 없으면 수동 등록. 삭제 표시된 행도 값을 남깁니다. 어드민이 지운 행은 `import_target_id` 도 비워 **다시 가져오지 않고**, 수집이 지운 행(대상이 그대로)은 다시 나타나면 되살립니다
- `merchants.category`: 업종 이름(소분류 `indsSclsNm`). 수동 등록 업체는 비어 있음
- `merchants.import_target_id`: 이 업체를 처음 가져온 수집 대상. "이번 수집에 없는 업체 삭제" 를 그 대상 범위로만 하려고 둡니다. 대상을 지우거나 어드민이 업체를 지우면 비워지고(`SET NULL` · 삭제 API), 그 뒤로는 자동 삭제 · 되살림 대상이 아닙니다
- `merchant_import_targets.last_synced_at` 은 **성공한** 수집 시각. 실패하면 그대로 두고 `last_result` 에만 실패를 남깁니다. 수집은 화면에서 손으로만 돌립니다. 규칙 → [runbook.md](../operations/runbook.md#업체-수집)

## 계정 요청 (`20261120090000_merchant_account_requests`)

- 로그인 없이 티켓 웹에서 넣는 업체 관리자 계정 요청. 업체 이름 · 주소는 찾은 업체여도 요청 때 값을 복사해 둡니다(업체가 지워져도 무엇을 요청했는지 남게)
- `merchant_id` · `merchant_admin_id` 는 `SET NULL`. 연락처는 숫자만
- 이름 · 연락처는 개인정보라 **처리(발급 완료 · 거절)한 뒤 30일이 지나면 행을 지웁니다**. 따로 정리 작업 없이 어드민이 계정 요청 목록을 열 때 지움
- 대기 중인 요청이 걸린 업체는 업체 수집이 삭제 표시하지 않습니다

## 코드로 표현 못 하는 제약

- **같은 차량 번호로 진행 중인 세션은 하나만**: 부분 유니크 인덱스가 필요하지만 Prisma 스키마로 표현할 수 없어 서버 코드에서 검사합니다. 동시 요청을 막기 위해 세션을 만드는 트랜잭션은 **먼저 `lockPlateNumber(tx, 차량 번호)`** (`database` 패키지, PostgreSQL advisory lock) 를 걸고 진행 중 세션(`ACTIVE_VALET_SESSION_STATUSES`)을 확인합니다. 요원 앱의 차량 추가도 같은 함수를 써야 서로 막힙니다.
- 고객 소셜 계정과 staff 소셜 계정은 테이블을 나눴습니다. 요원도 다른 곳에선 고객이라 같은 소셜 계정으로 양쪽에 가입할 수 있어야 합니다.
