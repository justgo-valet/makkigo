# 배포

## 구성

- AWS **EC2 1대**, 서울 리전(`ap-northeast-2`). **운영 서버만** 둡니다 (개발 서버 없음).
- 같은 서버에 Docker 컨테이너로: 고객 앱(`apps/users`), 요원 앱(`apps/valetagents`), PostgreSQL. 직접 운영합니다.
- DB 스키마는 배포 때 `prisma migrate deploy` 로 반영합니다. → [database.md](database.md)

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
| `/makkigo/prod/users/KAKAO_APP_ID` | |
| `/makkigo/prod/users/GOOGLE_IOS_CLIENT_ID` | |
| `/makkigo/prod/users/GOOGLE_ANDROID_CLIENT_ID` | Flutter `serverClientId` (웹 유형 클라이언트 ID) |
| `/makkigo/prod/users/APPLE_BUNDLE_ID` | |
| `/makkigo/prod/users/NAVER_CLIENT_ID` | 현재 미사용 → [auth.md](auth.md) |
| `/makkigo/prod/deploy/GHCR_USERNAME` | 서버가 GHCR 비공개 이미지를 받을 GitHub 계정 |
| `/makkigo/prod/deploy/GHCR_TOKEN` | GitHub Personal Access Token (classic), 권한 `read:packages` 만 |

전체 목록(값은 비움)은 루트 `.env.production.example` 에도 있습니다.

### GitHub Actions Secrets

파일이 아니라 저장소 Settings → Secrets and variables → Actions 에 등록합니다. **운영 비밀값은 두지 않고 배포에 필요한 값만** 둡니다.
Actions 는 AWS 접속 키 없이 **OIDC** 로 IAM 역할을 맡고, **SSM 명령 실행(Run Command)** 으로 EC2 에 배포합니다. SSH 포트를 열지 않습니다.

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

## 아직 만들 것

[open-questions.md](../planning/open-questions.md) 의 배포 항목 참고. 순서 제안:

1. **CI**: PR 마다 타입 체크 · lint · 테스트 · 빌드를 GitHub Actions 로 자동 실행 (지금은 없음)
2. **헬스 체크 API**: 프록시 · compose 가 앱이 살아 있는지 확인할 주소 (예: `GET /api/health`)
3. 앱 Dockerfile — Next.js `output: "standalone"`, 빌드 단계에서 `prisma generate`
4. 운영용 docker compose — 앱 2개 + PostgreSQL + **HTTPS 프록시** + SSM 에서 환경변수를 꺼내 넣는 스크립트
   - 운영에서는 인증 쿠키가 `Secure` 라서 **HTTPS 가 아니면 로그인이 안 됩니다.** 도메인 · 인증서가 필요합니다.
   - 마이그레이션(`migrate deploy`)을 실행할 이미지에는 Prisma CLI(`prisma`, 지금은 devDependency)가 있어야 합니다.
5. GitHub Actions 배포
6. DB 백업 (정기 덤프 → S3)
7. 정기 작업 (서버 cron) — 탈퇴 회원 개인정보 삭제, 만료 · 폐기된 리프레시 토큰 정리
