import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL("https://tritry.app"),
  title: {
    default: "TRITRY | 억울한 수도권인들과 양심없는 서울 사람들을 위한 가이드라인",
    template: "%s | TRITRY",
  },
  description: "낄낄",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "TRITRY | 억울한 수도권인들과 양심없는 서울 사람들을 위한 가이드라인",
    description: "낄낄",
    locale: "ko_KR",
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
