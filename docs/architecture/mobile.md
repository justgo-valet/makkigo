# 모바일 앱 (Flutter)

웹(Next.js)을 Flutter 웹뷰로 감싼 앱입니다. 소셜 로그인은 Next.js 서버가 OAuth 로 처리하고, 앱은 로그인 페이지를 시스템 브라우저 창으로 열어 주기만 합니다. 푸시는 Flutter 네이티브가 맡습니다. → [auth.md](auth.md)

## 앱

저장소: **[makkigo-mobile](https://github.com/justgo-valet/makkigo-mobile)** (Flutter pub workspace)

| 앱 | 폴더 | 앱 ID (iOS 번들 ID = Android 패키지명) | 이름 | 담당 |
|---|---|---|---|---|
| 고객 앱 | `apps/users` | `com.makkigo.user` | 마끼고 | 태균 |
| 요원 · 업체 관리자 앱 | `apps/valetagents` | `com.makkigo.valetagent` | 마끼고 요원 | 지상님 |

두 앱이 같은 로그인 창 열기 · 웹뷰 브리지 · 푸시 토큰 코드를 쓰므로 `packages/` 에 공통으로 둡니다.

앱 ID 는 스토어에 올린 뒤 바꿀 수 없습니다. 로그인 후 앱으로 돌아오는 주소도 이 ID 를 씁니다 (`com.makkigo.user://auth`).

웹과 **다른 저장소**에 둡니다. 스토어 버전 · 빌드 · CI 가 서버(release-please 서버 버전 하나)와 섞이지 않게 하기 위해서입니다. 대신 웹 ↔ 앱 사이 규칙(브리지 메시지, 로그인 전달)은 이 문서에 적고, 바꿀 때는 두 저장소 PR 을 서로 링크합니다.

## 웹뷰 규칙

| 항목 | 규칙 |
|---|---|
| 여는 주소 | 빌드 때 `--dart-define=WEB_BASE_URL=...` (기본값 `http://localhost:3000`) |
| 같은 호스트 · 포트 | 웹뷰 안에서 이동 |
| 다른 호스트, `tel:` 등 | 외부 브라우저 · 앱으로 열기 |
| 뒤로 가기 (Android) | 웹 기록이 있으면 웹 뒤로, 없으면 앱 종료 |
| 화면 방향 | 세로 고정 |
| 안전영역 | 고객 · 요원 앱 같음. 웹뷰가 상태바 · 홈 인디케이터 뒤까지 채움(edge-to-edge). 상태바 · 내비게이션 바는 투명하고 반투명 막(scrim · 글라스)도 없어 웹 화면 색이 그대로 비침. 위아래 여백은 웹이 CSS 변수 `--safe-area-inset-top/bottom/left/right` 로 둠 — `env(safe-area-inset-*)` 를 직접 쓰지 않음(Android 웹뷰는 기기마다 0 이거나 앱 여백과 겹침) → [브리지](#웹--앱-브리지) |
| 키보드 | 입력창이 있는 바텀 시트는 키보드 위로 올라옴. iOS 는 웹이 `visualViewport` 로 가려진 높이를 재서 공통 `Sheet` 를 띄우고(`useKeyboardInset`), Android 는 고객 앱 viewport 의 `interactiveWidget: resizes-content` 로 레이아웃이 키보드만큼 줄어듦 (Chrome · WebView 108+). 앱은 Android 에서만 웹뷰를 키보드만큼 줄임(iOS 까지 줄이면 웹이 키보드 높이를 두 번 빼 시트가 두 배로 올라감). 키보드로 올라간 시트는 상태바 아래까지만 커짐. **입력창 글자는 16px 이상**(`text-base`) — 더 작으면 iOS 가 포커스 때 화면을 확대함 |
| 지원 기기 | iOS 는 **iPhone 만** (iPad 스크린샷 · 심사 부담 없음) |
| HTTP | 운영은 HTTPS 만. 개발용 HTTP 는 Android 디버그 빌드와 iOS 로컬 네트워크만 허용 |

## 웹 ↔ 앱 브리지

웹뷰에 `MakkigoApp` JavaScript 채널이 있습니다. 웹은 `window.MakkigoApp` 이 있으면 앱 안이라고 판단합니다.

| 방향 | 메시지 | 앱이 하는 일 |
|---|---|---|
| 웹 → 앱 | `{"type":"nativeLogin","provider":"kakao"\|"google"\|"apple"}` | 각 사 SDK 로 로그인하고 `window` 에 `makkigo:native-login` 이벤트로 돌려줌 (`detail: { provider, status: "success"\|"cancelled"\|"failed", accessToken?, idToken?, authorizationCode? }`). 카카오는 카카오톡이 있으면 카카오톡, 없으면 카카오계정 · 구글은 계정 선택 · 애플은 iOS 시트. 웹은 받은 값을 `POST /api/v1/auth/oauth/{provider}/native` 로 보냄. 시간 제한 없음(다른 앱에 다녀옴) → [auth.md](auth.md#흐름) |
| 웹 → 앱 | `{"type":"openAuthSession","url":"…","returnUrl":"…"}` (둘 다 절대 주소, **예전 로그인 방식 — 고객 웹은 지금 안 씀**) | ① `url` 이 웹뷰와 같은 출처인지 확인 ② `url` 을 시스템 브라우저 창으로 열고 `com.makkigo.user://` 복귀를 기다림 ③ 복귀 주소의 쿼리(`code` 또는 `error`)를 `returnUrl` 에 그대로 붙여 웹뷰에서 엶. 사용자가 창을 닫으면 `error=cancelled`, 그 밖의 실패는 `error=failed` 를 붙임 → [auth.md](auth.md#흐름) |
| 웹 → 앱 | `{"type":"requestPushToken"}` | 알림 권한을 묻고 FCM 토큰을 받아 `window` 에 `makkigo:push-token` 이벤트로 돌려줌 (`detail: { token, platform, permission }`, 권한 거부면 `token: null` · `permission: "denied"`). 토큰이 바뀌면 같은 이벤트를 다시 보냄. 한 번 요청받은 뒤로는 앱이 **다시 화면에 나올 때마다** 권한 창 없이 현재 권한으로 같은 이벤트를 보냄 → [푸시](#푸시) |
| 웹 → 앱 | `{"type":"requestLocation"}` | 위치 권한을 묻고 현재 위치를 한 번 받아(최대 10초) `window` 에 `makkigo:location` 이벤트로 돌려줌 (`detail: { latitude, longitude, permission }`, 권한 거부면 좌표 `null` · `"denied"`, 위치를 못 받으면 좌표 `null` · `"granted"`). 위치기반서비스 동의 회원이 도착 알림을 보낼 때만 보내고, 웹은 15초 안에 이벤트가 없으면 위치 없이 보냄 (mobile #7) → [policies.md](../planning/policies.md#위치정보) |
| 웹 → 앱 | `{"type":"setStatusBarStyle","style":"light"\|"dark"}` | 상태바 글자색을 바꿈 (`light` 흰 글자 · `dark` 검은 글자). 페이지를 새로 열면 `dark` 로 되돌리므로 어두운 화면(고객 · 요원 로그인)이 켜질 때 `light`, 벗어날 때 `dark` 를 보냄 (mobile #9) |
| 앱 → 웹 | CSS 변수 `--safe-area-inset-top/bottom/left/right` | 페이지가 뜰 때와 화면 크기 · 키보드가 바뀔 때 `document.documentElement` 인라인 스타일에 px 로 넣음. 아래 여백은 키보드 높이만큼 줄인 값(키보드가 떠 있으면 보통 0 — 내비게이션 바 · 홈 인디케이터가 키보드에 가려짐). 브라우저에서는 `env(safe-area-inset-*)` 값이 되도록 `@makkigo/ui` 전역 CSS 에 기본값이 있음. Android 웹뷰의 `env()` 는 믿을 수 없어 앱이 넣어 준다 |
| 웹 → 앱 | `{"type":"openNotificationSettings"}` | 이 앱의 OS 알림 설정 화면을 엶 (`app_settings`). 켜고 돌아오면 토큰 이벤트가 다시 옴 |
| 웹 → 앱 | `{"type":"queryInstalledApps","schemes":["supertoss","kakaobank",…]}` | 스킴마다 열 수 있는지 확인해 `window` 에 `makkigo:installed-apps` 이벤트로 돌려줌 (`detail: { schemes }`, 열 수 있는 스킴만). 출차 화면 **입금하기**가 설치된 은행 앱만 보여줄 때 씀. 은행 목록 · 스킴 · 송금 주소는 웹 `features/valet/bankApps.ts` 가 정하고, 은행 앱은 웹이 스킴 주소(`supertoss://send?…`)로 이동하면 앱이 외부 앱으로 엶. 앱은 물어볼 스킴을 Android `<queries>` · iOS `LSApplicationQueriesSchemes` 에 미리 등록해야 하므로 **스킴을 더하면 앱 PR 도 함께** 낸다 (웹은 5초 안에 이벤트가 없으면 빈 목록으로 봄) |
| 웹 → 앱 | `{"type":"setAuthenticated","authenticated":true|false}` | 보호·온보딩 경계는 `true`, 로그인 화면은 `false`를 보냄. 앱은 알림 목적지를 인증 완료 전까지 보관하고 `true` 뒤에만 안전한 웹 경로를 엶 |

**앱은 주소를 만들지 않습니다.** API 경로 · 로그인 뒤 이동 · 회원 규칙은 웹이 정합니다. 앱 업데이트는 이 표의 메시지 형식, 복귀 스킴, **소셜 로그인 SDK · 설정값**(제공자 추가 포함)을 바꿀 때 필요합니다 (decisions 2026-10-19).

메시지를 추가 · 변경할 때는 makkigo 와 makkigo-mobile PR 을 서로 링크합니다.

## 푸시

Firebase 프로젝트 **`makkigo-3d555`** 하나에 고객 앱 · 요원 앱을 각각 앱으로 등록합니다 (애널리틱스 끔). iOS 는 Firebase 콘솔에 APNs 인증 키(.p8, 팀 단위라 두 앱 공용)를 올려 둡니다.

| 단계 | 하는 곳 |
|---|---|
| 회원이 로그인해 메인 영역에 들어오면 웹이 `requestPushToken` 을 보냄 → 그때 OS 알림 권한 팝업 | 웹 `useAppPushRegistration` (`MemberGate`) |
| 앱이 다시 화면에 나오면(홈 · 설정 앱에서 복귀) 현재 권한을 확인해 토큰 이벤트를 다시 보냄. `token: null`(설정에서 알림 끔)이면 웹이 이 기기 등록을 지움 → 다음 알림부터 알림톡 대상 | 앱 `didChangeAppLifecycleState`, 웹 `useAppPushRegistration` |
| `permission: "denied"` 면 메인 · 마이페이지 상단에 **"알림이 꺼져 있어요 [설정 열기]"** 배너. 켜고 돌아오면 사라짐. iOS APNs 실패(`token: null` · `granted`)엔 안 띄움 | 웹 `PushPermissionBanner` (`usePushPermission` 상태) |
| 받은 토큰을 `POST /api/v1/push-devices` 로 등록, 로그아웃 때 `DELETE` | 웹 (등록한 토큰은 기기 `localStorage` 에 기억) |
| 발송: 기기 토큰으로 FCM 발송 → 없는 토큰 삭제 → 알림 내역(`notifications`) 기록 | 서버 `@makkigo/push` 의 `sendUserNotification` |
| 알림 데이터 `link`(웹 경로)를 누르면 그 화면을 웹뷰로 엶 | 앱 |

요원 앱은 승인 완료된 `VALET_AGENT`에게만 최초 권한을 요청합니다. 업체 관리자와 승인 대기 사용자는 요청하지 않습니다. OS 권한과 부스의 업무 알림 설정은 독립적이며, 서버의 기존 `APPROVED + notificationsEnabled` 발송 정책을 유지합니다.

요원 기기 등록은 앱 설치가 생성한 32바이트 난수의 해시로 한 행에 고정됩니다. 서버는 원문 설치 비밀값을 저장하지 않습니다. 토큰 회전·응답 유실 재시도·계정 전환은 같은 설치 행을 갱신하고, 로그아웃과 세션 만료 정리는 설치 비밀값 또는 서명된 HttpOnly 기기 권한으로만 수행합니다. 원시 FCM 토큰은 정리 권한으로 사용하지 않습니다.

요원 업무 알림은 `link: "/"`를 포함합니다. 링크 없는 이전 알림도 앱에서 `/`로 처리하며 외부 origin과 위험 스킴은 앱 탐색 정책에서 거부합니다.

- 푸시를 못 보내면(미동의 · 기기 없음 · 발송 실패) 알림 내역의 채널을 비워 둡니다. 알림톡 대체는 알림톡 연동 때 이 자리에서 보냅니다.
- Android 알림 채널: `makkigo_default` (중요도 높음).
- 로컬 테스트 발송: `node --env-file=apps/users/.env.development.local packages/push/scripts/send-test.mjs <토큰> [경로]`

## 빌드 · 서명

- Android 운영 서명: `apps/users/android/key.properties` 가 있으면 그 키로, 없으면 디버그 키로 서명합니다. 키 파일(`*.jks`)과 `key.properties` 는 커밋하지 않습니다.
- Play Console 은 **개인 계정**이라 앱마다 **테스터 12명 이상 · 14일 비공개 테스트** 후에 프로덕션 액세스를 신청할 수 있습니다. 10/31 출시를 맞추려면 10/7 까지 비공개 테스트를 시작해야 했습니다. 시작 여부와 출시일 영향은 [open-questions.md](../planning/open-questions.md#개발) 에서 추적합니다.

실행 · 빌드 명령은 makkigo-mobile 의 [apps/users/README.md](https://github.com/justgo-valet/makkigo-mobile/blob/dev/apps/users/README.md).
