# server

**서버에서만 실행되는 로직**입니다. URL 이 없는 평범한 함수이고, `app/api/` 의 `route.ts` 가 불러 씁니다.

## 넣는 것

- DB 읽기 · 쓰기 (`prisma`)
- 쿠키 · 토큰 처리 (`auth/`)
- 여러 테이블을 묶는 업무 규칙 (예: `onboarding/completeUserOnboarding` 의 트랜잭션 · 중복 처리)

## 규칙

- 모든 파일 첫 줄에 `import "server-only";` — 화면 코드가 실수로 가져오면 빌드가 실패합니다.
- HTTP 를 모릅니다. `NextRequest` · `NextResponse` · 상태 코드 · 사용자 문구를 쓰지 않습니다.
  - 예외: `auth/` 는 쿠키를 다루므로 요청 · 응답 객체를 받습니다.
- 실패는 `throw` 대신 결과로 돌려줘도 됩니다: `{ ok: false, reason: "DUPLICATE_PHONE" }`. 문구는 `route.ts` 가 붙입니다.
- 폴더는 도메인 이름(`auth`, `car`, `consent`, `onboarding`, `user`)으로 나누고, 함수 이름은 클라이언트 API 호출 함수와 겹치지 않게 짓습니다 (`recordConsents` ↔ `recordUserConsents`).

## app/api 와의 차이

|             | `app/api/`                     | `server/`                |
| ----------- | ------------------------------ | ------------------------ |
| 정체        | URL 이 있는 입구               | URL 이 없는 함수         |
| 아는 것     | 요청 · 쿠키 · 상태 코드 · 문구 | 사용자 ID · 데이터 · DB  |
| 바뀌는 이유 | API 경로 · 응답 형식 변경      | 업무 규칙 · DB 구조 변경 |

같은 함수를 여러 라우트가 쓰고(`auth/getCurrentUserId`), 나중에 서버 컴포넌트에서도 HTTP 없이 바로 부를 수 있도록 나눠 둡니다.
