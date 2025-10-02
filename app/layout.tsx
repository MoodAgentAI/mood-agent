import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "MoodAgent - Autonomous Crypto Sentiment Trading",
  description:
    "Real-time sentiment analysis and automated treasury management for Solana. AI-powered trading based on social mood and market signals.",
  keywords: ["crypto", "sentiment analysis", "solana", "automated trading", "AI trading", "treasury management"],
  authors: [{ name: "MoodAgent Team" }],
  creator: "MoodAgent",
  publisher: "MoodAgent",
  metadataBase: new URL("https://moodagent.dev"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://moodagent.dev",
    title: "MoodAgent - Autonomous Crypto Sentiment Trading",
    description: "Real-time sentiment analysis and automated treasury management for Solana",
    siteName: "MoodAgent",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MoodAgent Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MoodAgent - Autonomous Crypto Sentiment Trading",
    description: "Real-time sentiment analysis and automated treasury management for Solana",
    creator: "@MoonAgentAI",
    site: "@MoonAgentAI",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  )
}
