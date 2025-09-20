import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'

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
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}