import "server-only";
import { NextResponse } from "next/server";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const createAppRedirectPage = (url: string) => {
  const href = escapeHtml(url);

  return new NextResponse(
    `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="0;url=${href}">
<title>마끼고</title>
</head>
<body style="font-family:sans-serif;text-align:center;padding-top:40vh">
<a href="${href}">앱으로 돌아가기</a>
</body>
</html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
};

export { createAppRedirectPage };
