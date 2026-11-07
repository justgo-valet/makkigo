import { Ubuntu } from "next/font/google";
import { headers } from "next/headers";

import Header from "@/components/layouts/Header";
import QueryProvider from "@/components/providers/QueryProvider";
import { getDevicePlatform } from "@/libs/device/getDevicePlatform";

import "./globals.css";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

const ubuntu = Ubuntu({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-ubuntu",
});

export const metadata: Metadata = {
  title: "Users",
  description: "Makkigo 사용자 애플리케이션",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

const TOP_PADDING_BY_PLATFORM = {
  android: "pt-[calc(1rem+var(--safe-area-inset-top))]",
  ios: "pt-[max(1rem,var(--safe-area-inset-top))]",
  other: "pt-[max(1rem,var(--safe-area-inset-top))]",
} as const;

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const platform = getDevicePlatform((await headers()).get("user-agent") ?? "");

  return (
    <html lang="ko" className={ubuntu.variable}>
      <body className="flex flex-col items-center w-full h-screen">
        <QueryProvider>
          <main
            className={`flex h-screen w-full max-w-[767px] flex-col items-center p-4 ${TOP_PADDING_BY_PLATFORM[platform]} pb-[calc(1rem+var(--safe-area-inset-bottom))]`}
          >
            <Header />
            <section className="min-h-0 w-full flex-1">{children}</section>
          </main>
        </QueryProvider>
      </body>
    </html>
  );
}
