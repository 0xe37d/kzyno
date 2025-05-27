'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { daydream } from '../../fonts'
import dynamic from 'next/dynamic'
import { useCasino } from '@/contexts/CasinoContext'
import { KOINS_PER_SOL } from '@/lib/constants'
import { Balance } from '@/lib/casino-client'
// Dynamically import the WalletMultiButton with SSR disabled
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
)

export default function CasinoTest() {
  const [balance, setBalance] = useState<Balance>({ sol: 0, token: 0, casino: 0 })
  const [status, setStatus] = useState<{
    total_liquidity: number
    vault_balance: number
    profit: number
    profit_share: number
  } | null>(null)
  const [betAmount, setBetAmount] = useState<number>(10)
  const [multiplier, setMultiplier] = useState<number>(2)
  const [playResult, setPlayResult] = useState<{ won: boolean; amount_change: number } | null>(null)
  const [depositAmount, setDepositAmount] = useState<number>(1000)
  const [withdrawAmount, setWithdrawAmount] = useState<number>(100)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [casinoDepositAmount, setCasinoDepositAmount] = useState<number>(0.1) // in SOL
  const [casinoWithdrawAmount, setCasinoWithdrawAmount] = useState<number>(0.1) // in SOL
  const { casinoClient } = useCasino()

  // Fetch balance when casino client is initialized
  useEffect(() => {
    if (!casinoClient) return
    const fetchBalance = async () => {
      const bal = await casinoClient.get_balance()
      setBalance(bal)
    }
    const fetchStatus = async () => {
      const stat = await casinoClient.get_status()
      setStatus(stat)
    }
    fetchBalance()
    fetchStatus()
  }, [casinoClient])

  const handlePlay = async () => {
    if (!casinoClient) {
      setError('Casino client not initialized')
      return
    }

    if (balance.casino < betAmount) {
      setError('Insufficient balance. Deposit some SOL to the casino.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const result = await casinoClient.play(betAmount, multiplier)
      setPlayResult(result)

      // Refresh balance after playing
      const bal = await casinoClient.get_balance()
      setBalance(bal)

      // Refresh status after playing
      const stat = await casinoClient.get_status()
      setStatus(stat)
    } catch (err) {
      console.error('Error playing game:', err)
      setError('Failed to play game')
    } finally {
      setLoading(false)
    }
  }

  const handleDeposit = async () => {
    if (!casinoClient) {
      setError('Casino client not initialized')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await casinoClient.deposit(depositAmount)

      // Refresh balance after deposit
      const bal = await casinoClient.get_balance()
      setBalance(bal)

      // Refresh status after deposit
      const stat = await casinoClient.get_status()
      setStatus(stat)
    } catch (err) {
      console.error('Error depositing:', err)
      setError('Failed to deposit')
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (!casinoClient) {
      setError('Casino client not initialized')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await casinoClient.withdraw(withdrawAmount)

      // Refresh balance after withdrawal
      const bal = await casinoClient.get_balance()
      setBalance(bal)

      // Refresh status after withdrawal
      const stat = await casinoClient.get_status()
      setStatus(stat)
    } catch (err) {
      console.error('Error withdrawing:', err)
      setError('Failed to withdraw')
    } finally {
      setLoading(false)
    }
  }

  const handleCasinoDeposit = async () => {
    if (!casinoClient) {
      setError('Casino client not initialized')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await casinoClient.depositFunds(casinoDepositAmount)

      // Refresh balance after deposit
      const bal = await casinoClient.get_balance()
      setBalance(bal)

      // Refresh status after deposit
      const stat = await casinoClient.get_status()
      setStatus(stat)
    } catch (err) {
      console.error('Error depositing to casino:', err)
      setError('Failed to deposit to casino')
    } finally {
      setLoading(false)
    }
  }

  const handleCasinoWithdraw = async () => {
    if (!casinoClient) {
      setError('Casino client not initialized')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await casinoClient.withdrawFunds(casinoWithdrawAmount)

      // Refresh balance after withdrawal
      const bal = await casinoClient.get_balance()
      setBalance(bal)

      // Refresh status after withdrawal
      const stat = await casinoClient.get_status()
      setStatus(stat)
    } catch (err) {
      console.error('Error withdrawing from casino:', err)
      setError('Failed to withdraw from casino')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-3xl font-bold ${daydream.className}`}>Dashboard</h1>
          <div className="flex items-center gap-4">
            <WalletMultiButton />
            <Link
              href="/arcade"
              className={`text-white hover:text-pink-200 transition-colors ${daydream.className} text-lg`}
            >
              Arcade
            </Link>
          </div>
        </div>

        {error && <div className="bg-red-600 text-white p-4 rounded mb-4">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Balance and Status Section */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className={`text-xl font-bold mb-4 ${daydream.className}`}>Balance & Status</h2>

            <div className="mb-4">
              <h3 className="font-bold mb-2">Your play money:</h3>
              <p className="text-gray-300">SOL Balance: {(balance.sol / 1e9).toFixed(3)} SOL</p>
              <p className="text-gray-300">
                Casino Balance: {((balance.casino / 1e9) * KOINS_PER_SOL).toFixed(3)} Koins /{' '}
                {(balance.casino / 1e9).toFixed(3)} SOL
              </p>
            </div>

            {status && (
              <>
                <div className="mb-4">
                  <h3 className="font-bold mb-2">Your liquidity provider stats:</h3>
                  <p className="text-gray-300">
                    Liquidity provided: {(balance.token / 1e9).toFixed(3)} SOL
                  </p>
                  <p className="text-gray-300">
                    Your share of profits: {status?.profit_share.toFixed(3)} SOL
                  </p>
                </div>
                <div className="mb-4">
                  <h3 className="font-bold mb-2">Overall Kzyno status:</h3>
                  <p className="text-gray-300">
                    Total Liquidity: {(status.total_liquidity / 1e9).toFixed(3)} tokens
                  </p>
                  <p className="text-gray-300">
                    Vault Balance: {status.vault_balance.toFixed(3)} SOL
                  </p>
                  <p
                    className={`font-bold ${status.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}
                  >
                    Profit: {status.profit.toFixed(3)} SOL
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Play Game Section */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className={`text-xl font-bold mb-4 ${daydream.className}`}>Play Game</h2>

            <div className="mb-4">
              <label className="block text-gray-300 mb-2">
                Bet Amount ({KOINS_PER_SOL.toString()} Ⓚ = 1 SOL):
              </label>
              <span>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="w-full bg-gray-700 text-white p-2 rounded"
                  min="1"
                />
              </span>
            </div>

            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Multiplier:</label>
              <input
                type="number"
                value={multiplier}
                onChange={(e) => setMultiplier(Number(e.target.value))}
                className="w-full bg-gray-700 text-white p-2 rounded"
                min="2"
              />
            </div>

            <button
              onClick={handlePlay}
              disabled={loading || !casinoClient}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Play'}
            </button>

            {playResult && (
              <div className={`mt-4 p-4 rounded ${playResult.won ? 'bg-green-700' : 'bg-red-700'}`}>
                <p className="font-bold">{playResult.won ? 'You won!' : 'You lost!'}</p>
                <p>
                  {playResult.won
                    ? `Winnings: +${Math.round(playResult.amount_change * KOINS_PER_SOL)} tokens`
                    : `Loss: ${Math.round(playResult.amount_change * KOINS_PER_SOL)} tokens`}
                </p>
              </div>
            )}
          </div>

          {/* Liquidity Management Section */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className={`text-xl font-bold mb-4 ${daydream.className}`}>Liquidity Management</h2>
            <p className="text-gray-400 mb-4 text-md">
              Deposit or withdraw liquidity tokens to/from the casino. This SOL is used to provide
              liquidity to the casino, and they entitle you to a share of kzyno&apos;s profits.
            </p>

            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Deposit Amount (SOL):</label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(Number(e.target.value))}
                className="w-full bg-gray-700 text-white p-2 rounded"
                min="1"
              />
            </div>

            <button
              onClick={handleDeposit}
              disabled={loading || !casinoClient}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded disabled:opacity-50 mb-4"
            >
              {loading ? 'Processing...' : 'Deposit Liquidity'}
            </button>

            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Withdraw Amount (SOL):</label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                className="w-full bg-gray-700 text-white p-2 rounded"
                min="1"
              />
            </div>

            <button
              onClick={handleWithdraw}
              disabled={loading || !casinoClient}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Withdraw Liquidity + Profits!'}
            </button>
          </div>

          {/* Casino Balance Section */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className={`text-xl font-bold mb-4 ${daydream.className}`}>Casino Balance</h2>
            <p className="text-gray-400 mb-4 text-md">
              Deposit or withdraw SOL to/from your casino balance. This balance is used for playing
              games.
            </p>

            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Deposit Amount (SOL):</label>
              <input
                type="number"
                value={casinoDepositAmount}
                onChange={(e) => setCasinoDepositAmount(Number(e.target.value))}
                className="w-full bg-gray-700 text-white p-2 rounded"
                min="0.1"
                step="0.1"
              />
            </div>

            <button
              onClick={handleCasinoDeposit}
              disabled={loading || !casinoClient}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded disabled:opacity-50 mb-4"
            >
              {loading ? 'Processing...' : 'Deposit to Casino'}
            </button>

            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Withdraw Amount (SOL):</label>
              <input
                type="number"
                value={casinoWithdrawAmount}
                onChange={(e) => setCasinoWithdrawAmount(Number(e.target.value))}
                className="w-full bg-gray-700 text-white p-2 rounded"
                min="0.1"
                step="0.1"
              />
            </div>

            <button
              onClick={handleCasinoWithdraw}
              disabled={loading || !casinoClient}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Withdraw from Casino'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
