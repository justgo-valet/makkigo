# components

**여러 기능이 함께 쓰는 컴포넌트**입니다. 기능 하나에서만 쓰는 컴포넌트는 `features/<도메인>/components/` 에 둡니다.

| 폴더         | 넣는 것                                                                            |
| ------------ | ---------------------------------------------------------------------------------- |
| `layouts/`   | 화면 틀 (`Header` 등). 상태는 `stores/layout` 에서 읽습니다.                       |
| `providers/` | 앱 전체를 감싸는 Provider (`QueryProvider` 등). 루트 `app/layout.tsx` 에서 씁니다. |

버튼 · 입력 같은 기본 UI 는 여기가 아니라 공통 패키지 `@makkigo/ui` 에 있습니다.
