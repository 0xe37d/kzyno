'use client'
import { CasinoProvider } from '@/contexts/CasinoContext'
import { useState } from 'react'

export default function ArcadeLayout({ children }: { children: React.ReactNode }) {
  const [cluster, setCluster] = useState('https://api.devnet.solana.com')
  return (
    <>
      <select
        className="fixed z-50 top-4 left-4 p-2 bg-gray-800 text-white rounded"
        defaultValue={'https://api.devnet.solana.com'}
        onChange={(e) => setCluster(e.target.value)}
      >
        <option value="https://api.mainnet-beta.solana.com">Mainnet</option>
        <option value="https://api.devnet.solana.com">Devnet</option>
        <option value="http://127.0.0.1:8899">Localhost</option>
      </select>
      <CasinoProvider cluster={cluster}>{children}</CasinoProvider>
    </>
  )
}
