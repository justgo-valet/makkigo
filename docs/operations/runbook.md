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
| `makkigo-merchant-upload-cleanup-1` | 업체 이미지 cleanup hourly runner (요원 앱과 같은 이미지) |
| `makkigo-agent-notification-sync-1` | 요원 알림 자동 전환 runner, 1분마다 (요원 앱과 같은 이미지) |
| `makkigo-users-jobs-1` | 고객 앱 정기 정리 작업 (curl 이미지, 매시간 내부 API 호출) → [정기 정리 작업](#정기-정리-작업) |
| `makkigo-postgres-1` | DB |

## 배포 · 되돌리기

| 하고 싶은 것 | 방법 |
|---|---|
| dev 를 서버에 올리기 | `dev → main` PR 을 **merge commit** 으로 머지 → Actions "배포" 자동 실행 |
| 이전 버전으로 되돌리기 | GitHub → Actions → **배포** → Run workflow (branch `main`) → `image_tag` 에 `sha-<커밋 7자리>` |
| 지금 올라간 버전 확인 | 서버에서 `docker inspect makkigo-users-1 --format '{{.Config.Image}}'` |

- `dev → main` 을 **스쿼시로 머지하면 안 됩니다.** 이력이 갈라져 다음 반영 때 충돌합니다.
- 되돌려도 **DB 마이그레이션은 되돌아가지 않습니다.** 옛 코드가 새 DB 구조에서 동작하는지 확인하고 되돌립니다.
- 업체 이미지 cleanup 이 들어가기 전 이미지로 되돌리면 배포가 `makkigo-merchant-upload-cleanup-1` 을 내리고 띄우지 않습니다. runner 가 든 버전을 다시 배포하면 돌아옵니다. 되돌린 상태에서 손으로 `docker compose up -d` 를 하면 이 컨테이너가 다시 떠서 재시작을 반복합니다.
- 요원 알림 자동 전환이 들어가기 전 이미지로 되돌리면 배포가 `makkigo-agent-notification-sync-1` 도 띄우지 않습니다(위 cleanup 과 같음).
- 배포 결과 로그는 Actions 의 "EC2 배포" 단계에 출력됩니다.

### 슈퍼 어드민 콘솔이 들어가는 배포 (마이그레이션 `20261119090000_super_admin_console`)

- **배포 전에 백업**: 이 마이그레이션은 업체와 예전 업체 관리자의 연결(`merchants.admin_id`), `ticket_image_uploads.staff_id`, 업체 등록 세션 두 테이블을 지웁니다. 아래 "DB 백업" 으로 전체 덤프를 먼저 받아 둡니다. 되살릴 길은 덤프뿐입니다.
- **태그로 되돌릴 수 없음**: 이 배포 뒤 옛 이미지 태그로 되돌리면 옛 코드가 지운 칸 · 테이블을 찾다가 업체 관리자 · 티켓 · 업체 등록 쪽이 오류입니다. 또 compose 가 `makkigo-admin:<태그>` 를 요구하므로 admin 이미지가 없는 옛 태그는 받기(pull)부터 실패합니다. 문제가 생기면 고쳐서 앞으로 배포합니다.
- **짧은 오류 구간**: `deploy.sh` 는 옛 컨테이너가 떠 있는 동안 마이그레이션을 돌립니다. 새 컨테이너로 바뀌기 전까지 옛 tickets · 요원 앱의 업체 관리자 화면과 정리 runner 가 오류를 낼 수 있습니다. 고객 앱 · 요원의 부스 업무는 영향이 없습니다.
- **배포 뒤**: 슈퍼 어드민 계정 만들기(아래) → 쓰지 않게 된 SSM 값 삭제([deployment.md](../architecture/deployment.md#슈퍼-어드민-배포-2026-11-19)).

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

## 정기 정리 작업

`users-jobs` 컨테이너가 **한 시간마다** 고객 앱 내부 API(`POST /api/internal/maintenance`)를 불러 아래 네 가지를 차례로 처리합니다. 하나가 실패해도 나머지는 돕니다.

| 작업 | 지우는 것 | 남기는 것 |
|---|---|---|
| 탈퇴 회원 개인정보 | 탈퇴 30일이 지난 회원의 휴대폰 번호, 차량 정보, 고객 알림 내역(차량 번호가 들어 있음), 로그인 코드 · 리프레시 토큰 | 회원 행(탈퇴 표시), 동의 기록(5년), 발렛 이용 기록(5년, 차량 번호 포함) |
| 가입 미완료 회원 | 소셜 로그인만 하고 필수 약관에 한 번도 동의하지 않은 채 30일이 지난 회원(행을 지워 소셜 계정 · 토큰 · 푸시 기기가 함께 지워짐). 애플 회원은 애플 토큰도 철회 | 발렛 이용 기록이 있는 회원 |
| 로그인 기록 | 만료된 고객 리프레시 토큰, 폐기된 지 하루 지난 리프레시 토큰, 만료된 1회용 로그인 코드 | 쓸 수 있는 토큰 |
| 위치 이용 기록 | 만든 지 6개월 지난 위치 이용 사실 확인자료 | 6개월 안의 기록 |

탈퇴 즉시 지우는 것(소셜 연결 · 푸시 기기 · 위치 이용 기록)은 탈퇴 API 가 처리합니다. 요원 앱 토큰은 이 작업에 포함되지 않습니다.

- 켜기: SSM `/makkigo/prod/users/USERS_INTERNAL_JOB_TOKEN` 에 `openssl rand -hex 32` 값을 넣고 다시 배포. 값이 없으면 컨테이너는 건너뛰었다는 로그만 남깁니다.
- 결과 보기: `docker logs --since 24h makkigo-users-jobs-1` → `{"ok":true,"withdrawnUsers":{"purged":N,"remaining":0},"incompleteSignups":{"purged":N,"remaining":0},"expiredAuthRecords":{...},"oldLocationUseLogs":N}`. 실패하면 `"ok":false` 와 `maintenance failed`, 실패한 작업은 `null`
- 지울 대상 수만 보기(지우지 않음):
  ```bash
  docker exec makkigo-users-jobs-1 sh -c 'curl -sS -X POST -H "Authorization: Bearer $USERS_INTERNAL_JOB_TOKEN" -d "{\"dryRun\":true}" http://users:3001/api/internal/maintenance'
  ```
- 내부 API 는 외부에서 막혀 있습니다 (Caddy 가 `app.makkigo.com/api/internal/*` 를 403).

## 업체 수집

슈퍼 어드민 → **업체 수집** 화면에서 시군구 · 업종(상가정보 중분류)을 지정하면, 공공데이터포털 "소상공인시장진흥공단_상가(상권)정보" 에서 그 범위의 업체를 가져와 업체 목록에 바로 넣습니다. 고객 앱은 부스와 승인 연결된 업체만 검색하므로, 연결 전에는 고객에게 보이지 않습니다.

- 대상 추가: "수집 대상 추가" → 지역에 `서울 강남구` 처럼 입력하고 찾기(카카오 주소 검색 법정동코드 앞 5자리) → 찾은 이름 · 코드를 확인 → 대분류를 고르고 중분류 체크 → 추가. 업종 목록은 서비스키(`PUBLIC_DATA_SERVICE_KEY`)가 있어야 뜹니다
- **구가 있는 시(수원 · 성남 · 고양 · 용인 · 청주 · 천안 · 전주 · 포항 · 창원 · 안양 · 안산 등)는 구 단위로 추가**합니다(`수원시 장안구`). 시 이름만 넣으면 시 코드(예: 41110)로 잡혀 상가정보에서 업체가 0건으로 올 수 있습니다
- 수집은 **손으로만** 합니다(정기 실행 없음): 대상 줄의 "지금 수집", 또는 화면 위쪽 "전체 수집"(확인 뒤 브라우저가 대상마다 차례로 수집, "전체 수집 중 (i/n)"). 도는 동안 이 화면의 수집 버튼은 모두 꺼지고, 끝날 때까지 화면을 닫지 않습니다. 대상 삭제는 그 대상 수집만 없애고 가져온 업체는 남김
- 한 번 수집에서 하는 일
  1. 대상의 업종마다 `storeListInDong`(`divId=signguCd`) 를 1000건씩, 빈 쪽이 올 때까지 받음. 서로 다른 상가업소번호가 전체 건수보다 적으면(쪽 번호를 무시하는 응답 등) **실패로 끝내고 아무것도 바꾸지 않음**. 연결 실패 · 시간 초과 · 일일 호출 한도 초과도 같은 실패라 지우는 일이 없음
  2. 상가업소번호(`public_data_id`)가 이미 있는 업소는 건너뜀(어드민이 고친 값은 덮어쓰지 않음). 어드민이 지운 업체는 되살리지 않고, **이 대상의 수집이 지웠던 업체가 다시 나타나면 되살림**
  3. 주소가 없는 업소, 이름(공백 · 대소문자 무시)이 같은 업체가 50m 안에 있는 업소는 건너뜀
  4. 나머지를 추가: 이름 = 상호명 + 지점명(100자까지), 주소 = 도로명(없으면 지번, 200자까지), 우편번호 · 좌표 · 업종(소분류 이름)은 API 값
  5. 이 대상이 가져온 업체 중 이번 결과에 없는 것은 **부스 연결(대기 포함) · 업체 관리자 · 발렛 이력이 하나도 없을 때만** 삭제 표시. 있으면 남기고 "연결돼 남김" 으로 셈. 지울 업체가 **20곳과 이 대상의 살아 있는 업체 20% 중 큰 값을 넘으면** API 이상으로 보고 아무것도 쓰지 않고 실패로 끝냄
  6. 결과 요약(받음 · 추가 · 이미 있음 · 근처 같은 이름 · 주소 없음 · 삭제 · 되살림 · 연결돼 남김)을 대상에 저장. 성공일 때만 마지막 수집 시각을 바꿈
- 실패 메시지 예: "서비스키 … 설정되지 않았습니다"(SSM 값 없음), "응답이 JSON 이 아닙니다: SERVICE_KEY_IS_NOT_REGISTERED_ERROR"(키 승인 전이거나 Encoding/Decoding 혼동), "전체 N건 중 M건만"(API 쪽 문제, 잠시 뒤 다시 수집), "연결하지 못했습니다(시간 초과 등)", "… 곳을 지워야 해서 … 멈췄습니다"(실제로 많이 폐업했으면 대상을 업종별로 나눠 다시 돌리거나 개발자에게 문의). 오류 메시지에 서비스키는 `***` 로 가려짐

## 업체 이미지 cleanup

2026-11-19 부터 업체 사진은 슈퍼 어드민이 올리고 등록 세션 테이블이 없어, cleanup 은 **티켓 이미지만** 처리합니다(경로 · 토큰 · `MERCHANT_UPLOAD_CLEANUP_ENABLED` 는 그대로). 남은 `merchants/staging/*` 는 S3 수명 주기 규칙으로 지웁니다 → [infrastructure.md](infrastructure.md#업체-사진-staging-수명-주기).

티켓 이미지 cleanup은 만료된 RESERVED 행을 24시간 유예 후 staging에서 지우고 행을 제거합니다.
COMPLETE 행은 presigned POST 재사용 기간이 지난 뒤 staging 삭제 성공까지 재시도합니다. `tickets/final/*`은 이 cleanup
경로에서 삭제하지 않으므로 과거 발급 티켓의 immutable 자산은 유지됩니다. dry-run 응답의
`eligibleCount`로 대상 수를 확인합니다.

### 배포 전 필수 gate

1. 실제 운영 on-call 담당자와 `MERCHANT_UPLOAD_CLEANUP_ALERT_WEBHOOK_URL` 수신 채널 기록
2. isolated staging에서 presigned POST, conditional copy, delete, IAM prefix deny, CORS 검증
3. Caddy 설정 반영 후 다음 명령 모두 성공

```bash
cd /opt/makkigo/deploy
export IMAGE_TAG=<현재 이미지 태그> ENV_DIR=/opt/makkigo/env
docker compose -f docker-compose.prod.yml exec -T caddy \
  caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker compose -f docker-compose.prod.yml exec -T caddy \
  caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
# 외부 valet origin의 internal path는 403이어야 함
curl -i -X POST https://valet.makkigo.com/api/internal/merchant-uploads/cleanup
# 서버가 healthy인 상태에서만; --no-deps는 서버를 시작하지 않음
docker compose -f docker-compose.prod.yml run --rm --no-deps merchant-upload-cleanup \
  node apps/valetagents/scripts/merchant-upload-cleanup-runner.mjs --once --dry-run
```

dry-run은 cleanup이 disabled여도 200이어야 하며 DB claim/write와 S3 삭제를 하지 않습니다.
세션도 닫지 않으므로, 아직 닫히지 않은 만료 세션의 사진은 dry-run의 `eligibleCount`에 잡히지
않습니다. 같은 명령에서 `--dry-run`을 `--execute`로 바꾸면 disabled 상태에서 503/non-zero여야
합니다. 두 옵션을 함께 주면 서버에 묻지 않고 거절하므로 이 확인이 되지 않습니다.

배포(`deploy.sh`)도 같은 dry-run을 돌립니다. cleanup이 꺼져 있으면 실패해도 경고만 남기고 배포를
끝내므로, `MERCHANT_UPLOAD_CLEANUP_TOKEN`(32바이트 이상)을 SSM에 넣기 전에는 배포 로그에
`dry-run failed; continuing because cleanup is disabled`가 남습니다. 켜져 있을 때는 dry-run이나
runner heartbeat 확인이 실패하면 배포가 실패합니다.

### Enable

1. `/makkigo/prod/valetagents/MERCHANT_UPLOAD_CLEANUP_ENABLED=true`를 SSM에 저장
2. `./load-env.sh`
3. `docker compose -f docker-compose.prod.yml up -d --force-recreate valetagents merchant-upload-cleanup`
4. 두 컨테이너 health, runner enabled heartbeat, 새 `lastSuccessfulSweepAt`, backlog 감소 확인

처음 켠 직후에는 만료 세션이 닫히면서 `eligibleCount`가 먼저 늘어난 뒤 줄어듭니다. runner는 밀린
건이 있으면 한 번 깨어났을 때 100건씩 최대 20번까지 이어서 처리하고, 묶음마다 heartbeat를 남깁니다.

단순 `docker restart`는 env_file을 다시 읽지 않으므로 인정하지 않습니다. webhook은 세 가지를
보냅니다: `cleanup-age-breach`(oldest eligible age 48시간 초과), `cleanup-delete-failure`(S3 삭제
실패 건수), `cleanup-failure`(요청 자체 실패). 이 셋과 heartbeat 75분 누락 때 지정 on-call이 실제
webhook/플랫폼 경보를 받는지 staging에서 주입 검증합니다.

### Disable / rollback

1. 필요하면 runner를 즉시 stop
2. SSM 값을 `false`로 저장 → `./load-env.sh`
3. `docker compose ... up -d --force-recreate valetagents merchant-upload-cleanup`
4. server execute가 503, disabled heartbeat가 기록되고 성공 sweep 시간이 증가하지 않음을 확인
5. `docker compose -f docker-compose.prod.yml stop merchant-upload-cleanup`
6. stopped+disabled 상태에서도 one-off dry-run 200 확인

schema와 tombstone은 삭제하지 않습니다. IAM/CORS나 object integrity가 의심되면 signing/runner를
비활성화하되 업체 onboarding guard와 pending read 화면은 유지합니다.

## 슈퍼 어드민 계정 만들기

콘솔에는 슈퍼 어드민을 만드는 화면이 없습니다. 서버에서 migrate 이미지로 만듭니다. 비밀번호는 명령줄 인자로 받지 않고 숨김 입력으로 두 번 묻습니다.

```sh
# 서버에서
cd /opt/makkigo/deploy
export IMAGE_TAG=<현재 태그> ENV_DIR=/opt/makkigo/env
docker compose -f docker-compose.prod.yml --profile migrate run --rm migrate \
  node /repo/packages/auth/scripts/create-admin.mjs <아이디> <이름>

# 로컬 (.env.development 의 DATABASE_URL, 환경변수가 있으면 그쪽 우선)
pnpm --filter @makkigo/auth create-admin <아이디> <이름>
```

운영 이미지에서는 아직 실행해 보지 않았습니다(로컬 Node 22 에서만 확인).

## 업체 관리자 계정 발급

1. 슈퍼 어드민 → 업체: 카카오 장소 검색으로 업체를 추가하고 상세 주소 · 사진을 채움
2. 부스 → 그 부스 상세에서 업체 연결 요청 → 부스 관리자가 요원 앱에서 승인
3. 업체 관리자 → 새 계정(아이디 · 이름 · 업체). 화면에 **한 번만** 보이는 임시 비밀번호를 업체에 전달
4. 업체 관리자는 `tickets.makkigo.com` 에서 로그인하고 비밀번호를 바꾼 뒤 티켓을 만듦
5. 비밀번호를 잊으면 슈퍼 어드민이 재설정(임시 비밀번호 다시 발급, 모든 기기 로그아웃). 5번 틀리면 15분 잠기고, 재설정하면 잠금도 풀림

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

새 브랜드 · 모델은 DB(`car_brands`, `car_models`)에 경로를 추가해야 화면에 나옵니다 (`packages/database/prisma/init/init.sql`). 브랜드는 `display_order` 도 넣고, 순서를 바꿀 때는 이 값만 고칩니다.

## 부스 사진 업로드 오류 복구

부스 등록 로그에 `Booth creation outcome is ambiguous`, `Booth photo promotion may have completed after timeout`,
`Failed to clean up booth photos` 중 하나가 남으면 `keys` 에 기록된 정확한 S3 키만 확인합니다. 승격/트랜잭션 결과가 불명확한 final 키는 로그
시각에서 최소 1시간 기다린 뒤 DB에서 참조 여부를 확인합니다. `booth_photos.path` 에 하나라도 남아 있으면
삭제하지 않습니다. DB 연결이나 조회에 실패하면 S3 객체를 그대로 둡니다.

참조가 없는 키만 `aws s3 rm s3://makkigo-prod-image-apne2/<로그의 정확한 키>` 로 하나씩 지웁니다.
`booths/final/*` 전체에 lifecycle 만료나 일괄 삭제를 설정하지 않습니다. 등록되지 않은 staging 객체는
S3 lifecycle 규칙이 하루 뒤 지웁니다.

## 문제가 생겼을 때

| 증상 | 확인 순서 |
|---|---|
| 사이트가 안 열림 | ① `curl https://app.makkigo.com/api/health` ② 서버 `docker ps` 에서 컨테이너가 `healthy` 인지 ③ 해당 컨테이너 로그 ④ 디스크 `df -h`, 메모리 `free -h` |
| 배포가 실패 | Actions 로그에서 실패 단계 확인. "AWS 역할" 단계면 OIDC 신뢰 조건, "EC2 배포" 단계면 출력된 서버 로그(이미지 받기 · 마이그레이션). 서버 로그 없이 `ipc messaging received timeout` 만 나오면 디스크가 찬 것 (SSM 에이전트가 작업 파일을 못 씀) |
| 로그인이 안 됨 | ① SSM 의 소셜 키 값 ② 각 개발자 콘솔의 **콜백 주소**가 운영 주소로 등록됐는지 ③ 앱 로그 |
| 인증서 오류 | ① Route 53 A 레코드가 `13.209.92.174` 인지 ② 보안 그룹 80 · 443 이 열려 있는지 ③ `docker logs makkigo-caddy-1` |
| DB 접속 안 됨 (로컬) | 내 IP 가 바뀌었는지 → 보안 그룹 5432 규칙 소스 수정 |
| 디스크가 참 | `df -h /` · `docker system df` 확인 후 `docker image prune -a` (실행 중이 아닌 이미지 삭제). 배포가 이번 태그가 아닌 `makkigo-*` 이미지를 지우므로 평소엔 쌓이지 않음 |

## 처음부터 다시 구성하기

서버를 새로 만들어야 하면 [deployment.md 의 "처음 한 번"](../architecture/deployment.md#처음-한-번-aws--github-준비) 순서를 따릅니다 (`deploy/aws/setup-iam.sh` → `bootstrap-server.sh` → GHCR 토큰 → GitHub Secrets → 배포). 새 서버로 옮길 때는 **DB 백업을 먼저** 떠서 새 서버에 복구합니다.
