'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { daydream } from '../../fonts'
import { useCasino } from '@/contexts/CasinoContext'
import { CasinoClient } from '@/lib/casino-client'

type CoinSide = 'heads' | 'tails'

interface CoinFlipResult {
  result: CoinSide
  won: boolean
}

export default function CoinFlip() {
  const { casinoClient, isConnected } = useCasino()
  const [balance, setBalance] = useState(0)
  const [betAmount, setBetAmount] = useState(10)
  const [selectedSide, setSelectedSide] = useState<CoinSide | null>(null)
  const [isFlipping, setIsFlipping] = useState(false)
  const [flipResult, setFlipResult] = useState<CoinFlipResult | null>(null)
  const [coinRotation, setCoinRotation] = useState(0)
  const [currentSide, setCurrentSide] = useState<CoinSide>('heads')
  const flipIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Audio refs
  const coinAudioRef = useRef<HTMLAudioElement | null>(null)
  const goodAudioRef = useRef<HTMLAudioElement | null>(null)
  const badAudioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio elements
  useEffect(() => {
    coinAudioRef.current = new Audio('/audio/coin.mp3')
    goodAudioRef.current = new Audio('/audio/good.mp3')
    badAudioRef.current = new Audio('/audio/bad.mp3')

    // Set audio properties
    if (coinAudioRef.current) {
      coinAudioRef.current.loop = true
      coinAudioRef.current.volume = 0.6
      coinAudioRef.current.playbackRate = 0.5 // Slow down to half speed
    }
    if (goodAudioRef.current) {
      goodAudioRef.current.volume = 0.8
    }
    if (badAudioRef.current) {
      badAudioRef.current.volume = 0.8
    }

    // Cleanup function
    return () => {
      if (coinAudioRef.current) {
        coinAudioRef.current.pause()
        coinAudioRef.current = null
      }
      if (goodAudioRef.current) {
        goodAudioRef.current.pause()
        goodAudioRef.current = null
      }
      if (badAudioRef.current) {
        badAudioRef.current.pause()
        badAudioRef.current = null
      }
    }
  }, [])

  const fetchBalance = async (casinoClient: CasinoClient) => {
    try {
      const koins = await casinoClient.get_koins()
      setBalance(koins)
    } catch (error) {
      console.error('Error fetching balance:', error)
    }
  }

  useEffect(() => {
    if (!casinoClient || !isConnected) return
    fetchBalance(casinoClient)
  }, [casinoClient, isConnected])

  const handleFlip = async () => {
    if (!selectedSide || !casinoClient || isFlipping || balance < betAmount) return

    setIsFlipping(true)
    setFlipResult(null)

    try {
      // Place bet with casino client
      const result = await casinoClient.play(betAmount, 2) // 2x multiplier for coinflip

      // Debit bet amount
      setBalance((prev) => prev - betAmount)

      // Determine coin result based on server response
      const coinResult: CoinSide = result.won
        ? selectedSide
        : selectedSide === 'heads'
          ? 'tails'
          : 'heads'

      // Animate coin flip on X axis - start immediately with smooth rotation
      const flipDuration = 2000 // 2 seconds
      const baseRotations = 6 // Base number of full rotations
      const randomExtra = Math.floor(Math.random() * 3) // 0-2 extra rotations for variety

      // Calculate final rotation to land flat on correct side
      // Heads = 0° (flat), Tails = 180° (flipped)
      const finalPosition = coinResult === 'heads' ? 0 : 180
      const totalRotation = (baseRotations + randomExtra) * 360 + finalPosition

      // Start playing coin flip audio
      try {
        if (coinAudioRef.current) {
          coinAudioRef.current.currentTime = 0 // Reset to beginning
          await coinAudioRef.current.play()
        }
      } catch (error) {
        console.log('Coin audio play failed:', error) // Some browsers block autoplay
      }

      // Cubic bezier function matching CSS: cubic-bezier(0.25, 0.46, 0.45, 0.94)
      const cubicBezier = (t: number) => {
        const q0 = 0,
          q1 = 0.46,
          q2 = 0.94,
          q3 = 1

        const u = 1 - t
        const tt = t * t
        const uu = u * u
        const uuu = uu * u
        const ttt = tt * t

        const y = uuu * q0 + 3 * uu * t * q1 + 3 * u * tt * q2 + ttt * q3

        return y // Return the eased progress
      }

      // Start synchronized visual flipping
      const startTime = Date.now()
      const updateInterval = 16 // ~60fps

      flipIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime
        const progress = elapsed / flipDuration
        const easedProgress = cubicBezier(progress)

        // Calculate current rotation based on eased progress
        const currentRotation = easedProgress * totalRotation

        // Determine which side should be showing based on current rotation
        const normalizedRotation = currentRotation % 360
        const shouldShowTails = normalizedRotation > 90 && normalizedRotation < 270

        setCurrentSide(shouldShowTails ? 'tails' : 'heads')

        if (progress >= 1) {
          if (flipIntervalRef.current) {
            clearInterval(flipIntervalRef.current)
          }
        }
      }, updateInterval)

      // Start rotation immediately
      setCoinRotation(totalRotation)

      setTimeout(() => {
        // Stop the visual flipping
        if (flipIntervalRef.current) {
          clearInterval(flipIntervalRef.current)
        }

        // Stop coin flip audio
        if (coinAudioRef.current) {
          coinAudioRef.current.pause()
        }

        // Set final side based on result
        setCurrentSide(coinResult)

        // Only set the result AFTER the animation completes
        setFlipResult({
          result: coinResult,
          won: result.won,
        })

        // Credit winnings if won and play appropriate audio
        if (result.won) {
          setBalance((prev) => prev + betAmount * 2)
          // Play win audio
          try {
            if (goodAudioRef.current) {
              goodAudioRef.current.currentTime = 0
              goodAudioRef.current.play()
            }
          } catch (error) {
            console.log('Win audio play failed:', error)
          }
        } else {
          // Play loss audio
          try {
            if (badAudioRef.current) {
              badAudioRef.current.currentTime = 0
              badAudioRef.current.play()
            }
          } catch (error) {
            console.log('Loss audio play failed:', error)
          }
        }

        setIsFlipping(false)
      }, flipDuration)
    } catch (error) {
      console.error('Error placing bet:', error)
      setIsFlipping(false)
    }
  }

  const resetGame = () => {
    setFlipResult(null)
    setCoinRotation(0)
    setCurrentSide('heads')
    if (flipIntervalRef.current) {
      clearInterval(flipIntervalRef.current)
    }
  }

  // Add wallet connection check
  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#1a472a]">
        <h1 className={`text-2xl text-white mb-4 ${daydream.className}`}>
          Please connect your wallet to play
        </h1>
      </div>
    )
  }

  if (balance === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#1a472a]">
        <h1 className={`text-2xl text-white mb-4 ${daydream.className}`}>
          Deposit some SOL in the{' '}
          <Link href="/arcade/dashboard" className="text-pink-200 hover:text-pink-300">
            casino
          </Link>{' '}
          to play
        </h1>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#1a472a] relative overflow-hidden">
      {/* Casino-style decorative elements */}
      <div
        className="absolute inset-0 bg-[url('/game/felt.jpg')] opacity-20"
        style={{ backgroundRepeat: 'repeat', backgroundSize: '200px' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />

      {/* Decorative corner elements */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-[#ffd700]/5 rounded-br-full" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffd700]/5 rounded-bl-full" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#ffd700]/5 rounded-tr-full" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-[#ffd700]/5 rounded-tl-full" />

      <nav className="fixed top-0 right-0 p-4 md:p-6 z-10">
        <div className="flex gap-4">
          <Link
            href="/arcade"
            className={`text-lg md:text-xl text-white hover:text-pink-200 transition-colors ${daydream.className}`}
          >
            Back to Arcade
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-4 relative">
        {/* Game Title / Result */}
        <div className="mb-8 text-center h-32 md:h-40 flex flex-col justify-center">
          {flipResult && !isFlipping ? (
            <div>
              <h1
                className={`text-3xl md:text-5xl text-white mb-2 text-center ${daydream.className}`}
              >
                Result: {flipResult.result.toUpperCase()}
              </h1>
              {flipResult.won ? (
                <div className="text-center">
                  <p
                    className={`text-2xl md:text-3xl text-[#ffd700] font-bold ${daydream.className}`}
                  >
                    YOU WIN!
                  </p>
                  <p className={`text-xl md:text-2xl text-white ${daydream.className}`}>
                    + {betAmount * 2}
                  </p>
                </div>
              ) : (
                <p className={`text-xl md:text-2xl text-red-400 ${daydream.className}`}>
                  Better luck next time!
                </p>
              )}
            </div>
          ) : (
            <h1 className={`text-4xl md:text-6xl text-[#ffd700] text-center ${daydream.className}`}>
              Coin Flip
            </h1>
          )}
        </div>

        {/* Balance Display */}
        <div className="mb-8">
          <p className={`text-xl md:text-2xl text-white font-bold text-center`}>
            Balance: {balance}
          </p>
        </div>

        {/* Coin Display */}
        <div className="relative mb-8">
          <div
            className={`w-48 h-48 md:w-64 md:h-64 rounded-full border-4 border-[#ffd700] bg-gradient-to-br from-[#ffd700] to-[#ffed4e] flex items-center justify-center text-6xl md:text-8xl ${daydream.className}`}
            style={{
              transform: `rotateX(${coinRotation}deg)`,
              transition: isFlipping ? 'transform 2s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
              boxShadow: '0 10px 30px rgba(255, 215, 0, 0.3)',
              transformStyle: 'preserve-3d',
            }}
          >
            <span
              className="text-black"
              style={{
                transform: flipResult && flipResult.result === 'tails' ? 'rotateX(180deg)' : 'none',
              }}
            >
              {currentSide === 'heads' ? 'H' : 'T'}
            </span>
          </div>
        </div>

        {/* Game Controls */}
        <div className="w-full max-w-2xl bg-black/20 rounded-lg p-4 md:p-6 border border-[#ffd700]/10">
          <div className="flex flex-col items-center gap-4 md:gap-6">
            {/* Side Selection */}
            <div className="flex gap-4 md:gap-8">
              <button
                onClick={() => setSelectedSide('heads')}
                disabled={isFlipping}
                className={`px-6 py-4 rounded-lg text-lg md:text-xl font-bold transition-all ${
                  selectedSide === 'heads'
                    ? 'bg-[#ffd700] text-black scale-105'
                    : isFlipping
                      ? 'bg-gray-500 cursor-not-allowed text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white hover:scale-105'
                } ${daydream.className}`}
              >
                HEADS
              </button>
              <button
                onClick={() => setSelectedSide('tails')}
                disabled={isFlipping}
                className={`px-6 py-4 rounded-lg text-lg md:text-xl font-bold transition-all ${
                  selectedSide === 'tails'
                    ? 'bg-[#ffd700] text-black scale-105'
                    : isFlipping
                      ? 'bg-gray-500 cursor-not-allowed text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white hover:scale-105'
                } ${daydream.className}`}
              >
                TAILS
              </button>
            </div>

            {/* Bet Amount */}
            <div className="flex gap-4 items-center">
              <label className={`text-white text-lg ${daydream.className}`}>Bet Amount:</label>
              <input
                type="number"
                min="1"
                max={balance}
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={isFlipping}
                className="w-24 px-3 py-2 bg-white/10 text-white rounded border border-[#ffd700]/20 focus:outline-none focus:border-[#ffd700]/40 disabled:opacity-50"
              />
            </div>

            {/* Payout Info */}
            <p className={`text-white/80 text-center ${daydream.className}`}>
              Win: 2x your bet ({betAmount * 2})
            </p>

            {/* Action Buttons */}
            <div className="flex gap-4">
              {!flipResult ? (
                <button
                  onClick={handleFlip}
                  disabled={!selectedSide || isFlipping || balance < betAmount}
                  className={`px-8 py-3 rounded-lg text-xl font-bold transition-all ${
                    !selectedSide || isFlipping || balance < betAmount
                      ? 'bg-gray-500 cursor-not-allowed text-white'
                      : 'bg-[#ffd700] hover:bg-[#ffd700]/90 text-black hover:scale-105'
                  } ${daydream.className}`}
                >
                  {isFlipping ? 'FLIPPING...' : 'FLIP COIN!'}
                </button>
              ) : (
                <button
                  onClick={() => {
                    resetGame()
                  }}
                  className={`px-8 py-3 rounded-lg text-xl font-bold bg-[#ffd700] hover:bg-[#ffd700]/90 text-black transition-all hover:scale-105 ${daydream.className}`}
                >
                  PLAY AGAIN
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Winner Animation Styles */}
      <style jsx>{`
        @keyframes win-bounce {
          0% {
            transform: scale(0) rotateY(0deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.2) rotateY(180deg);
            opacity: 1;
          }
          100% {
            transform: scale(1) rotateY(360deg);
            opacity: 1;
          }
        }

        .animate-win-bounce {
          animation: win-bounce 1s cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>
    </div>
  )
}
