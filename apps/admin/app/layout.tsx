import { connection } from "next/server";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";

import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "마끼고 관리자",
  description: "마끼고 업체 · 업체 관리자 · 부스 · 발렛 세션을 관리합니다.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  await connection();

  return (
    <html lang="ko">
      <body className="min-h-dvh bg-(--surface-color) text-(--base-color) antialiased">{children}</body>
    </html>
  );
}
