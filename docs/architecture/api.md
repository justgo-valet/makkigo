# API

## 규칙

- 경로에 버전: `/api/v1/...` (Flutter 앱은 업데이트 안 한 옛 버전이 남으므로). 기존 `/api/car/get-car-models` 는 버전 없음 → 통일 여부 미정
- 오류 응답: `{ "message": "사용자에게 보여줄 문장" }` + 상태 코드
- 요청·응답 스키마(zod): `apps/<앱>/libs/<도메인>/contracts/`
- 서버 로직: `apps/<앱>/server/<도메인>/`, 공통 인증: `packages/auth`
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
| `GET /api/car/get-car-models?brand=` | 브랜드별 차량 모델 (아직 빈 배열) | | dev (#5) |
| `POST /api/v1/auth/social/{kakao\|google\|apple\|naver}` | 소셜 로그인 · 가입 | | [#11](https://github.com/justgo-valet/makkigo/pull/11) → [#23](https://github.com/justgo-valet/makkigo/pull/23) |
| `POST /api/v1/auth/refresh` | 토큰 재발급 (리프레시 토큰 교체) | 리프레시 쿠키 | [#12](https://github.com/justgo-valet/makkigo/pull/12) → [#24](https://github.com/justgo-valet/makkigo/pull/24) |
| `POST /api/v1/auth/logout` | 이 기기 로그아웃 | | [#13](https://github.com/justgo-valet/makkigo/pull/13) |
| `POST /api/v1/consents` | 약관 동의 기록 | ✅ | [#14](https://github.com/justgo-valet/makkigo/pull/14) |
| `DELETE /api/v1/users/me` | 회원 탈퇴 | ✅ | [#15](https://github.com/justgo-valet/makkigo/pull/15) |
| `POST /api/v1/onboarding` | 휴대폰 번호 · 차량 저장 | ✅ | [#16](https://github.com/justgo-valet/makkigo/pull/16) |

상태 코드, 요청 예시, 확인 결과는 각 PR 본문에 있습니다.

## 기반 PR

| PR | 내용 |
|---|---|
| [#9](https://github.com/justgo-valet/makkigo/pull/9) | 발렛 도메인 Prisma 모델 (체인 머지 후 정리 예정) |
| [#10](https://github.com/justgo-valet/makkigo/pull/10) | `database` 패키지 Prisma 클라이언트 export, Postgres adapter |

고객 인증 · 온보딩 API 와 기반 PR 은 모두 dev 에 머지됐습니다 (2026-10-04). #11 · #12 는 쌓인 상태에서 앞 브랜치로 머지되어, 같은 내용을 [#23](https://github.com/justgo-valet/makkigo/pull/23) · [#24](https://github.com/justgo-valet/makkigo/pull/24) 로 dev 에 다시 머지했습니다. 남은 것: #9 정리.

## 예정

- 내 정보 (온보딩 완료 여부)
- 마이페이지: 동의 상태 조회, 휴대폰·차량 번호 수정
- 탈퇴 회원 개인정보 삭제 배치
- 요원 쪽 인증 (로그인 후 유형 선택)
