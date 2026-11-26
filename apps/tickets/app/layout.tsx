import { connection } from "next/server";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";

import "./globals.css";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "마끼고 업체 관리",
  description: "업체 관리자가 발렛 티켓을 꾸미고 업체 정보와 발렛 현황을 봅니다.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  await connection();

  return (
    <html lang="ko">
      <body className="min-h-dvh bg-(--surface-color) text-(--base-color) antialiased">{children}</body>
    </html>
  );
}
