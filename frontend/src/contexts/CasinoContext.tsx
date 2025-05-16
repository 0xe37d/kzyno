'use client'
import { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import { CasinoClient } from '@/lib/casino-client'
import { Connection } from '@solana/web3.js'
import { AnchorWallet, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react'
import { MessageSignerWalletAdapter } from '@solana/wallet-adapter-base'

interface CasinoContextType {
  casinoClient: CasinoClient | null
  isConnected: boolean
}

const CasinoContext = createContext<CasinoContextType>({
  casinoClient: null,
  isConnected: false,
})

export function CasinoProvider({ children, cluster }: { children: ReactNode; cluster: string }) {
  const wallet = useAnchorWallet()
  const otherWallet = useWallet()
  const [casinoClient, setCasinoClient] = useState<CasinoClient | null>(null)

  useEffect(() => {
    if (!wallet?.publicKey || !wallet || !otherWallet?.wallet?.adapter) return

    const connection = new Connection(cluster)
    setCasinoClient(
      new CasinoClient(
        connection,
        wallet as AnchorWallet,
        otherWallet.wallet.adapter as MessageSignerWalletAdapter
      )
    )
  }, [wallet, otherWallet, cluster])

  return (
    <CasinoContext.Provider value={{ casinoClient, isConnected: otherWallet.connected }}>
      {children}
    </CasinoContext.Provider>
  )
}

export function useCasino() {
  const context = useContext(CasinoContext)
  if (context === undefined) {
    throw new Error('useCasino must be used within a CasinoProvider')
  }
  return context
}
