import React from 'react'
import { hyperlegible } from './fonts'
import './globals.css'
import type { Metadata } from 'next'
import { WalletProvider } from './providers/WalletProvider'
import { SettingsProvider } from '@/contexts/SettingsContext'

export const metadata: Metadata = {
  title: 'kzyno',
  description: 'The future of decentralized casino gaming',
  openGraph: {
    title: 'kzyno - Decentralized Casino Gaming',
    description:
      'Experience the future of casino gaming with our decentralized platform featuring classic games and unique experiences.',
    type: 'website',
    locale: 'en_US',
    siteName: 'kzyno',
    images: [
      {
        url: '/images/preview.png',
        width: 1200,
        height: 630,
        alt: 'kzyno - Decentralized Casino Gaming',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'kzyno - Decentralized Casino Gaming',
    description:
      'Experience the future of casino gaming with our decentralized platform featuring classic games and unique experiences.',
    images: ['/images/preview.png'],
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${hyperlegible.className} antialiased`}>
        
        <SettingsProvider>
          <WalletProvider>{children}</WalletProvider>
        </SettingsProvider>
      </body>
    </html>
  )
}
