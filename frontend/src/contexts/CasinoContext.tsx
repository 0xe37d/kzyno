'use client'
import { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import { CasinoClient } from '@/lib/casino-client'
import { Connection } from '@solana/web3.js'
import { AnchorWallet, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react'
import { MessageSignerWalletAdapter } from '@solana/wallet-adapter-base'

interface CasinoContextType {
  casinoClient: CasinoClient | null
  isConnected: boolean
  cluster: 'devnet' | 'mainnet-beta' | 'localhost'
}

const CasinoContext = createContext<CasinoContextType>({
  casinoClient: null,
  isConnected: false,
  cluster: 'devnet',
})

export function CasinoProvider({
  children,
  cluster,
}: {
  children: ReactNode
  cluster: 'devnet' | 'mainnet-beta' | 'localhost'
}) {
  const wallet = useAnchorWallet()
  const otherWallet = useWallet()
  const [casinoClient, setCasinoClient] = useState<CasinoClient | null>(null)

  useEffect(() => {
    if (!wallet?.publicKey || !wallet || !otherWallet?.wallet?.adapter) return

    let clusterEndpoint: string
    if (cluster === 'devnet') {
      clusterEndpoint = process.env.NEXT_PUBLIC_DEVNET_RPC_URL || 'https://api.devnet.solana.com'
    } else if (cluster === 'localhost') {
      clusterEndpoint = 'http://127.0.0.1:8899'
    } else {
      clusterEndpoint =
        process.env.NEXT_PUBLIC_MAINNET_RPC_URL || 'https://solana-mainnet.g.alchemy.com/v2/demo'
    }

    const connection = new Connection(clusterEndpoint)
    setCasinoClient(
      new CasinoClient(
        connection,
        wallet as AnchorWallet,
        otherWallet.wallet.adapter as MessageSignerWalletAdapter,
        cluster
      )
    )
  }, [wallet, otherWallet, cluster])

  // Handle wallet disconnection - logout and clear casino client
  useEffect(() => {
    if (!otherWallet.connected && casinoClient) {
      // Call logout to delete authentication cookie
      casinoClient.logout().catch((error) => {
        console.error('Error during logout:', error)
      })

      // Clear casino client
      setCasinoClient(null)
    }
  }, [otherWallet.connected, casinoClient])

  return (
    <CasinoContext.Provider value={{ casinoClient, isConnected: otherWallet.connected, cluster }}>
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
