# 인수인계

이 프로젝트를 넘겨받는 개발자를 위한 시작점입니다.

## 처음 읽을 순서

1. [README.md](README.md) — 문서 목차
2. [planning/overview.md](planning/overview.md) — 서비스 · 용어
3. [decisions.md](decisions.md) — 지금까지 정한 것과 이유 (날짜순)
4. [architecture/deployment.md](architecture/deployment.md) — 서버 구성 · 배포 흐름
5. [operations/infrastructure.md](operations/infrastructure.md) · [operations/runbook.md](operations/runbook.md) — 자원 목록 · 운영 방법
6. [planning/open-questions.md](planning/open-questions.md) — 아직 남은 일

## 넘겨받아야 할 계정 · 권한

| 서비스 | 무엇 | 넘기는 방법 |
|---|---|---|
| **AWS** (계정 `659947636602`) | EC2 · IAM · SSM · S3 · CloudFront · Route 53 | 새 개발자용 IAM 사용자(또는 Identity Center) 발급. 루트 계정은 회사가 보관 |
| **GitHub** 조직 `justgo-valet` | 저장소 3개, Actions, GHCR | 조직 멤버로 초대 (관리자 권한은 필요한 만큼) |
| **가비아** | 도메인 `makkigo.com` 등록 · 갱신 (만료 2028-08-29) | 회사 계정 유지. DNS 는 Route 53 이라 가비아는 갱신만 |
| **애플 개발자** (팀 `8Z9ZNRXURC`) | 애플 로그인, App Store | 팀 멤버 초대 |
| **Google Cloud** | 구글 로그인 OAuth 클라이언트 | 프로젝트 IAM 에 추가 |
| **Google Play Console** | 안드로이드 출시 | 사용자 초대 |
| **카카오 개발자** | 카카오 로그인 앱 | 앱 팀원 초대 |
| **네이버 개발자** | 네이버 로그인 앱 | 앱 관리자 추가 |
| **Figma** | 디자인 파일 | 파일 공유 |
| **알림톡 대행사** | (미정) | 정해지면 추가 |

계정 소유자는 **회사(오로라 주식회사) 계정**이어야 합니다. 개인 계정에 묶인 것이 있으면 넘기기 전에 회사 계정으로 옮깁니다.

## 비밀값

비밀값은 **문서 · 저장소 · 채팅에 없습니다.**

| 무엇 | 어디에 |
|---|---|
| 운영 환경변수 (DB 비밀번호, JWT 키, 소셜 키 등) | AWS SSM Parameter Store `/makkigo/prod/` — AWS 권한을 받으면 볼 수 있음 |
| GitHub Actions 배포 값 | GitHub Secrets (`AWS_DEPLOY_ROLE_ARN`, `EC2_INSTANCE_ID`) |
| GHCR 토큰 | SSM `/makkigo/prod/deploy/GHCR_TOKEN` — **발급한 GitHub 계정에 묶여 있으므로** 인수 후 새 개발자 계정으로 다시 발급해 교체 |
| 애플 키 · 인증서, 스토어 서명 키 | 각 개발자 콘솔 (스토어 출시 때 정리) |

인수인계가 끝나면 넘겨준 사람의 권한을 회수하고, 넘겨준 사람이 알던 비밀값(DB 비밀번호, JWT 키, 토큰)은 **교체를 검토**합니다. JWT 키를 바꾸면 모든 사용자가 다시 로그인해야 합니다.

## 첫날 할 일

1. 저장소 받기 → `docker compose up -d`(로컬 DB) → `.env.example` · `apps/*/.env.example` 을 복사해 값 채우기 → `pnpm install` → `pnpm db:migrate:dev` → `pnpm dev`. 환경 메모는 [README.md](README.md#개발-환경-메모)
2. AWS 콘솔 접속 → [runbook.md](operations/runbook.md) 의 "서버 접속"으로 `docker ps` 확인
3. 작은 PR 하나로 `dev → main` 배포까지 흐름 확인

## 작업 규칙 (요약)

- 기능 PR → `dev` **Squash and merge**, `dev → main` 은 **merge commit**
- PR 제목 · 커밋은 Conventional Commits (`feat(users): ...`), CI 가 검사
- DB 구조 변경은 마이그레이션 파일을 같은 PR 에
- 정한 것은 [decisions.md](decisions.md) 에 날짜 · 이유와 함께 남김
