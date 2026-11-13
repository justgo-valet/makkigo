import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";

import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "마끼고 티켓 관리",
  description: "업체 관리자가 고객에게 보여 줄 발렛 티켓을 만들고 고칩니다.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-dvh bg-(--surface-color) text-(--base-color) antialiased">{children}</body>
    </html>
  );
}
