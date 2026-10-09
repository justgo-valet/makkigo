# 고객 앱 (`apps/users`)

Next.js 앱 하나에 화면(브라우저)과 API(서버)가 함께 있습니다. 폴더는 **코드가 어디서 실행되는가**로 나눕니다.

## 폴더

| 폴더                                  | 실행 위치 | 역할                                         |
| ------------------------------------- | --------- | -------------------------------------------- |
| [`app/`](app/README.md)               | 둘 다     | 라우트. 화면 페이지와 API 입구(`app/api/`)   |
| [`app/api/`](app/api/README.md)       | 서버      | HTTP 입구. 요청 확인 · 상태 코드 · 오류 문구 |
| [`server/`](server/README.md)         | 서버      | 서버 전용 로직. DB · 쿠키 · 토큰             |
| [`features/`](features/README.md)     | 브라우저  | 기능별 화면 · 훅 · API 호출 · 폼 스키마      |
| [`components/`](components/README.md) | 브라우저  | 여러 기능이 함께 쓰는 컴포넌트               |
| [`hooks/`](hooks/README.md)           | 브라우저  | 여러 기능이 함께 쓰는 훅                     |
| [`stores/`](stores/README.md)         | 브라우저  | 여러 기능이 함께 쓰는 전역 상태(zustand)     |
| [`libs/`](libs/README.md)             | 둘 다     | 요청 · 응답 형식(contracts)과 공통 도구      |

## 요청 하나가 거치는 길

```
[브라우저]
features/<도메인>/components   화면
  └ features/<도메인>/apis      HTTP 요청 (libs/common/api/apiClient)
        │  /api/v1/...
        ▼
[서버]
app/api/v1/.../route.ts        입구: 로그인 · 요청 형식 확인, 응답
  └ server/<도메인>/            실제 일: DB 읽기 · 쓰기
        └ prisma (packages/database)

요청 · 응답 형식은 양쪽 모두 libs/<도메인>/contracts 를 씁니다.
```

## 어디에 둘지 헷갈릴 때

1. DB · 쿠키 · 비밀 값을 만지나? → `server/`
2. URL 로 열려야 하나? → 화면은 `app/<경로>/page.tsx`, API 는 `app/api/v1/<경로>/route.ts`
3. 서버와 브라우저가 같은 형식을 알아야 하나? → `libs/<도메인>/contracts/`
4. 기능 하나에서만 쓰나? → `features/<도메인>/`
5. 여러 기능이 쓰나? → `components/` · `hooks/` · `stores/` · `libs/common/`

API 규칙(경로 버전, 오류 응답 형식, PR 단위)은 [docs/architecture/api.md](../../docs/architecture/api.md).
