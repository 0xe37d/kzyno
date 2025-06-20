import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useCasino } from '@/contexts/CasinoContext'
import { Balance } from '@/lib/casino-client'

export function useGameSetup() {
  const { connected } = useWallet()
  const { casinoClient } = useCasino()
  const [balance, setBalance] = useState<Balance>({ sol: 0, token: 0, casino: 0 })
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false)
  const [isReady, setIsReady] = useState(false)

  // Fetch balance when casino client is initialized
  useEffect(() => {
    if (!casinoClient || !connected) {
      setIsReady(false)
      return
    }

    const fetchBalance = async () => {
      try {
        const bal = await casinoClient.get_balance()
        setBalance(bal)

        // Check if user is ready to play
        const hasSol = bal.sol > 0
        const hasCasinoBalance = bal.casino > 0
        setIsReady(connected && hasSol && hasCasinoBalance)
      } catch (err) {
        console.error('Error fetching balance:', err)
        setIsReady(false)
      }
    }

    fetchBalance()
  }, [casinoClient, connected])

  // Helper functions to determine user state
  const hasSol = balance.sol > 0
  const hasCasinoBalance = balance.casino > 0

  useEffect(() => {
    if (connected && hasSol && hasCasinoBalance) {
      setIsSetupModalOpen(false)
    } else {
      setIsSetupModalOpen(true)
    }
  }, [connected, hasSol, hasCasinoBalance])

  const onClose = () => {
    setIsSetupModalOpen(false)
  }

  return {
    isSetupModalOpen,
    isReady,
    balance,
    hasSol,
    hasCasinoBalance,
    onClose,
  }
}
