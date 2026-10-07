# 데이터베이스

- PostgreSQL 16 (docker compose) + Prisma 7
- 패키지: `packages/database` — 모델은 `prisma/models/*.prisma` 에 나눠 둡니다.
- 앱에서 쓰기: `import { prisma } from "database"` (#10)
- 스키마 반영은 **마이그레이션 파일**(`prisma migrate deploy`)로 합니다. 스키마를 바꾸는 PR 은 마이그레이션 파일을 함께 올리고, CI 가 빠뜨린 것을 잡습니다.

## 규칙

| 항목 | 규칙 |
|---|---|
| ID | 자동 증가 `Int` (차량 브랜드·모델과 통일) |
| 이름 | 필드 camelCase, 컬럼 `@map` snake_case, 테이블 복수형 snake_case |
| 들여쓰기 | 4칸 (`prisma format` 은 2칸으로 바꾸므로 주의) |
| 시각 | `timestamptz(3)` |
| 금액 | 원 단위 `Int` |
| 삭제 | 회원은 탈퇴 시각 기록 (soft delete) + 개인정보 30일 후 삭제 |
| 주석 | 코드에는 최소화, 설명은 PR 과 이 문서에 |
| 이미지 | 전체 주소가 아니라 **경로만** 저장 (`booth_photos.path`, `merchant_photos.path`, `logo_url`, `image_url`). 주소는 `NEXT_PUBLIC_IMAGE_BASE_URL` 과 조합 |

## 테이블

| 영역 | 테이블 | 어디에 |
|---|---|---|
| 차량 마스터 | `car_brands`, `car_models` | dev (#8) |
| 고객 인증 | `users`, `user_social_accounts`, `user_refresh_tokens` | #11 |
| 약관 | `user_consents` | #14 |
| 차량 | `vehicles` | #16 |
| 요원 · 업체 관리자 | `staff`, `staff_social_accounts` | #9 (요원 인증 작업 때 리프레시 토큰 등 추가) |
| 부스 | `booths`, `booth_photos`, `booth_agents`, `booth_fee_policies`, `booth_bank_accounts` | #9 |
| 업체 · 티켓 | `merchants`, `merchant_photos`, `booth_merchants`, `tickets`, `ticket_versions` | #9 |
| 발렛 | `valet_sessions` | #9 |
| 알림 | `push_devices`, `notifications` | #9 |


## 관계

```
users ─┬─ user_social_accounts
       ├─ user_refresh_tokens
       ├─ user_consents
       └─ vehicles ── car_brands / car_models

staff ── booth_agents ── booths ─┬─ booth_fee_policies
  │                              ├─ booth_bank_accounts
  │ (부스 생성자 = 관리자)        └─ booth_merchants ── merchants ── tickets ── ticket_versions
  └─ merchants (업체 관리자)

valet_sessions ── (users?, vehicles?, merchants?, booths?, ticket_versions?, 처리 요원 staff ×3)
```

## ERD 초안(version1.0)에서 바뀐 점과 이유

초안은 팀에서 테이블·관계 위주로 잡은 것입니다 (파일은 저장소 밖에 있음).

| 초안 | 지금 | 이유 |
|---|---|---|
| 발렛 이력: 실제 결제 금액 / 보여지는 금액 | **기준 요금 / 실제 요금** | 요원이 재량으로 최종 요금을 정함. 입금 확인이 없어 "결제 이후"를 알 수 없음 |
| 업체에 등록된 요원 | **부스 소속 요원** (`booth_agents`) | 요원은 부스에 등록됨 |
| 업체 관리자 / 요원 로그인 계정 | `staff` 하나 + 유형 | 같은 소셜 로그인, 로그인 후 유형 선택 |
| (없음) | 부스 관리자 = 부스 생성자 | 별도 계정 유형이 아님 |
| 사용자 티켓 연관 테이블 | 세션에 **티켓 버전 FK** | 비회원도 티켓을 가져야 함 |
| 차량 → 고객 필수 | 세션에 **차량 번호 직접 저장**, 회원이면 FK | 비회원 차량은 행이 없음 |
| 상태: 주차 요청 · 주차 완료 · 출차 요청 · 출차 완료 | 6개 상태 | 출차 준비 중(응답 후), 취소 추가 → [valet-session.md](../planning/valet-session.md) |
| 알림 유형 테이블 | enum | |
| (없음) | 소셜 계정, 리프레시 토큰, 푸시 기기 | Flutter 네이티브 로그인 · FCM |

## 모델 메모

- **요금 기준표 · 입금 계좌**(`booth_fee_policies`, `booth_bank_accounts`)는 덮어쓰지 않고 행을 쌓습니다. `effective_from` 이 가장 최근인 행이 현재 값입니다.
- **기준 요금** = `base_fee` (`base_minutes` 까지) + ceil((이용 시간 − `base_minutes`) ÷ `extra_unit_minutes`) × `extra_unit_fee`. 이용 시간 = 주차 완료 ~ 출차 요청 → [valet-session.md](../planning/valet-session.md#요금)
- **티켓 버전**(`ticket_versions`)은 수정할 때마다 새 행. 업체의 최신 티켓 = 그 업체 티켓 버전 중 `created_at` 이 가장 늦은 것
- **요원 근무 시간**(`booth_agents.work_start_time` · `work_end_time`)에 맞춰 알림을 켜고 끕니다 (`notifications_enabled`)
- **부스 · 업체 사진**은 사진 1장 = 행 1개 (`booth_photos`, `merchant_photos`). 한 장씩 추가 · 삭제 · 순서 변경(`sort_order`)하고, 행을 지울 때 S3 파일(`path`)도 함께 지웁니다. 업체 사진은 최대 5장 (서버에서 검사)
- **푸시 기기 · 알림**은 고객(`user_id`) 또는 staff(`staff_id`) 중 하나에만 속합니다 (서버에서 보장)
- **알림 채널**(`notifications.channel`): 실제로 보낸 경로 `PUSH` / `ALIMTALK`. 보내지 않고 앱 알림 목록에만 남긴 경우는 비움 → [policies.md](../planning/policies.md#알림)

## 코드로 표현 못 하는 제약

- **같은 차량 번호로 진행 중인 세션은 하나만**: 부분 유니크 인덱스가 필요하지만 Prisma 스키마로 표현할 수 없어 서버 코드에서 검사합니다.
- 고객 소셜 계정과 staff 소셜 계정은 테이블을 나눴습니다. 요원도 다른 곳에선 고객이라 같은 소셜 계정으로 양쪽에 가입할 수 있어야 합니다.
