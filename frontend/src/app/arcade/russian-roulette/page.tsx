'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { daydream } from '../../fonts'
import Image from 'next/image'
import { useCasino } from '@/contexts/CasinoContext'
import { CasinoClient } from '@/lib/casino-client'

type GameResult = 'survived' | 'dead' | null

interface RouletteResult {
  result: GameResult
  won: boolean
}

export default function RussianRoulette() {
  const { casinoClient, isConnected } = useCasino()
  const [balance, setBalance] = useState(0)
  const [betAmount, setBetAmount] = useState(10)
  const [isPlaying, setIsPlaying] = useState(false)
  const [gameResult, setGameResult] = useState<RouletteResult | null>(null)
  const [currentImage, setCurrentImage] = useState('standing')
  const [showMuzzleFlash, setShowMuzzleFlash] = useState(false)

  // Audio refs
  const spinAudioRef = useRef<HTMLAudioElement | null>(null)
  const shotAudioRef = useRef<HTMLAudioElement | null>(null)
  const emptyAudioRef = useRef<HTMLAudioElement | null>(null)
  const goodAudioRef = useRef<HTMLAudioElement | null>(null)
  const badAudioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio elements
  useEffect(() => {
    spinAudioRef.current = new Audio('/audio/spin.mp3')
    shotAudioRef.current = new Audio('/audio/shot.mp3')
    emptyAudioRef.current = new Audio('/audio/empty.mp3')
    goodAudioRef.current = new Audio('/audio/good.mp3')
    badAudioRef.current = new Audio('/audio/bad.mp3')

    // Set audio properties
    if (spinAudioRef.current) {
      spinAudioRef.current.volume = 0.6
      spinAudioRef.current.loop = true
    }
    if (shotAudioRef.current) {
      shotAudioRef.current.volume = 0.7
    }
    if (emptyAudioRef.current) {
      emptyAudioRef.current.volume = 0.7
    }
    if (goodAudioRef.current) {
      goodAudioRef.current.volume = 0.8
    }
    if (badAudioRef.current) {
      badAudioRef.current.volume = 0.8
    }

    // Cleanup function
    return () => {
      if (spinAudioRef.current) {
        spinAudioRef.current.pause()
        spinAudioRef.current = null
      }
      if (shotAudioRef.current) {
        shotAudioRef.current.pause()
        shotAudioRef.current = null
      }
      if (emptyAudioRef.current) {
        emptyAudioRef.current.pause()
        emptyAudioRef.current = null
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

  const handlePlay = async () => {
    if (!casinoClient || isPlaying || balance < betAmount) return

    setIsPlaying(true)
    setGameResult(null)
    setCurrentImage('standing')
    setShowMuzzleFlash(false)

    try {
      // Place bet with casino client (6x multiplier for Russian Roulette)
      const result = await casinoClient.play(betAmount, 6)

      // Debit bet amount
      setBalance((prev) => prev - betAmount)

      // Determine game result - player wins if guy survives (1/6 chance)
      const gameOutcome: GameResult = result.won ? 'survived' : 'dead'

      // Start playing cylinder spin sound during suspense
      try {
        if (spinAudioRef.current) {
          spinAudioRef.current.currentTime = 0
          spinAudioRef.current.play()
        }
      } catch (error) {
        console.log('Spin audio play failed:', error)
      }

      // Dramatic pause before shot
      setTimeout(() => {
        // Stop spin sound
        if (spinAudioRef.current) {
          spinAudioRef.current.pause()
        }

        // Play appropriate gun sound based on outcome
        try {
          if (gameOutcome === 'dead') {
            // Gun fires - play shot sound
            if (shotAudioRef.current) {
              shotAudioRef.current.currentTime = 0
              shotAudioRef.current.play()
            }
          } else {
            // Gun is empty - play empty chamber sound
            if (emptyAudioRef.current) {
              emptyAudioRef.current.currentTime = 0
              emptyAudioRef.current.play()
            }
          }
        } catch (error) {
          console.log('Gun audio play failed:', error)
        }

        // Show muzzle flash effect only if shot fired
        if (gameOutcome === 'dead') {
          setShowMuzzleFlash(true)
        }

        // After flash/click, show result
        setTimeout(() => {
          setShowMuzzleFlash(false)

          // If dead, show kills animation first, then dead image
          if (gameOutcome === 'dead') {
            setCurrentImage('kills')

            // After kills animation, show dead image
            setTimeout(() => {
              setCurrentImage('dead')
            }, 500) // Duration of kills animation
          } else {
            // If survived, just show standing (no change needed)
            setCurrentImage('standing')
          }

          setGameResult({
            result: gameOutcome,
            won: result.won,
          })

          // Play result audio and handle winnings
          setTimeout(() => {
            if (result.won) {
              setBalance((prev) => prev + betAmount * 6)
              try {
                if (goodAudioRef.current) {
                  goodAudioRef.current.currentTime = 0
                  goodAudioRef.current.play()
                }
              } catch (error) {
                console.log('Win audio play failed:', error)
              }
            } else {
              try {
                if (badAudioRef.current) {
                  badAudioRef.current.currentTime = 0
                  badAudioRef.current.play()
                }
              } catch (error) {
                console.log('Loss audio play failed:', error)
              }
            }
          }, 1000) // Delay for dramatic effect

          setIsPlaying(false)
        }, 200) // Muzzle flash duration
      }, 2000) // Initial suspense delay
    } catch (error) {
      console.error('Error placing bet:', error)
      // Stop spin sound on error
      if (spinAudioRef.current) {
        spinAudioRef.current.pause()
      }
      setIsPlaying(false)
    }
  }

  const resetGame = () => {
    setGameResult(null)
    setCurrentImage('standing')
    setShowMuzzleFlash(false)
  }

  // Add wallet connection check
  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#1a1a1a]">
        <h1 className={`text-2xl text-white mb-4 ${daydream.className}`}>
          Please connect your wallet to play
        </h1>
      </div>
    )
  }

  if (balance === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#1a1a1a]">
        <h1 className={`text-2xl text-white mb-4 ${daydream.className}`}>
          Deposit some SOL in the{' '}
          <Link href="/arcade/dashboard" className="text-red-200 hover:text-red-300">
            casino
          </Link>{' '}
          to play
        </h1>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-black via-red-900/20 to-black relative overflow-hidden">
      {/* Dark atmospheric background */}
      <div className="absolute inset-0 bg-[url('/game/dark-texture.jpg')] opacity-10" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent" />

      {/* Flickering light effect */}
      <div className="absolute inset-0 bg-red-500/5 animate-pulse" />

      <nav className="fixed top-0 right-0 p-4 md:p-6 z-10">
        <div className="flex gap-4">
          <Link
            href="/arcade"
            className={`text-lg md:text-xl text-white hover:text-red-200 transition-colors ${daydream.className}`}
          >
            Back to Arcade
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-4 relative">
        {/* Game Title / Result */}
        <div className="mb-8 text-center h-32 md:h-40 flex flex-col justify-center">
          {gameResult && !isPlaying ? (
            <div>
              <h1
                className={`text-3xl md:text-5xl text-white mb-2 text-center ${daydream.className}`}
              >
                {gameResult.result === 'survived' ? 'HE SURVIVED!' : "HE'S DEAD..."}
              </h1>
              {gameResult.won ? (
                <div className="text-center">
                  <p
                    className={`text-2xl md:text-3xl text-green-400 font-bold ${daydream.className}`}
                  >
                    YOU WIN!
                  </p>
                  <p className={`text-xl md:text-2xl text-white ${daydream.className}`}>
                    + {betAmount * 6}
                  </p>
                </div>
              ) : (
                <p className={`text-xl md:text-2xl text-red-400 ${daydream.className}`}>
                  Better luck next time...
                </p>
              )}
            </div>
          ) : (
            <h1 className={`text-4xl md:text-6xl text-red-500 text-center ${daydream.className}`}>
              Russian Roulette
            </h1>
          )}
        </div>

        {/* Balance Display */}
        <div className="mb-8">
          <p className={`text-xl md:text-2xl text-white font-bold text-center`}>
            Balance: {balance}
          </p>
        </div>

        {/* Game Display */}
        <div className="relative mb-8">
          <div className="w-64 h-96 md:w-80 md:h-[480px] relative">
            {/* Muzzle Flash Effect */}
            {showMuzzleFlash && (
              <div className="absolute inset-0 bg-yellow-300 rounded-lg animate-ping z-20" />
            )}

            {/* Character Image */}
            <div className="relative w-full h-full">
              <Image
                src={`/game/${currentImage === 'kills' ? 'kills.webp' : `${currentImage}.png`}`}
                alt="Russian Roulette Character"
                fill
                className="object-contain drop-shadow-2xl"
                priority
              />
            </div>
          </div>
        </div>

        {/* Game Controls */}
        <div className="w-full max-w-2xl bg-black/40 rounded-lg p-4 md:p-6 border border-red-500/20 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 md:gap-6">
            {/* Warning */}
            <div className="text-center">
              <p className={`text-red-400 text-lg md:text-xl font-bold ${daydream.className}`}>
                ⚠️ DANGER ZONE ⚠️
              </p>
              <p className="text-red-200 text-sm">
                1 in 6 chance of survival • 6x payout if he lives
              </p>
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
                disabled={isPlaying}
                className="w-24 px-3 py-2 bg-white/10 text-white rounded border border-red-500/20 focus:outline-none focus:border-red-500/40 disabled:opacity-50"
              />
            </div>

            {/* Payout Info */}
            <p className={`text-white/80 text-center ${daydream.className}`}>
              Win: 6x your bet ({betAmount * 6})
            </p>

            {/* Action Buttons */}
            <div className="flex gap-4">
              {!gameResult ? (
                <button
                  onClick={handlePlay}
                  disabled={isPlaying || balance < betAmount}
                  className={`px-8 py-3 rounded-lg text-xl font-bold transition-all ${
                    isPlaying || balance < betAmount
                      ? 'bg-gray-500 cursor-not-allowed text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white hover:scale-105 shadow-lg hover:shadow-red-500/25'
                  } ${daydream.className}`}
                >
                  {isPlaying ? 'PULLING TRIGGER...' : 'PULL TRIGGER'}
                </button>
              ) : (
                <button
                  onClick={resetGame}
                  className={`px-8 py-3 rounded-lg text-xl font-bold bg-red-600 hover:bg-red-700 text-white transition-all hover:scale-105 ${daydream.className}`}
                >
                  PLAY AGAIN
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Dramatic lighting effects */}
      <style jsx>{`
        @keyframes flicker {
          0%,
          100% {
            opacity: 0.05;
          }
          50% {
            opacity: 0.1;
          }
        }

        .animate-flicker {
          animation: flicker 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
