import "server-only";

import { NextResponse } from "next/server";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

const apiError = (code: string, message: string, status: number) =>
  NextResponse.json({ message, code }, { status, headers: NO_STORE_HEADERS });

const privateJson = <Body>(body: Body, init?: ResponseInit) =>
  NextResponse.json(body, {
    ...init,
    headers: { ...Object.fromEntries(new Headers(init?.headers).entries()), ...NO_STORE_HEADERS },
  });

export { apiError, NO_STORE_HEADERS, privateJson };
