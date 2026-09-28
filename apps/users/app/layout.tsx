import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Ubuntu } from "next/font/google";
import Header from "@/components/layouts/Header";

const ubuntu = Ubuntu({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-ubuntu",
});

export const metadata: Metadata = {
  title: "Users",
  description: "Makkigo 사용자 애플리케이션",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko" className={ubuntu.variable}>
      <body className="flex flex-col items-center w-screen h-screen">
        <main className="flex h-screen w-full max-w-[767px] flex-col items-center p-4">
          <Header/>
          <section className="min-h-0 w-full flex-1">{children}</section>
        </main>
      </body>
    </html>
  );
}
