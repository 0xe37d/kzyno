'use client'

import { useCasino } from '@/contexts/CasinoContext'
import { useEffect, useState } from 'react'

export function BalanceDisplay() {
  const { casinoClient, isConnected } = useCasino()
  const [balances, setBalances] = useState<{ sol: number; token: number; casino: number }>({
    sol: 0,
    token: 0,
    casino: 0,
  })

  useEffect(() => {
    if (!casinoClient || !isConnected) return

    const fetchBalances = async () => {
      try {
        const { sol, token, casino } = await casinoClient.get_balance()
        setBalances({ sol, token, casino })
      } catch (error) {
        console.error('Error fetching balances:', error)
      }
    }

    fetchBalances()
    const interval = setInterval(fetchBalances, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [casinoClient, isConnected])

  if (!isConnected) return null

  return (
    <div className="flex gap-4 text-sm">
      <div>SOL: {balances.sol / 1e9}</div>
      <div>Token: {balances.token / 1e9}</div>
      <div>Casino: {balances.casino / 1e9}</div>
    </div>
  )
}
