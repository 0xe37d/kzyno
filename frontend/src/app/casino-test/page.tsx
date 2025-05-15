'use client'

import { useState, useEffect } from 'react'
import { CasinoClient } from '@/lib/casino-client'
import Link from 'next/link'
import { Press_Start_2P } from 'next/font/google'
import dynamic from 'next/dynamic'
import { useAnchorWallet, useWallet } from '@solana/wallet-adapter-react'
import { Connection } from '@solana/web3.js'
import { MessageSignerWalletAdapter } from '@solana/wallet-adapter-base'
// Dynamically import the WalletMultiButton with SSR disabled
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
)

const pressStart2P = Press_Start_2P({ weight: '400', subsets: ['latin'] })

export default function CasinoTest() {
  const [casinoClient, setCasinoClient] = useState<CasinoClient | null>(null)
  const [balance, setBalance] = useState<[number, number, number]>([0, 0, 0])
  const [status, setStatus] = useState<{
    circulating_tokens: number
    vault_balance: string
    profit: number
  } | null>(null)
  const [betAmount, setBetAmount] = useState<number>(0.01)
  const [multiplier, setMultiplier] = useState<number>(2)
  const [playResult, setPlayResult] = useState<{ won: boolean; amount_change: number } | null>(null)
  const [depositAmount, setDepositAmount] = useState<number>(1000)
  const [withdrawAmount, setWithdrawAmount] = useState<number>(100)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const wallet = useAnchorWallet()
  const otherWallet = useWallet()
  const adapter = otherWallet.wallet?.adapter
  const [casinoDepositAmount, setCasinoDepositAmount] = useState<number>(0.1) // in SOL
  const [casinoWithdrawAmount, setCasinoWithdrawAmount] = useState<number>(0.1) // in SOL

  // Initialize casino client when wallet is connected
  useEffect(() => {
    const connection = new Connection('http://127.0.0.1:8899', 'confirmed')
    if (wallet && connection) {
      const client = new CasinoClient(connection, wallet, adapter as MessageSignerWalletAdapter)
      setCasinoClient(client)

      // Authenticate when wallet is connected
      client.authenticate().catch(console.error)
    } else {
      setCasinoClient(null)
    }
  }, [wallet, adapter])

  // Fetch balance when casino client is initialized
  useEffect(() => {
    const fetchBalance = async () => {
      if (casinoClient) {
        try {
          setLoading(true)
          const bal = await casinoClient.get_balance()
          setBalance(bal)
          setError(null)
        } catch (err) {
          console.error('Error fetching balance:', err)
          setError('Failed to fetch balance')
        } finally {
          setLoading(false)
        }
      }
    }

    fetchBalance()
  }, [casinoClient])

  // Fetch status when casino client is initialized
  useEffect(() => {
    const fetchStatus = async () => {
      if (casinoClient) {
        try {
          setLoading(true)
          const stat = await casinoClient.get_status()
          setStatus(stat)
          setError(null)
        } catch (err) {
          console.error('Error fetching status:', err)
          setError('Failed to fetch status')
        } finally {
          setLoading(false)
        }
      }
    }

    fetchStatus()
  }, [casinoClient])

  const handlePlay = async () => {
    if (!casinoClient) {
      setError('Casino client not initialized')
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
          <h1 className={`text-3xl font-bold ${pressStart2P.className}`}>Casino Test Page</h1>
          <div className="flex items-center gap-4">
            <WalletMultiButton />
            <Link href="/arcade" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">
              Back to Arcade
            </Link>
          </div>
        </div>

        {error && <div className="bg-red-600 text-white p-4 rounded mb-4">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Balance and Status Section */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className={`text-xl font-bold mb-4 ${pressStart2P.className}`}>Balance & Status</h2>

            <div className="mb-4">
              <p className="text-gray-300">SOL Balance: {balance[0] / 1e9} SOL</p>
              <p className="text-gray-300">Token Balance: {balance[1] / 1e9} tokens</p>
              <p className="text-gray-300">Casino Balance: {balance[2] / 1e9} SOL</p>
            </div>

            {status && (
              <div className="mb-4">
                <h3 className="font-bold mb-2">Casino Status:</h3>
                <p className="text-gray-300">
                  Circulating Tokens: {status.circulating_tokens / 1e9} tokens
                </p>
                <p className="text-gray-300">Vault Balance: {status.vault_balance}</p>
                <p
                  className={`font-bold ${status.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}
                >
                  Profit: {status.profit.toFixed(4)} SOL
                </p>
              </div>
            )}
          </div>

          {/* Play Game Section */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className={`text-xl font-bold mb-4 ${pressStart2P.className}`}>Play Game</h2>

            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Bet Amount (SOL):</label>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Number(e.target.value))}
                className="w-full bg-gray-700 text-white p-2 rounded"
                min="1"
              />
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
                    ? `Winnings: +${playResult.amount_change} tokens`
                    : `Loss: ${playResult.amount_change} tokens`}
                </p>
              </div>
            )}
          </div>

          {/* Liquidity Management Section */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className={`text-xl font-bold mb-4 ${pressStart2P.className}`}>
              Liquidity Management
            </h2>
            <p className="text-gray-400 mb-4 text-sm">
              Deposit or withdraw liquidity tokens to/from the casino. These tokens are used to
              provide liquidity to the casino.
            </p>

            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Deposit Amount (tokens):</label>
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
              <label className="block text-gray-300 mb-2">Withdraw Amount (tokens):</label>
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
              {loading ? 'Processing...' : 'Withdraw Liquidity'}
            </button>
          </div>

          {/* Casino Balance Section */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className={`text-xl font-bold mb-4 ${pressStart2P.className}`}>Casino Balance</h2>
            <p className="text-gray-400 mb-4 text-sm">
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
