# hooks

**특정 기능에 묶이지 않는 훅**입니다 (예: `useStaggeredReveal` — 스크롤 등장 애니메이션).

기능 로직을 담은 훅(`useOnboarding`, `useConsent` 등)은 `features/<도메인>/hooks/` 에 둡니다. 기준은 "다른 기능에 그대로 가져가도 의미가 있는가"입니다.

이름 붙인 export 를 씁니다: `export { useStaggeredReveal };`
