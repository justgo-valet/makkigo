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

## 빌드 · 서명

- Android 운영 서명: `apps/users/android/key.properties` 가 있으면 그 키로, 없으면 디버그 키로 서명합니다. 키 파일(`*.jks`)과 `key.properties` 는 커밋하지 않습니다.
- Play Console 은 **개인 계정**이라 앱마다 **테스터 12명 이상 · 14일 비공개 테스트** 후에 프로덕션 액세스를 신청할 수 있습니다. 10/31 출시를 맞추려면 10/7 까지 비공개 테스트를 시작해야 합니다.

실행 · 빌드 명령은 makkigo-mobile 의 [apps/users/README.md](https://github.com/justgo-valet/makkigo-mobile/blob/dev/apps/users/README.md).
