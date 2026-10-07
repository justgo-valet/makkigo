# app

Next.js App Router 폴더입니다. **폴더 경로가 곧 URL** 입니다.

| 파일                           | URL                                                 |
| ------------------------------ | --------------------------------------------------- |
| `app/page.tsx`                 | `/`                                                 |
| `app/onboarding/page.tsx`      | `/onboarding`                                       |
| `app/api/v1/consents/route.ts` | `/api/v1/consents` → [api/README.md](api/README.md) |

## 넣는 것

- `page.tsx`, `layout.tsx`: 화면 진입점. `features/` 의 컴포넌트 · 훅을 조립만 합니다.
- `api/**/route.ts`: API 입구.
- `globals.css`, 루트 `layout.tsx`(폰트 · Provider · 공통 Header).

## 넣지 않는 것

- 화면 조각, 훅, API 호출 함수 → `features/<도메인>/`
- DB 로직 → `server/`

페이지 파일은 짧게 유지합니다. 길어지면 `features/<도메인>/components/` 로 옮깁니다.
