# 인프라 자원 목록

운영에 쓰는 자원이 **어디에 무엇으로** 있는지 모아 둔 문서입니다. 비밀값은 적지 않고 위치만 적습니다.
구성과 그렇게 정한 이유는 [deployment.md](../architecture/deployment.md), 운영 방법은 [runbook.md](runbook.md) 를 봅니다.

(2026-10-10 기준)

## 한눈에

```
사용자 ──https──▶ Route 53 (makkigo.com) ──▶ EC2 13.209.92.174
                                              └ Docker
                                                ├ caddy        :80 · :443  HTTPS, 주소별 연결
                                                ├ users        :3001       고객 앱  app.makkigo.com
                                                ├ valetagents  :3000       요원 앱  valet.makkigo.com
                                                └ postgres     :5432       DB (허용 IP 만)
GitHub Actions ──빌드──▶ GHCR ──pull──▶ EC2
              └─OIDC + SSM 명령──▶ EC2 (deploy.sh)
이미지 · 로고 ──▶ S3 ──▶ CloudFront
```

## AWS (계정 `659947636602`, 리전 서울 `ap-northeast-2`)

### EC2

| 항목 | 값 |
|---|---|
| 인스턴스 | `i-0b8a5131b7af49a02`, **t4g.small** (ARM · Graviton, 메모리 1.8GB) |
| OS | Ubuntu 26.04 (aarch64), Docker 29, compose v5, AWS CLI |
| 디스크 | EBS 20GB gp3, 스왑 2GB (`/swapfile`) |
| 탄력적 IP | `13.209.92.174` |
| 서버 파일 | `/opt/makkigo/deploy` (배포 때 Actions 가 덮어씀), `/opt/makkigo/env` (SSM 에서 꺼낸 env 파일, 권한 600) |
| IAM 역할 | `makkigo-prod-ec2` — SSM 연결(`AmazonSSMManagedInstanceCore`) + `/makkigo/prod/*` 파라미터 읽기 |

**이미지는 ARM(`linux/arm64`) 전용**입니다. x86 서버로 옮기면 빌드 설정(`deploy.yml` 의 러너 · 플랫폼)도 바꿔야 합니다.

### 보안 그룹 `makkigo-prod-sg` (`sg-072c0e3e553333d29`)

| 포트 | 허용 | 이유 |
|---|---|---|
| 80 · 443 | 모두 | 서비스 접속, 인증서 발급 (80) |
| 22 (SSH) | 관리자 IP 만 | 비상용. 평소 접속 · 배포는 SSM 을 씀 |
| 5432 (PostgreSQL) | 관리자 IP 만 | 로컬에서 운영 DB 를 보기 위해 **의도적으로 열어 둠** |

관리자 IP 가 바뀌면 22 · 5432 규칙의 소스를 새 IP 로 고쳐야 접속됩니다.

### IAM

| 이름 | 종류 | 용도 |
|---|---|---|
| `token.actions.githubusercontent.com` | OIDC 공급자 | GitHub Actions 를 AWS 가 믿게 함 |
| `makkigo-github-deploy` | 역할 | 배포용. `main` 브랜치 Actions 만 맡을 수 있고, 이 EC2 에 SSM 명령 보내기만 가능 |
| `makkigo-prod-ec2` | 역할 · 인스턴스 프로파일 | EC2 용 (위 표) |
| `makkigo-s3-user` | 사용자 | 이미지 업로드용 (S3 전체 + 파라미터 이름 조회). 콘솔 로그인 · EC2 · Route 53 권한 없음 |

배포 역할의 신뢰 조건은 저장소 **ID 형식**입니다 (`repo:justgo-valet@318992933/makkigo@1370744926:ref:refs/heads/main`). 이유 → [deployment.md](../architecture/deployment.md#github-actions-secrets)
역할 · 정책은 `deploy/aws/setup-iam.sh` 로 다시 만들 수 있습니다.

### SSM Parameter Store (`/makkigo/prod/…`, SecureString)

값은 콘솔에서만 봅니다. 이름 규칙은 [deployment.md](../architecture/deployment.md#이름-규칙).

| 경로 | 개수 | 이름 |
|---|---|---|
| `postgres/` | 3 | `POSTGRES_USER` `POSTGRES_PASSWORD` `POSTGRES_DB` |
| `users/` | 11 | `DATABASE_URL` `AUTH_JWT_SECRET` `PUBLIC_URL` `IMAGE_BASE_URL` `KAKAO_REST_API_KEY` `KAKAO_CLIENT_SECRET` `GOOGLE_CLIENT_ID` `GOOGLE_CLIENT_SECRET` `APPLE_SERVICES_ID` `NAVER_CLIENT_ID` `NAVER_CLIENT_SECRET` |
| `valetagents/` | 13 | `DATABASE_URL` `AUTH_JWT_SECRET` `PUBLIC_URL` `OAUTH_CALLBACK_ORIGIN` `APP_CALLBACK_URL` `AUTH_COOKIE_DOMAIN` + 소셜 7개(고객 앱과 같은 이름) |
| `deploy/` | 2 | `GHCR_USERNAME` `GHCR_TOKEN` (`read:packages` 만 있는 GitHub 토큰) |

### 이미지 CDN

| 항목 | 값 |
|---|---|
| S3 버킷 | `makkigo-prod-image-apne2` (비공개, CloudFront 로만 접근) |
| CloudFront | `E37YXLP0UK5UIL` → `https://d2lnojrmgxqgrc.cloudfront.net` |
| 키 | `brands/{브랜드}.png`, `cars/{브랜드}/{모델}.png`, `cars/_default.png` |

DB 에는 전체 주소가 아니라 **경로만** 저장하고, 서버가 `IMAGE_BASE_URL` 과 합쳐 응답합니다.

### Route 53

`makkigo.com` 호스팅 영역 — A 레코드 `app` · `valet` → `13.209.92.174`. 루트 `makkigo.com` 은 비어 있습니다.

## 도메인

| 도메인 | 등록 | 네임서버 | 만료 |
|---|---|---|---|
| `makkigo.com` | 가비아 | **Route 53** (DNS 레코드는 AWS 에서 관리) | 2028-08-29 |
| `kkaennip.kr` | 가비아 | 가비아 | 2028-08-29 (사용 안 함) |

## HTTPS 인증서

Caddy 가 Let's Encrypt 인증서를 자동 발급 · 갱신합니다 (90일, 만료 30일 전 자동 갱신). 인증서는 Docker 볼륨 `caddy_data` 에 있어 컨테이너를 다시 만들어도 유지됩니다.

## GitHub (조직 `justgo-valet`)

| 항목 | 내용 |
|---|---|
| 저장소 | `makkigo` (서버 · 웹, 비공개), `makkigo-mobile` (Flutter 앱, 비공개), `car-images-crawler` (차량 이미지 수집, 비공개) |
| 브랜치 | `dev` (작업), `main` (서버에 올라간 코드) |
| 워크플로 | `ci.yml` (PR 검사), `pr-lint.yml` (PR 제목 · 커밋 형식), `deploy.yml` (배포) |
| Actions Secrets | `AWS_DEPLOY_ROLE_ARN`, `EC2_INSTANCE_ID` |
| 이미지 (GHCR) | `ghcr.io/justgo-valet/makkigo-users`, `-valetagents`, `-migrate` — 태그 `sha-<커밋 7자리>` |

## Docker 볼륨 (서버)

| 볼륨 | 내용 | 지우면 |
|---|---|---|
| `makkigo_postgres_data` | **운영 DB 데이터** | 데이터 전부 사라짐 |
| `makkigo_caddy_data` | HTTPS 인증서 | 다시 발급 (발급 횟수 제한 주의) |
| `makkigo_caddy_config` | Caddy 설정 캐시 | 영향 없음 |

## 앱 · 외부 서비스

| 서비스 | 내용 |
|---|---|
| 애플 | 팀 `8Z9ZNRXURC`, App ID `com.makkigo.user`, Services ID `com.makkigo.user.web` (고객 · 요원 콜백 등록) |
| 고객 앱 ID | `com.makkigo.user` (iOS 번들 ID = Android 패키지명) → [mobile.md](../architecture/mobile.md) |
| 카카오 · 구글 · 네이버 | 각 개발자 콘솔에 OAuth 앱 (콜백: `https://app.makkigo.com/...`, `https://valet.makkigo.com/...`) |
