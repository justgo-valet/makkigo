import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Valet Agents',
  description: 'Makkigo 발렛 에이전트 애플리케이션',
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>
}
