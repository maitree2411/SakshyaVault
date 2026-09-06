import '@rainbow-me/rainbowkit/styles.css'
import './globals.css'
import type { Metadata } from 'next'
import { Providers } from './providers'
import { ToastProvider } from '@/components/Toast'

export const metadata: Metadata = {
  title: 'SakshyaVault - Legal & Evidence Vault',
  description: 'Secure, privacy-preserving legal document & evidence integrity system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-slate-950 text-slate-100">
        <ToastProvider>
          <Providers>
            {children}
          </Providers>
        </ToastProvider>
      </body>
    </html>
  )
}


