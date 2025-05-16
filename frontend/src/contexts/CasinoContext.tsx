'use client'
import { createContext, useContext, ReactNode } from 'react'
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

export function CasinoProvider({ children }: { children: ReactNode }) {
  const wallet = useAnchorWallet()
  const otherWallet = useWallet()

  const casinoClient = (() => {
    if (!wallet?.publicKey || !wallet || !otherWallet?.wallet?.adapter) return null

    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8899')
    return new CasinoClient(
      connection,
      wallet as AnchorWallet,
      otherWallet.wallet.adapter as MessageSignerWalletAdapter
    )
  })()

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
