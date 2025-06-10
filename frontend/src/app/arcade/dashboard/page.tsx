'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { daydream } from '../../fonts'
import dynamic from 'next/dynamic'
import { useCasino } from '@/contexts/CasinoContext'
import { KOINS_PER_SOL } from '@/lib/constants'
import { Balance } from '@/lib/casino-client'
import Image from 'next/image'
import SettingsMenu from '@/components/SettingsMenu'
import { useWallet } from '@solana/wallet-adapter-react'

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
  const [showDevnetHelp, setShowDevnetHelp] = useState<boolean>(false)
  const { casinoClient, cluster } = useCasino()
  const { connected } = useWallet()

  // Check if user is on devnet
  const isDevnet = cluster?.includes('devnet')

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

  // Helper functions to determine user state
  const hasSol = balance.sol > 0
  const hasCasinoBalance = balance.casino > 0
  // const hasLiquidity = balance.token > 0

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

  // Wallet not connected state
  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-8">
        <SettingsMenu />
        <div className="text-center max-w-md mx-auto">
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">🎮</span>
            </div>
            <h1 className={`text-4xl font-bold mb-4 ${daydream.className}`}>Welcome to Kzyno</h1>
            <p className="text-gray-300 text-lg mb-8">
              Connect your wallet to start playing and earning
            </p>
          </div>

          <div className="mb-6">
            <WalletMultiButton className="!bg-gradient-to-r !from-purple-500 !to-pink-500 !hover:from-purple-400 !hover:to-pink-400 !text-white !font-bold !py-4 !px-8 !text-lg !rounded-xl" />
          </div>

          <Link
            href="/arcade"
            className={`text-purple-400 hover:text-purple-300 transition-colors ${daydream.className} text-lg`}
          >
            ← Back to Arcade
          </Link>
        </div>
      </div>
    )
  }

  // No SOL and no casino balance state
  if (!hasSol && !hasCasinoBalance) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <SettingsMenu />
        <div className="max-w-2xl mx-auto">
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

          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">💰</span>
            </div>
            <h2 className={`text-3xl font-bold mb-4 ${daydream.className}`}>Get Started</h2>
            <p className="text-gray-300 text-lg mb-8">
              You need some SOL to start playing. Get devnet SOL from the faucet to begin! Make sure
              you copy your wallet address above.
            </p>

            {isDevnet ? (
              <Link
                href="https://faucet.solana.com/"
                target="_blank"
                className="inline-block px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-xl rounded-xl hover:from-purple-400 hover:to-pink-400 transition-all duration-300 mb-6"
              >
                🚀 Get Free SOL
              </Link>
            ) : (
              <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-xl p-6 mb-6">
                <p className="text-yellow-200">
                  You&apos;re on mainnet. You&apos;ll need to deposit real SOL to play.
                </p>
              </div>
            )}

            <div className="text-sm text-gray-400">
              <p>Your SOL Balance: {(balance.sol / 1e9).toFixed(3)} SOL</p>
              <p>
                Your Casino Balance: {((balance.casino / 1e9) * KOINS_PER_SOL).toFixed(3)} Koins
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Has SOL but no casino balance - prioritize casino deposit
  if (hasSol && !hasCasinoBalance) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <SettingsMenu />
        <div className="max-w-2xl mx-auto">
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

          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">🎯</span>
            </div>
            <h2 className={`text-3xl font-bold mb-4 ${daydream.className}`}>Ready to Play!</h2>
            <p className="text-gray-300 text-lg mb-6">
              Deposit some SOL to your casino balance to start playing games
            </p>
            <div className="text-sm text-gray-400 mb-6">
              <p>Your SOL Balance: {(balance.sol / 1e9).toFixed(3)} SOL</p>
            </div>
          </div>

          {/* Casino Deposit Section - Prominent */}
          <div className="bg-gradient-to-br from-green-900/50 to-blue-900/50 border border-green-500/30 rounded-xl p-6 mb-6">
            <h3 className={`text-xl font-bold mb-4 text-center ${daydream.className}`}>
              Deposit to Casino Balance
            </h3>
            <p className="text-gray-300 mb-4 text-center">
              Deposit SOL to your casino balance to start playing games
            </p>

            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Deposit Amount (SOL):</label>
              <input
                type="number"
                value={casinoDepositAmount}
                onChange={(e) => setCasinoDepositAmount(Number(e.target.value))}
                className="w-full bg-gray-700 text-white p-3 rounded-lg text-lg"
                min="0.1"
                step="0.1"
              />
            </div>

            <button
              onClick={handleCasinoDeposit}
              disabled={loading || !casinoClient}
              className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-400 hover:to-blue-400 text-white py-4 rounded-lg disabled:opacity-50 font-bold text-lg"
            >
              {loading ? 'Processing...' : 'Deposit to Casino'}
            </button>
          </div>

          {/* Optional: Show liquidity option as secondary */}
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-4">
              Want to earn from other players? Provide liquidity instead
            </p>
            <button
              onClick={() =>
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
              }
              className="text-purple-400 hover:text-purple-300 underline"
            >
              Learn about liquidity providing
            </button>
          </div>

          {/* Liquidity Section - Secondary */}
          <div className="mt-12 bg-gray-800 p-6 rounded-lg">
            <h3 className={`text-xl font-bold mb-4 ${daydream.className}`}>
              Provide Liquidity (Optional)
            </h3>
            <p className="text-gray-400 mb-4 text-sm">
              Deposit liquidity to earn a share of the casino&apos;s profits
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Provide Liquidity'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Normal dashboard state - user has casino balance
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <SettingsMenu />
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

        {/* Devnet Help Hint */}
        {isDevnet && (
          <div className="mb-6 bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/30 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-lg">🚀</span>
                </div>
                <div>
                  <h3 className={`text-lg font-bold text-white ${daydream.className}`}>
                    You&apos;re on Devnet!
                  </h3>
                  <p className="text-purple-200 text-sm">Aidrop some SOL to your wallet to play.</p>
                </div>
              </div>
              <Link
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-400 hover:to-pink-400 transition-all duration-300 font-medium"
                href="https://faucet.solana.com/"
                target="_blank"
              >
                Get SOL
              </Link>
            </div>
          </div>
        )}

        {error && <div className="bg-red-600 text-white p-4 rounded mb-4">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Play Game Section - Most Prominent */}
          <div className="bg-gradient-to-br from-green-900/50 to-purple-900/50 border border-green-500/30 p-6 rounded-lg">
            <h2 className={`text-xl font-bold mb-4 ${daydream.className}`}>🎮 Play Game</h2>

            <div className="mb-4">
              <label className="block text-gray-300 mb-2">
                Bet Amount ({KOINS_PER_SOL.toString()} KZY = 1 SOL):
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
              className="w-full bg-gradient-to-r from-green-500 to-purple-500 hover:from-green-400 hover:to-purple-400 text-white py-3 rounded font-bold disabled:opacity-50"
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

          {/* Casino Balance Management */}
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
        </div>
      </div>

      {/* Devnet Setup Guide Modal */}
      {showDevnetHelp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-purple-500/30 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-xl">🚀</span>
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold text-white ${daydream.className}`}>
                      Enable Devnet in Phantom Wallet
                    </h2>
                    <p className="text-purple-200">
                      Follow these steps to enable devnet transactions
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDevnetHelp(false)}
                  className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                >
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Step 1 */}
                <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl p-4 border border-white/10">
                  <h3 className={`text-lg font-bold text-white mb-3 ${daydream.className}`}>
                    Step 1: Open Settings
                  </h3>
                  <div className="aspect-video bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                    <Image
                      src="/phantom-step1.png"
                      alt="Open Phantom Settings"
                      width={300}
                      height={200}
                      className="rounded-lg object-contain"
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                    />
                  </div>
                  <p className="text-gray-300 text-sm">
                    Click the settings icon in your Phantom wallet to access developer options.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl p-4 border border-white/10">
                  <h3 className={`text-lg font-bold text-white mb-3 ${daydream.className}`}>
                    Step 2: Find Developer Settings
                  </h3>
                  <div className="aspect-video bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                    <Image
                      src="/phantom-step2.png"
                      alt="Find Developer Settings"
                      width={300}
                      height={200}
                      className="rounded-lg object-contain"
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                    />
                  </div>
                  <p className="text-gray-300 text-sm">
                    Scroll down to find the &quot;Developer Settings&quot; or &quot;Advanced&quot;
                    section.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl p-4 border border-white/10">
                  <h3 className={`text-lg font-bold text-white mb-3 ${daydream.className}`}>
                    Step 3: Change Network
                  </h3>
                  <div className="aspect-video bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                    <Image
                      src="/phantom-step3.png"
                      alt="Change Network to Devnet"
                      width={300}
                      height={200}
                      className="rounded-lg object-contain"
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                    />
                  </div>
                  <p className="text-gray-300 text-sm">
                    Select &quot;Devnet&quot; from the network dropdown menu instead of
                    &quot;Mainnet&quot;.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl p-4 border border-white/10">
                  <h3 className={`text-lg font-bold text-white mb-3 ${daydream.className}`}>
                    Step 4: Confirm & Test
                  </h3>
                  <div className="aspect-video bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                    <Image
                      src="/phantom-step4.png"
                      alt="Confirm Devnet Setup"
                      width={300}
                      height={200}
                      className="rounded-lg object-contain"
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                    />
                  </div>
                  <p className="text-gray-300 text-sm">
                    Reconnect your wallet to the site. You should now see &quot;Devnet&quot; in your
                    wallet.
                  </p>
                </div>
              </div>

              {/* Additional Info */}
              <div className="mt-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
                <h3 className={`text-lg font-bold text-white mb-2 ${daydream.className}`}>
                  💡 Pro Tip
                </h3>
                <p className="text-gray-300 text-sm">
                  You can get free devnet SOL from the{' '}
                  <a
                    href="https://faucet.solana.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 underline"
                  >
                    Solana Faucet
                  </a>{' '}
                  to test games. Remember to switch back to Mainnet when you&apos;re done testing!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
