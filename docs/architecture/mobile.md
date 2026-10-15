# 모바일 앱 (Flutter)

웹(Next.js)을 Flutter 웹뷰로 감싼 앱입니다. 소셜 로그인은 Next.js 서버가 OAuth 로 처리하고, 앱은 로그인 페이지를 시스템 브라우저 창으로 열어 주기만 합니다. 푸시는 Flutter 네이티브가 맡습니다. → [auth.md](auth.md)

## 앱

저장소: **[makkigo-mobile](https://github.com/justgo-valet/makkigo-mobile)** (Flutter pub workspace)

| 앱 | 폴더 | 앱 ID (iOS 번들 ID = Android 패키지명) | 이름 | 담당 |
|---|---|---|---|---|
| 고객 앱 | `apps/users` | `com.makkigo.user` | 마끼고 | 태균 |
| 요원 · 업체 관리자 앱 | `apps/valetagents` (예정) | 미정 | 미정 | 지상님 |

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
| 지원 기기 | iOS 는 **iPhone 만** (iPad 스크린샷 · 심사 부담 없음) |
| HTTP | 운영은 HTTPS 만. 개발용 HTTP 는 Android 디버그 빌드와 iOS 로컬 네트워크만 허용 |

## 웹 ↔ 앱 브리지

웹뷰에 `MakkigoApp` JavaScript 채널이 있습니다. 웹은 `window.MakkigoApp` 이 있으면 앱 안이라고 판단합니다.

| 방향 | 메시지 | 앱이 하는 일 |
|---|---|---|
| 웹 → 앱 | `{"type":"openAuthSession","url":"…","returnUrl":"…"}` (둘 다 절대 주소) | ① `url` 이 웹뷰와 같은 출처인지 확인 ② `url` 을 시스템 브라우저 창으로 열고 `com.makkigo.user://` 복귀를 기다림 ③ 복귀 주소의 쿼리(`code` 또는 `error`)를 `returnUrl` 에 그대로 붙여 웹뷰에서 엶. 사용자가 창을 닫으면 `error=cancelled`, 그 밖의 실패는 `error=failed` 를 붙임 → [auth.md](auth.md#흐름) |

| 웹 → 앱 | `{"type":"requestPushToken"}` | 알림 권한을 묻고 FCM 토큰을 받아 `window` 에 `makkigo:push-token` 이벤트로 돌려줌 (`detail: { token, platform, permission }`, 권한 거부면 `token: null` · `permission: "denied"`). 토큰이 바뀌면 같은 이벤트를 다시 보냄. 한 번 요청받은 뒤로는 앱이 **다시 화면에 나올 때마다** 권한 창 없이 현재 권한으로 같은 이벤트를 보냄 → [푸시](#푸시) |
| 웹 → 앱 | `{"type":"requestLocation"}` | 위치 권한을 묻고 현재 위치를 한 번 받아(최대 10초) `window` 에 `makkigo:location` 이벤트로 돌려줌 (`detail: { latitude, longitude, permission }`, 권한 거부면 좌표 `null` · `"denied"`, 위치를 못 받으면 좌표 `null` · `"granted"`). 위치기반서비스 동의 회원이 도착 알림을 보낼 때만 보내고, 웹은 15초 안에 이벤트가 없으면 위치 없이 보냄 (mobile #7) → [policies.md](../planning/policies.md#위치정보) |
| 웹 → 앱 | `{"type":"openNotificationSettings"}` | 이 앱의 OS 알림 설정 화면을 엶 (`app_settings`). 켜고 돌아오면 토큰 이벤트가 다시 옴 |

**앱은 주소를 만들지 않습니다.** 제공자 · API 경로 · 로그인 규칙은 모두 웹이 정해 메시지로 넘깁니다. 그래서 로그인 · 회원가입 변경은 서버 배포만으로 끝나고, 앱 업데이트는 이 표의 메시지 형식이나 복귀 스킴을 바꿀 때만 필요합니다.

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

- 푸시를 못 보내면(미동의 · 기기 없음 · 발송 실패) 알림 내역의 채널을 비워 둡니다. 알림톡 대체는 알림톡 연동 때 이 자리에서 보냅니다.
- Android 알림 채널: `makkigo_default` (중요도 높음).
- 로컬 테스트 발송: `node --env-file=apps/users/.env.development.local packages/push/scripts/send-test.mjs <토큰> [경로]`

## 빌드 · 서명

- Android 운영 서명: `apps/users/android/key.properties` 가 있으면 그 키로, 없으면 디버그 키로 서명합니다. 키 파일(`*.jks`)과 `key.properties` 는 커밋하지 않습니다.
- Play Console 은 **개인 계정**이라 앱마다 **테스터 12명 이상 · 14일 비공개 테스트** 후에 프로덕션 액세스를 신청할 수 있습니다. 10/31 출시를 맞추려면 10/7 까지 비공개 테스트를 시작해야 합니다.

실행 · 빌드 명령은 makkigo-mobile 의 [apps/users/README.md](https://github.com/justgo-valet/makkigo-mobile/blob/dev/apps/users/README.md).
