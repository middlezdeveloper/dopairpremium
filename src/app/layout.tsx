import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Dopair Premium - AI-Powered Recovery Platform',
  description: 'Transform your relationship with technology through personalized AI coaching and evidence-based recovery programs.',
  keywords: 'digital addiction, recovery, AI coach, screen time, dopamine',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  )
}