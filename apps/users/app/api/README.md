# app/api

API 의 **HTTP 입구**입니다. `route.ts` 하나가 URL 하나이고, `GET` · `POST` 같은 이름으로 함수를 내보내면 그 메서드를 받습니다.

## route.ts 가 하는 일

1. 로그인 확인: `server/auth/getCurrentUserId` → 없으면 401
2. 요청 형식 확인: `libs/<도메인>/contracts` 의 zod 스키마 → 틀리면 400
3. 실제 일은 `server/<도메인>/` 함수에 맡김
4. 결과를 상태 코드 + `{ message, code? }` 로 응답

```ts
export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });

  const body = recordConsentsRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ message: "..." }, { status: 400 });

  await recordUserConsents(userId, body.data);
  return new NextResponse(null, { status: 204 });
}
```

## 규칙

- 경로는 `/api/v1/...` (`health` 만 예외)
- `prisma` 를 여기서 직접 부르지 않습니다 → `server/`
- 사용자에게 보여줄 오류 문구는 여기서 정합니다. `server/` 는 `{ ok: false, reason }` 처럼 사유만 돌려줍니다.

API 목록과 오류 응답 규칙: [docs/architecture/api.md](../../../../docs/architecture/api.md)
