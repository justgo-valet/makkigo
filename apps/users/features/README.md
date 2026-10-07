# features

**기능(도메인)별 브라우저 코드**입니다. 기능 하나를 고칠 때 이 폴더 하나만 보면 되도록 모읍니다.

```
features/<도메인>/
  components/   화면 조각
  hooks/        화면 로직 (상태, 폼, 요청 연결)
  apis/         서버 API 호출 (libs/common/api/apiClient 사용)
  schemas/      폼 검증 스키마 (react-hook-form + zod)
  *.ts          그 기능에서만 쓰는 설정 · 상수 · store
```

필요한 하위 폴더만 만듭니다. 파일이 한두 개면 하위 폴더 없이 바로 둡니다 (예: `consent/consentItems.ts`).

## 규칙

- **UI 파일(`app/**/page.tsx` · `layout.tsx` · `components/`)은 그리기만 합니다.** 상태 계산 · 분기 · 오류 코드 처리 같은 로직은 `hooks/` 로, API 요청은 `apis/` 함수를 훅 안에서 부릅니다. 컴포넌트는 훅이 돌려준 값과 핸들러만 씁니다.
- 다른 기능 폴더의 코드를 가져다 써도 됩니다 (예: `onboarding` 이 `consent/components/ConsentSheet` 사용). 세 곳 이상에서 쓰이면 공용 폴더(`components/` · `hooks/`)로 올립니다.
- `server/` 를 가져오지 않습니다. 서버 데이터는 `apis/` 로 HTTP 요청해서 받습니다.
- 서버 응답을 다루는 상태는 TanStack Query(`useQuery` · `useMutation`)로 관리합니다. `isSubmitting` · `errorMessage` 를 `useState` 로 직접 만들지 않습니다.
- 요청 · 응답 형식은 `libs/<도메인>/contracts` 를 씁니다. `schemas/` 는 화면 입력 검증용이고, 가능하면 contracts 검증을 재사용합니다.
- 컴포넌트만 `export default`, 나머지는 이름 붙인 export.
