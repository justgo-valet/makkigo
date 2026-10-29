import { Ubuntu } from "next/font/google";

import './globals.css';

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

const ubuntu = Ubuntu({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-ubuntu",
});

export const metadata: Metadata = {
  title: 'Valet Agents',
  description: 'Makkigo 발렛 에이전트 애플리케이션',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="ko" className={ubuntu.variable}>
    <body className="flex flex-col items-center w-full h-screen">
      <main className="flex h-screen w-full max-w-[767px] flex-col items-center p-4 pt-[calc(1rem+var(--safe-area-inset-top))]">
        <section className="min-h-0 w-full flex-1">
          {children}
        </section>
      </main>
    </body>
  </html>
}
