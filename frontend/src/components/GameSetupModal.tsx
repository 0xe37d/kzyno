'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useCasino } from '@/contexts/CasinoContext'
import { Balance } from '@/lib/casino-client'
import { KOINS_PER_SOL } from '@/lib/constants'
import { daydream } from '@/app/fonts'
import dynamic from 'next/dynamic'

// Dynamically import the WalletMultiButton with SSR disabled
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
)

interface GameSetupModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function GameSetupModal({ isOpen, onClose }: GameSetupModalProps) {
  const { connected } = useWallet()
  const { casinoClient, cluster } = useCasino()
  const [balance, setBalance] = useState<Balance>({ sol: 0, token: 0, casino: 0 })
  const [casinoDepositAmount, setCasinoDepositAmount] = useState<number>(0.1)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Check if user is on devnet
  const isDevnet = cluster?.includes('devnet')

  // Fetch balance when casino client is initialized
  useEffect(() => {
    if (!casinoClient || !connected) return
    const fetchBalance = async () => {
      try {
        const bal = await casinoClient.get_balance()
        setBalance(bal)
      } catch (err) {
        console.error('Error fetching balance:', err)
      }
    }
    fetchBalance()
  }, [casinoClient, connected])

  // Helper functions to determine user state
  const hasSol = balance.sol > 0
  const hasCasinoBalance = balance.casino > 0

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

      // Close modal after successful deposit
      onClose()
    } catch (err) {
      console.error('Error depositing to casino:', err)
      setError('Failed to deposit to casino')
    } finally {
      setLoading(false)
    }
  }

  const handleGetSol = () => {
    if (isDevnet) {
      window.open('https://faucet.solana.com/', '_blank')
    } else {
      window.open(
        'https://crypto.link.com/?ref=lb&source_amount=20&source_currency=usd&destination_currency=sol&destination_network=solana',
        '_blank'
      )
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-purple-500/30 rounded-2xl max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-xl">🎮</span>
              </div>
              <div>
                <h2 className={`text-xl font-bold text-white ${daydream.className}`}>
                  Ready to Play?
                </h2>
                <p className="text-purple-200 text-sm">Let&apos;s get you set up</p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={!connected || !hasSol || !hasCasinoBalance}
              className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          {error && (
            <div className="bg-red-600/20 border border-red-500/30 text-red-200 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Wallet not connected */}
          {!connected && (
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔗</span>
              </div>
              <h3 className={`text-lg font-bold text-white mb-2 ${daydream.className}`}>
                Connect Your Wallet
              </h3>
              <p className="text-gray-300 text-sm mb-6">
                Connect your Solana wallet to start playing games
              </p>
              <WalletMultiButton className="!bg-gradient-to-r !from-purple-500 !to-pink-500 !hover:from-purple-400 !hover:to-pink-400 !text-white !font-bold !py-3 !px-6 !text-base !rounded-lg" />
            </div>
          )}

          {/* Wallet connected but no SOL */}
          {connected && !hasSol && (
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className={`text-lg font-bold text-white mb-2 ${daydream.className}`}>
                Get Some SOL
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                You need SOL to play games. Get some from the faucet or buy it.
              </p>
              <div className="text-xs text-gray-400 mb-6">
                <p>Your SOL Balance: {(balance.sol / 1e9).toFixed(3)} SOL</p>
              </div>
              <button
                onClick={handleGetSol}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
              >
                {isDevnet ? '🚀 Get Free SOL' : '💳 Buy SOL'}
              </button>
            </div>
          )}

          {/* Has SOL but no casino balance */}
          {connected && hasSol && !hasCasinoBalance && (
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className={`text-lg font-bold text-white mb-2 ${daydream.className}`}>
                Deposit to Play
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                Deposit some SOL to your casino balance to start playing
              </p>
              <div className="text-xs text-gray-400 mb-4">
                <p>Your SOL Balance: {(balance.sol / 1e9).toFixed(3)} SOL</p>
              </div>

              <div className="mb-4">
                <label className="block text-gray-300 text-sm mb-2">Deposit Amount (SOL):</label>
                <input
                  type="number"
                  value={casinoDepositAmount}
                  onChange={(e) => setCasinoDepositAmount(Number(e.target.value))}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg text-center"
                  min="0.1"
                  step="0.1"
                />
              </div>

              <button
                onClick={handleCasinoDeposit}
                disabled={loading || !casinoClient}
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-400 hover:to-blue-400 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 transition-all duration-300"
              >
                {loading ? 'Processing...' : 'Deposit & Play'}
              </button>

              <div className="mt-3">
                <button
                  onClick={handleGetSol}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
                >
                  {isDevnet ? '🚀 Get More Free SOL' : '💳 Buy More SOL'}
                </button>
              </div>
            </div>
          )}

          {/* Everything is ready */}
          {connected && hasSol && hasCasinoBalance && (
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎉</span>
              </div>
              <h3 className={`text-lg font-bold text-white mb-2 ${daydream.className}`}>
                You&apos;re All Set!
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                Your casino balance is ready. Let&apos;s play some games!
              </p>
              <div className="text-xs text-gray-400 mb-6">
                <p>Casino Balance: {((balance.casino / 1e9) * KOINS_PER_SOL).toFixed(3)} Koins</p>
              </div>
              <button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-green-500 to-purple-500 hover:from-green-400 hover:to-purple-400 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
              >
                Start Playing
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
