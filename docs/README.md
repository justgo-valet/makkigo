# 마끼고 문서

기획·디자인·설계에서 **정한 것과 그 이유**를 모아 둔 곳입니다. 코드나 PR 에 이미 있는 내용은 옮기지 않고 링크로 연결합니다.

## 무엇을 알고 싶을 때 어디를 보나

| 알고 싶은 것 | 문서 |
|---|---|
| 서비스가 뭔지, 용어(요원·부스·업체), 누가 어떤 앱을 쓰는지 | [planning/overview.md](planning/overview.md) |
| 고객이 앱에서 무엇을 어떤 순서로 하는지 | [planning/user-flows.md](planning/user-flows.md) |
| 발렛 세션 상태, 요금 계산, QR, 티켓, 업체 연결 규칙 | [planning/valet-session.md](planning/valet-session.md) |
| 발렛 유형(예약형 · 현장형 · 비회원)별 처음부터 끝까지 시나리오 | [planning/valet-scenarios.md](planning/valet-scenarios.md) |
| 결제, 약관 동의, 회원 탈퇴·개인정보 보관 | [planning/policies.md](planning/policies.md) |
| 이용약관 · 개인정보 처리방침 초안, 법률 검토할 점 | [legal/README.md](legal/README.md) |
| 아직 정하지 않은 것, 알고 두는 허점 | [planning/open-questions.md](planning/open-questions.md) |
| Figma 위치, 화면 목록, 화면별 데이터 | [design/screens.md](design/screens.md) |
| 테이블 구성과 관계, ERD 초안에서 바뀐 이유 | [architecture/database.md](architecture/database.md) |
| 로그인·토큰·쿠키, Flutter 웹뷰 연동 | [architecture/auth.md](architecture/auth.md) |
| API 목록과 각 PR, 프론트에서 API 부르는 법 | [architecture/api.md](architecture/api.md) |
| 서버 구성, 운영 환경변수(SSM Parameter Store) 이름 규칙 · 목록 | [architecture/deployment.md](architecture/deployment.md) |
| Flutter 앱 폴더 · 앱 ID · 웹뷰 규칙 · 스토어 조건 | [architecture/mobile.md](architecture/mobile.md) |
| 운영 자원 목록 — AWS · 도메인 · GitHub · 외부 서비스가 어디에 무엇으로 있나 | [operations/infrastructure.md](operations/infrastructure.md) |
| 운영 방법 — 서버 접속 · 배포 · 되돌리기 · 로그 · DB 백업 · 장애 대응 | [operations/runbook.md](operations/runbook.md) |
| 프로젝트를 넘겨받을 때 — 읽는 순서 · 넘길 계정 · 비밀값 위치 | [handover.md](handover.md) |
| "전에 뭐라고 정했지?" — 날짜순 결정 기록 | [decisions.md](decisions.md) |

## 우선순위

문서끼리 다르면 **decisions.md 의 가장 최근 결정**이 기준입니다.
Figma 화면은 예시이고, 플로우·정책 문서가 우선합니다.

## 문서 규칙

- 주제별 1~2쪽. "결정 + 이유 + 출처 링크" 만 씁니다.
- 기획이 바뀌면 해당 문서와 [decisions.md](decisions.md) 를 같이 고칩니다.
- 코드를 바꾸는 PR 에서 관련 문서가 낡게 되면 같은 PR 에서 고칩니다.

## 개발 환경 메모

- 패키지 매니저는 `pnpm@12.6.0` (루트 `package.json`). corepack 0.32 이하는 pnpm 12 를 실행하지 못하므로 `npm i -g corepack@latest` 로 올립니다.
- Next.js 앱은 루트가 아니라 **앱 폴더의 `.env*`** 를 읽습니다 (예: `apps/users/.env.development.local`). 루트 `.env.development` 는 docker·Prisma 용입니다.
- 환경변수 목록(값은 비움): 로컬 docker · Prisma 는 루트 `.env.example`, 고객 앱은 `apps/users/.env.example`, 운영(SSM · GitHub Actions)은 루트 `.env.production.example`. 값을 채운 파일은 `.gitignore` 로 커밋되지 않습니다.
- `next dev` 가 앱 폴더에 `AGENTS.md`, `CLAUDE.md` 를 만들지 않도록 두 앱 모두 `agentRules: false` 로 꺼 두었습니다.
