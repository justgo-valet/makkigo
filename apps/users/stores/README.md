# stores

**여러 기능이 함께 쓰는 전역 상태**(zustand)입니다. 예: `layout` — 페이지가 Header 모양을 정하고 `components/layouts/Header` 가 읽습니다.

## 넣지 않는 것

- 기능 하나에서만 쓰는 상태 → `features/<도메인>/<이름>.store.ts` (예: `onboarding/onboardingTransition.store.ts`)
- 서버에서 받아온 데이터 → TanStack Query 가 관리합니다. store 에 복사하지 않습니다.
- 폼 입력 값 → react-hook-form

타입은 store 파일 안에 함께 둡니다.
