import type { Metadata } from 'next'
import './globals.css'
import '../styles/print.css'

export const metadata: Metadata = {
  title: 'PaperFlow',
  description: '마크다운 문서 웹 퍼블리싱 도구'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  )
}
