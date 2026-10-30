import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { GA_INLINE_SNIPPET, GA_MEASUREMENT_ID } from '@/lib/analytics/ga-snippet'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' })

export const metadata: Metadata = {
  title: 'SI8 Creator Portal',
  description: 'Create and manage your Creator Record documentation and Commercial Assurance Assessment submissions.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}></script>
        <script dangerouslySetInnerHTML={{ __html: GA_INLINE_SNIPPET }} />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans`}>{children}</body>
    </html>
  )
}
