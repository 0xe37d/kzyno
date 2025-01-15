import React from 'react'
import { hyperlegible } from './fonts'
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'kzyno',
  description: 'The future of decentralized casino gaming',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${hyperlegible.className} antialiased`}>{children}</body>
    </html>
  )
}
