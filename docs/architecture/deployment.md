# 배포

## 구성

- AWS **EC2 1대**, 서울 리전(`ap-northeast-2`). **운영 서버만** 둡니다 (개발 서버 없음).
- 서버 CPU 는 **ARM(aarch64, Graviton)**, OS 는 Ubuntu 26.04. 그래서 이미지는 GitHub 의 **ARM 빌드 서버(`ubuntu-24.04-arm`)** 에서 `linux/arm64` 로 빌드합니다
- 같은 서버에 Docker 컨테이너로: 고객 앱(`apps/users`), 요원 앱(`apps/valetagents`), PostgreSQL. 직접 운영합니다.
- DB 스키마는 배포 때 `prisma migrate deploy` 로 반영합니다. → [database.md](database.md)
- 주소: 고객 앱 `app.makkigo.com`, 요원 앱 `valet.makkigo.com` (가비아 DNS A 레코드 → EC2 탄력적 IP). 루트 `makkigo.com` 은 비워 둠
- HTTPS: **Caddy** 가 Let's Encrypt 인증서를 자동 발급 · 갱신
- PostgreSQL 5432 는 호스트에도 열어 둠 (로컬에서 운영 DB 확인용). EC2 보안 그룹이 허용한 IP 만 접속 가능
- 서버에서 쓰는 파일은 `deploy/` 폴더: `docker-compose.prod.yml`, `Caddyfile`, `load-env.sh`, `deploy.sh`

## 환경변수 — SSM Parameter Store

운영 환경변수는 서버 파일이 아니라 **SSM Parameter Store** 에 둡니다. 값 변경 이력이 남고, 서버가 망가져도 값이 보존됩니다.

### 이름 규칙

```
/makkigo/<환경>/<대상>/<변수 이름>

/makkigo/prod/users/AUTH_JWT_SECRET
         │    │     └─ 컨테이너 안에서 쓰는 변수 이름 그대로
         │    └─ 앱 · 컨테이너 (users, valetagents, postgres) 또는 배포 도구용 (deploy)
         └─ 환경: prod (개발 서버를 만들면 dev)
```

경로로 나누는 이유:

| 이유 | 예 |
|---|---|
| 앱 하나의 변수를 **한 번에** 꺼냄. 변수를 추가해도 배포 스크립트를 고치지 않음 | `aws ssm get-parameters-by-path --path /makkigo/prod/users --with-decryption` |
| 권한을 **경로 단위**로 줌. 서버는 자기 경로 밖을 못 봄 | EC2 역할에 `/makkigo/prod/*` 읽기만 허용 |
| 같은 변수 이름을 앱 · 환경별로 구분 | `/makkigo/prod/users/AUTH_JWT_SECRET` ↔ `/makkigo/prod/valetagents/AUTH_JWT_SECRET` |

### 규칙

- 유형은 **SecureString**, 계층은 **표준**, KMS 키는 기본값(`alias/aws/ssm`)
- 리전은 EC2 와 같은 **서울**
- 값은 콘솔에만 입력합니다. 채팅 · 이슈 · 커밋에 붙이지 않습니다.
- `AUTH_JWT_SECRET` 은 환경 · 앱마다 **다른 값** (`openssl rand -base64 32`)

### 파라미터 목록

| 이름 | 값 |
|---|---|
| `/makkigo/prod/postgres/POSTGRES_USER` | DB 사용자 |
| `/makkigo/prod/postgres/POSTGRES_PASSWORD` | DB 비밀번호 (영문 · 숫자로 길게 — 특수문자는 `DATABASE_URL` 에서 깨짐) |
| `/makkigo/prod/postgres/POSTGRES_DB` | DB 이름 |
| `/makkigo/prod/users/DATABASE_URL` | `postgresql://<사용자>:<비밀번호>@postgres:5432/<DB이름>` — 호스트는 `localhost` 가 아니라 DB 컨테이너 이름 `postgres` |
| `/makkigo/prod/users/AUTH_JWT_SECRET` | |
| `/makkigo/prod/users/PUBLIC_URL` | `https://app.makkigo.com` |
| `/makkigo/prod/users/IMAGE_BASE_URL` | `https://d2lnojrmgxqgrc.cloudfront.net` (이미지 CDN, 비밀값 아님) |
| `/makkigo/prod/users/FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase 서비스 계정 키 JSON 을 **한 줄로** (`jq -c . <키 파일>.json`), SecureString. 앱 푸시 발송용 |
| `/makkigo/prod/users/KAKAO_MAP_APP_KEY` | 카카오맵 JavaScript 키 (업체 상세 지도). 요원 앱과 같은 키를 써도 됨. 카카오 콘솔에 `https://app.makkigo.com` 등록 필요. 없으면 지도 대신 안내 문구가 뜸 |
| `/makkigo/prod/users/USERS_INTERNAL_JOB_TOKEN` | 정기 작업 컨테이너(`users-jobs`)가 고객 앱 내부 API 를 부를 때 쓰는 임의 값 (`openssl rand -hex 32`, 32바이트 이상), SecureString. 없으면 정기 작업이 아무것도 하지 않음 |
| `/makkigo/prod/users/KAKAO_REST_API_KEY` | 소셜 로그인 값은 → [auth.md](auth.md#환경변수). 같은 키로 카카오모빌리티 길찾기 · 카카오 로컬(주소 검색)도 호출 |
| `/makkigo/prod/users/KAKAO_CLIENT_SECRET` | Client Secret 을 안 쓰면 만들지 않음 |
| `/makkigo/prod/users/GOOGLE_CLIENT_ID` | |
| `/makkigo/prod/users/GOOGLE_CLIENT_SECRET` | |
| `/makkigo/prod/users/APPLE_SERVICES_ID` | |
| `/makkigo/prod/users/NAVER_CLIENT_ID` | |
| `/makkigo/prod/users/NAVER_CLIENT_SECRET` | |
| `/makkigo/prod/valetagents/DATABASE_URL` · `AUTH_JWT_SECRET` · `PUBLIC_URL` | 요원 앱. `PUBLIC_URL` = `https://valet.makkigo.com` |
| `/makkigo/prod/valetagents/OAUTH_CALLBACK_ORIGIN` | 소셜 제공자 콜백 주소의 기준 URL |
| `/makkigo/prod/valetagents/APP_CALLBACK_URL` | Flutter 요원 앱 복귀 주소 (`com.makkigo.valetagent://auth`) |
| `/makkigo/prod/valetagents/AUTH_COOKIE_DOMAIN` | `.makkigo.com` (콜백 CSRF 쿠키를 두 서브도메인에 공유) |
| `/makkigo/prod/valetagents/` 소셜 7개 | 고객 앱과 같은 이름 (`KAKAO_REST_API_KEY` … `NAVER_CLIENT_SECRET`) |
| `/makkigo/prod/valetagents/KAKAO_MAP_APP_KEY` | 카카오맵 JavaScript 키 (부스 위치 지도). 브라우저에 보이는 값이지만 다른 값과 같이 런타임에 읽음. 카카오 콘솔에 `https://valet.makkigo.com` 등록 · 카카오맵 사용 설정 필요. 없으면 지도 대신 안내 문구가 뜸 |
| `/makkigo/prod/valetagents/AWS_REGION` | `ap-northeast-2` |
| `/makkigo/prod/valetagents/S3_IMAGE_BUCKET` | 비공개 이미지 버킷 이름 |
| `/makkigo/prod/valetagents/IMAGE_BASE_URL` | CloudFront 공개 기준 URL. 브라우저 빌드 변수가 아니라 서버 런타임 값 |
| `/makkigo/prod/valetagents/FIREBASE_SERVICE_ACCOUNT_JSON` | 고객 앱과 같은 값(한 줄 JSON, SecureString). 요원이 주차 처리 · 차량 추가를 하면 요원 앱 서버가 고객에게 주차 완료 푸시를 보냄. 없으면 알림 내역만 남고 푸시는 나가지 않음(요청은 성공) |
| `/makkigo/prod/valetagents/MERCHANT_UPLOAD_CLEANUP_TOKEN` | 내부 cleanup route 전용 256-bit 임의 값. SecureString |
| `/makkigo/prod/valetagents/MERCHANT_UPLOAD_CLEANUP_ENABLED` | 최초 및 rollback 시 `false`; 검증된 rollout에서만 `true` |
| `/makkigo/prod/valetagents/MERCHANT_UPLOAD_CLEANUP_ALERT_WEBHOOK_URL` | 승인된 운영 채널 webhook. 준비 전에는 cleanup enable 금지 |
| `/makkigo/prod/valetagents/AGENT_NOTIFICATION_SYNC_TOKEN` | 요원 알림 자동 전환 runner 가 내부 route 를 부를 때 쓰는 256-bit 임의 값(`openssl rand -base64 32`). SecureString. **없으면 runner 가 매번 실패해 배포의 heartbeat 확인이 실패합니다** |
| `/makkigo/prod/deploy/GHCR_USERNAME` | 서버가 GHCR 비공개 이미지를 받을 GitHub 계정 |
| `/makkigo/prod/deploy/GHCR_TOKEN` | GitHub Personal Access Token (classic), 권한 `read:packages` 만 |

전체 목록(값은 비움)은 루트 `.env.production.example` 에도 있습니다.

### GitHub Actions Secrets

파일이 아니라 저장소 Settings → Secrets and variables → Actions 에 등록합니다. **운영 비밀값은 두지 않고 배포에 필요한 값만** 둡니다.
Actions 는 AWS 접속 키 없이 **OIDC** 로 IAM 역할을 맡고, **SSM 명령 실행(Run Command)** 으로 EC2 에 배포합니다. SSH 포트를 열지 않습니다.

배포용 역할의 신뢰 조건(`sub`)은 저장소 이름이 아니라 **ID 가 들어간 고정 형식**입니다: `repo:justgo-valet@318992933/makkigo@1370744926:ref:refs/heads/main`. 이 저장소는 GitHub 의 immutable subject 를 쓰므로 `repo:justgo-valet/makkigo:...` 로는 역할을 맡지 못합니다. 형식은 `gh api repos/justgo-valet/makkigo/actions/oidc/customization/sub` 의 `sub_claim_prefix` 로 확인합니다.

| 이름 | 값 |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | Actions 가 맡을 IAM 역할 ARN |
| `EC2_INSTANCE_ID` | 배포 명령을 보낼 EC2 인스턴스 ID |

요원 앱은 요원 인증을 만들 때 `/makkigo/prod/valetagents/` 에 추가합니다.

### 서버가 읽을 수 있게 하기

1. IAM → 역할 생성 → 신뢰할 엔터티 **EC2**
2. 권한: `ssm:GetParametersByPath`, `ssm:GetParameters` — 리소스 `arn:aws:ssm:ap-northeast-2:<계정 ID>:parameter/makkigo/prod/*`
3. EC2 → 작업 → 보안 → **IAM 역할 수정** → 위 역할

기본 KMS 키를 쓰면 복호화 권한은 따로 주지 않아도 됩니다.

## 브랜치 · 버전 · 릴리스

| 항목 | 규칙 |
|---|---|
| 브랜치 | 기능 PR → `dev` (Squash and merge) → `main` (**merge commit 만**) |
| `main` | **서버에 올라간 코드.** `dev` 는 작업을 모으는 곳이고 버전이 없습니다 |
| 버전 형식 | SemVer `MAJOR.MINOR.PATCH`, 태그 `v1.0.0` |
| 버전 단위 | **서버 버전 하나** — 고객 앱 · 요원 앱을 같은 버전으로 함께 배포 |
| 이미지 | GHCR `ghcr.io/justgo-valet/makkigo-users:<버전>`, `.../makkigo-valetagents:<버전>` (같은 버전) |
| 버전 올리기 | **release-please** 가 커밋 제목으로 자동 결정 |
| 되돌리기 | **수동** — Actions 에서 이전 버전을 골라 배포 |

**스토어 버전과는 별개입니다.** App Store · Play Store 버전은 Flutter 앱(고객 앱 · 요원 앱 각각)의 버전이고, 웹 화면 · API 는 서버 배포만으로 바뀌므로 서로 맞추지 않습니다.

### 출시 전 · 출시 · 출시 후

| 단계 | 서버에 올리는 방법 | 버전 |
|---|---|---|
| **출시 전** (개발 서버 없이 운영 서버에서 테스트) | `dev → main` 머지 → **바로 자동 배포** | 없음. 이미지 태그는 커밋 번호 `sha-3d2b1a9` |
| **출시** | `dev → main` 머지 커밋 메시지 끝에 `Release-As: 1.0.0` → 릴리스 PR 머지 | **`v1.0.0`** |
| **출시 후** | `dev → main` 머지로 모으고 → **릴리스 PR 머지 = 배포** | release-please 가 계산 |

출시 전후로 바뀌는 것은 "배포 신호" 하나입니다.

루트 `package.json` 의 `version` 이 처음부터 `1.0.0` 으로 들어 있습니다. release-please 를 설정할 때 시작 버전(manifest)을 이 값과 헷갈리지 않게 맞추고, 첫 릴리스는 `Release-As: 1.0.0` 으로 지정합니다. 출시 후에는 실제 사용자가 있으므로, 사람이 릴리스 PR 을 머지해 "이 묶음을 이 버전으로 내보낸다"를 한 번 확인한 뒤 배포합니다.

### 릴리스 PR

release-please 봇이 `main` 에 변경이 들어올 때마다 자동으로 여는 PR 입니다 (사람이 릴리스 브랜치를 관리하지 않음).

- 내용: 루트 버전 번호 변경, `CHANGELOG.md` (이번 버전에 들어간 기능 · 수정 목록)
- `main` 에 변경이 더 들어오면 봇이 PR 을 갱신합니다 (1.1.0 → 1.2.0 등)
- **머지하면** 태그 `v1.1.0` + GitHub Release 생성 → 같은 Actions 안에서 이미지 빌드 → GHCR → EC2 배포 → `migrate deploy`

release-please 가 `GITHUB_TOKEN` 으로 만든 릴리스는 다른 워크플로를 깨우지 않으므로, 빌드 · 배포는 **같은 워크플로 안에서** 이어서 실행합니다.

### 커밋 제목과 버전

PR 제목이 스쿼시 커밋 제목이 되고, release-please 가 그것으로 다음 버전을 정합니다. **PR 제목 · 커밋 메시지 형식은 CI 가 검사합니다** ([#32](https://github.com/justgo-valet/makkigo/pull/32)).

| 커밋 제목 | 버전 | 예 |
|---|---|---|
| `fix(...): ...` | 패치 | 1.0.0 → 1.0.1 |
| `feat(...): ...` | 마이너 | 1.0.1 → 1.1.0 |
| `feat(...)!: ...` 또는 본문 `BREAKING CHANGE:` | 메이저 | 1.1.0 → 2.0.0 |
| `docs`, `chore`, `ci`, `refactor`, `test`, `style` | 안 올림 | |

범위(scope)로 어느 앱의 변경인지 적으면 CHANGELOG 에서 구분됩니다: `feat(users): ...`, `fix(valetagents): ...`

### dev → main 은 왜 merge commit 인가

스쿼시하면 `main` 에 `dev` 와 다른 새 커밋이 생겨, 다음 `dev → main` 마다 같은 변경이 충돌합니다. 그래서 이 경로만 스쿼시 원칙의 예외입니다.

## 진행 상황

| 작업 | 상태 |
|---|---|
| CI (GitHub Actions) — 타입 체크 · lint · 포맷 · 테스트 · 빌드 · 마이그레이션 검사, PR 제목 · 커밋 형식 | ✅ #32 |
| 헬스 체크 `GET /api/health` (두 앱) | ✅ #33 |
| Dockerfile — users · valetagents(standalone) · migrate | ✅ #34 |
| 운영 compose · Caddy · SSM 환경변수 스크립트 · 배포 스크립트 (`deploy/`) | ✅ #36 |
| 배포 Actions — main 머지 시 이미지 빌드 → GHCR → OIDC + SSM 명령으로 배포, 수동 배포 · 되돌리기 | ✅ #42 · #57 (ARM) · #59 (OIDC 형식) |
| AWS 준비 — GitHub OIDC 공급자, 배포용 IAM 역할, EC2 IAM 역할, 서버 Docker · AWS CLI, GHCR 토큰 | ✅ 2026-10-09 |
| 첫 운영 배포 | ✅ 2026-10-09 (#58), 이후 #69 → [runbook.md](../operations/runbook.md) |
| release-please (`Release-As: 1.0.0`) | 출시 때 |
| DB 백업 (정기 덤프 → S3) | 미정 |
| 정기 작업 — 탈퇴 회원 개인정보 삭제, 만료 · 폐기된 리프레시 토큰 · 로그인 코드 정리, 6개월 지난 위치 이용 기록 정리 (`users-jobs` 컨테이너가 매시간 내부 API 호출) | ✅ 이 PR → [runbook.md](../operations/runbook.md#정기-정리-작업) |

## 배포하기

| 하고 싶은 것 | 방법 |
|---|---|
| 지금 dev 를 서버에 올리기 (출시 전) | `dev → main` PR 을 **merge commit** 으로 머지 → Actions "배포" 가 자동 실행 |
| 특정 버전으로 다시 배포 · 되돌리기 | Actions → "배포" → Run workflow → `image_tag` 에 `sha-xxxxxxx` (또는 출시 후 `1.0.0`) |

"배포" 워크플로가 하는 일:

1. 이미지 3개(users · valetagents · migrate) 빌드 → GHCR `ghcr.io/justgo-valet/makkigo-<이름>:sha-<커밋 7자리>` (태그를 지정한 수동 실행이면 빌드 생략)
2. OIDC 로 AWS 배포용 역할을 맡음 (AWS 접속 키 없음, **main 브랜치에서만** 맡을 수 있음)
3. SSM 명령으로 EC2 에 `deploy/` 파일을 보내고 `deploy.sh` 실행 → 결과 로그를 Actions 에 출력

업체 이미지 cleanup runner는 요원 앱과 **같은 이미지**를 사용합니다. 외부 포트는 없고 내부
`/api/internal/merchant-uploads/cleanup`만 bearer token으로 호출합니다. Caddy는 이 경로를
공개 요청에서 403으로 차단합니다. 배포는 Caddy validate/reload와 runner heartbeat 확인이
성공하지 않으면 완료되지 않습니다. one-off dry-run도 배포 때 돌리지만 cleanup이 켜져 있을 때만
실패로 치고, 꺼져 있으면(`MERCHANT_UPLOAD_CLEANUP_TOKEN` 미설정 포함) 경고만 남기고 배포를
끝냅니다. runner가 없는 이전 이미지로 되돌리면 cleanup 컨테이너를 띄우지 않고 heartbeat ·
dry-run 확인도 건너뜁니다.

요원 알림 자동 전환 runner(`agent-notification-sync`)도 같은 이미지로 1분마다 내부
`/api/internal/agent-notifications/sync` 를 bearer token 으로 부릅니다. 근무 시작 · 끝 시각이 지난 지 10분 안이면
그 요원의 알림을 켜거나 끄고, 경계 뒤에 소속 행이 바뀌었으면(요원이 직접 켜고 끈 경우 등) 건드리지 않습니다. Caddy 는 `/api/internal/*` 전체를 공개
요청에서 403 으로 막습니다. 배포는 이 runner 의 heartbeat(5분 안에 성공한 호출)를 확인하고, runner 가 없는 이전
이미지로 되돌리면 이 컨테이너를 띄우지 않습니다.

같은 시각에 배포가 두 개 겹치지 않게 순서대로 실행됩니다.

## 처음 한 번 (AWS · GitHub 준비)

1. **IAM 설정** — AWS 콘솔 오른쪽 위 CloudShell 에서 저장소의 `deploy/aws/setup-iam.sh` 를 실행
   ```bash
   EC2_INSTANCE_ID=i-0b8a5131b7af49a02 bash setup-iam.sh
   ```
   GitHub OIDC 공급자, 배포용 역할 `makkigo-github-deploy`(이 인스턴스에 SSM 명령만), EC2 역할(SSM 연결 + `/makkigo/prod/*` 읽기 + 업체 사진 S3 `merchants/staging/*` · `merchants/final/*`)을 만들고 인스턴스에 연결합니다. 다시 실행해도 안전합니다. 마지막에 GitHub Secrets 값이 출력됩니다.
2. **서버 준비** — 같은 CloudShell 에서 `deploy/aws/bootstrap-server.sh` 실행 (Docker · compose · AWS CLI 설치, `/opt/makkigo` 생성)
3. **GHCR 토큰** — GitHub → Settings → Developer settings → Personal access tokens (classic), 권한 `read:packages` 만. CloudShell 에서 SSM 에 저장
   ```bash
   aws ssm put-parameter --name /makkigo/prod/deploy/GHCR_USERNAME --type SecureString --value <GitHub 아이디> --overwrite
   read -rs T && aws ssm put-parameter --name /makkigo/prod/deploy/GHCR_TOKEN --type SecureString --value "$T" --overwrite
   ```
4. **GitHub Secrets** — `AWS_DEPLOY_ROLE_ARN`(1번 출력값), `EC2_INSTANCE_ID`
5. 운영 값(`/makkigo/prod/users/*`, `/makkigo/prod/postgres/*`)이 SSM 에 들어 있는지 확인

