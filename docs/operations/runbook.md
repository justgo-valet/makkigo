# 운영 방법

"이럴 땐 이렇게" 모음입니다. 자원 이름 · ID 는 [infrastructure.md](infrastructure.md) 를 봅니다.

## 서버 접속

SSH 대신 **SSM 세션 관리자**를 씁니다 (키 파일 · 22번 포트 불필요).

AWS 콘솔(서울) → EC2 → 인스턴스 `i-0b8a5131b7af49a02` 선택 → **연결** → **Session Manager** → 연결

```bash
sudo -i                       # 컨테이너는 root 로 다룸
docker ps                     # 컨테이너 상태
```

| 컨테이너 | 내용 |
|---|---|
| `makkigo-caddy-1` | HTTPS 프록시 |
| `makkigo-users-1` | 고객 앱 |
| `makkigo-valetagents-1` | 요원 앱 |
| `makkigo-postgres-1` | DB |

## 배포 · 되돌리기

| 하고 싶은 것 | 방법 |
|---|---|
| dev 를 서버에 올리기 | `dev → main` PR 을 **merge commit** 으로 머지 → Actions "배포" 자동 실행 |
| 이전 버전으로 되돌리기 | GitHub → Actions → **배포** → Run workflow (branch `main`) → `image_tag` 에 `sha-<커밋 7자리>` |
| 지금 올라간 버전 확인 | 서버에서 `docker inspect makkigo-users-1 --format '{{.Config.Image}}'` |

- `dev → main` 을 **스쿼시로 머지하면 안 됩니다.** 이력이 갈라져 다음 반영 때 충돌합니다.
- 되돌려도 **DB 마이그레이션은 되돌아가지 않습니다.** 옛 코드가 새 DB 구조에서 동작하는지 확인하고 되돌립니다.
- 배포 결과 로그는 Actions 의 "EC2 배포" 단계에 출력됩니다.

## 로그 보기 · 재시작

```bash
docker logs -f --tail 200 makkigo-users-1      # 고객 앱 로그 (Ctrl+C 로 나옴)
docker logs --since 1h makkigo-caddy-1         # 최근 1시간 프록시 로그
docker restart makkigo-users-1                 # 한 컨테이너 재시작
```

로그는 컨테이너마다 10MB × 5개까지만 남습니다.

## 환경변수 바꾸기

1. AWS 콘솔 → Systems Manager → **Parameter Store** → `/makkigo/prod/...` 값 수정
2. 지금 버전으로 **다시 배포** (위 "되돌리기"와 같은 방법, `image_tag` 에 현재 태그)
   - 배포 때 `load-env.sh` 가 SSM 값을 새로 읽습니다. 컨테이너 재시작만으로는 반영되지 않습니다.

새 변수를 추가할 때는 코드 · `.env.production.example` · [infrastructure.md](infrastructure.md) 목록도 함께 고칩니다.

## 운영 DB 접속

로컬에서 (보안 그룹에 등록된 IP 에서만):

```bash
psql "postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@13.209.92.174:5432/<POSTGRES_DB>"
```

사용자 · 비밀번호는 SSM `/makkigo/prod/postgres/` 에 있습니다. DBeaver 등 GUI 도구도 같은 값으로 접속합니다.
**운영 데이터를 직접 고치지 않습니다.** 구조 변경은 마이그레이션 파일로 합니다 → [database.md](../architecture/database.md)

## DB 백업 · 복구

자동 백업은 **아직 없습니다** ([open-questions.md](../planning/open-questions.md)). 큰 작업 전에는 손으로 백업합니다.

```bash
# 서버에서 — 백업
docker exec makkigo-postgres-1 sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > /opt/makkigo/backup-$(date +%F).dump

# 복구 (기존 데이터를 덮어씀 — 주의)
docker exec -i makkigo-postgres-1 sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < /opt/makkigo/backup-YYYY-MM-DD.dump
```

백업 파일은 서버 디스크에 있으므로, 서버가 망가지면 같이 사라집니다. 중요한 백업은 로컬로 옮겨 둡니다.

## 이미지(로고 · 차량) 바꾸기

1. S3 `makkigo-prod-image-apne2` 의 같은 키로 업로드 (`aws s3 cp ... --profile makkigo`)
2. 같은 키로 덮어썼으면 CloudFront `E37YXLP0UK5UIL` 에서 **무효화**(`/brands/*` 등) — 안 하면 최대 1일 옛 이미지가 보임

새 브랜드 · 모델은 DB(`car_brands`, `car_models`)에 경로를 추가해야 화면에 나옵니다 (`packages/database/prisma/init/init.sql`).

## 문제가 생겼을 때

| 증상 | 확인 순서 |
|---|---|
| 사이트가 안 열림 | ① `curl https://app.makkigo.com/api/health` ② 서버 `docker ps` 에서 컨테이너가 `healthy` 인지 ③ 해당 컨테이너 로그 ④ 디스크 `df -h`, 메모리 `free -h` |
| 배포가 실패 | Actions 로그에서 실패 단계 확인. "AWS 역할" 단계면 OIDC 신뢰 조건, "EC2 배포" 단계면 출력된 서버 로그(이미지 받기 · 마이그레이션) |
| 로그인이 안 됨 | ① SSM 의 소셜 키 값 ② 각 개발자 콘솔의 **콜백 주소**가 운영 주소로 등록됐는지 ③ 앱 로그 |
| 인증서 오류 | ① Route 53 A 레코드가 `13.209.92.174` 인지 ② 보안 그룹 80 · 443 이 열려 있는지 ③ `docker logs makkigo-caddy-1` |
| DB 접속 안 됨 (로컬) | 내 IP 가 바뀌었는지 → 보안 그룹 5432 규칙 소스 수정 |
| 디스크가 참 | `docker system df` 확인 후 `docker image prune -a` (실행 중이 아닌 이미지 삭제) |

## 처음부터 다시 구성하기

서버를 새로 만들어야 하면 [deployment.md 의 "처음 한 번"](../architecture/deployment.md#처음-한-번-aws--github-준비) 순서를 따릅니다 (`deploy/aws/setup-iam.sh` → `bootstrap-server.sh` → GHCR 토큰 → GitHub Secrets → 배포). 새 서버로 옮길 때는 **DB 백업을 먼저** 떠서 새 서버에 복구합니다.
