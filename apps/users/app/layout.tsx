import type { Metadata } from "next";
import { Ubuntu } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

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
      <body>
        <main className="w-screen h-screen flex  justify-center p-0">
          <section className="max-w-[767px] w-full px-5">{children}</section>
        </main>
      </body>
    </html>
  );
}
