'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { daydream } from '../../fonts'
import Image from 'next/image'
import { useCasino } from '@/contexts/CasinoContext'
import { CasinoClient } from '@/lib/casino-client'

interface Horse {
  id: number
  name: string
  image: string
  position: number // Now represents actual position in meters
  speed: number // Now represents actual speed in m/s
  lane: number // 0-2 representing which lane the horse is in
  lapsCompleted: number // Track number of completed laps
  winner: boolean
  isRacing: boolean
}

const RACE_CONSTANTS = {
  LAPS: 3,
  TRACK_LEN: 1000,

  /* base motion ---------------------------------------------------------- */
  V0: 180, // base pack speed
  SIGMA_JITTER: 2.5,
  DT: 0.1,

  WINNER_BOOST: 30.0,
}

export default function HorseRacing() {
  const { casinoClient, isConnected } = useCasino()
  const [balance, setBalance] = useState(0)
  const [betAmount, setBetAmount] = useState(10)
  const [selectedHorse, setSelectedHorse] = useState<number | null>(null)
  const [winner, setWinner] = useState<number | null>(null)
  const [horses, setHorses] = useState<Horse[]>([
    {
      id: 0,
      name: 'Alien Horse',
      image: '/game/alien_horse.webp',
      position: 0,
      speed: RACE_CONSTANTS.V0,
      lane: 0,
      lapsCompleted: 0,
      winner: false,
      isRacing: false,
    },
    {
      id: 1,
      name: 'Evil Horse',
      image: '/game/evil_horse.webp',
      position: 0,
      speed: RACE_CONSTANTS.V0,
      lane: 1,
      lapsCompleted: 0,
      winner: false,
      isRacing: false,
    },
    {
      id: 2,
      name: 'McQueen Horse',
      image: '/game/mcqueen_horse.webp',
      position: 0,
      speed: RACE_CONSTANTS.V0,
      lane: 2,
      lapsCompleted: 0,
      winner: false,
      isRacing: false,
    },
    {
      id: 3,
      name: 'Pig',
      image: '/game/pig.webp',
      position: 0,
      speed: RACE_CONSTANTS.V0,
      lane: 3,
      lapsCompleted: 0,
      winner: false,
      isRacing: false,
    },
  ])

  // Determine final race positions
  const [finalPositions, setFinalPositions] = useState<number[]>([])
  const raceTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // Audio refs
  const horsesAudioRef = useRef<HTMLAudioElement | null>(null)
  const goodAudioRef = useRef<HTMLAudioElement | null>(null)
  const badAudioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio elements
  useEffect(() => {
    horsesAudioRef.current = new Audio('/audio/horses.mp3')
    goodAudioRef.current = new Audio('/audio/good.mp3')
    badAudioRef.current = new Audio('/audio/bad.mp3')

    // Set audio properties
    if (horsesAudioRef.current) {
      horsesAudioRef.current.loop = true
      horsesAudioRef.current.volume = 0.6
    }
    if (goodAudioRef.current) {
      goodAudioRef.current.volume = 0.8
    }
    if (badAudioRef.current) {
      badAudioRef.current.volume = 0.8
    }

    // Cleanup function
    return () => {
      if (horsesAudioRef.current) {
        horsesAudioRef.current.pause()
        horsesAudioRef.current = null
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

  // Add effect to fetch casino balance
  useEffect(() => {
    if (!casinoClient || !isConnected || horses.find((horse) => horse.isRacing)) return

    fetchBalance(casinoClient)
  }, [casinoClient, isConnected, horses])

  const handleBet = async (horseId: number): Promise<number | null> => {
    if (balance < betAmount || !casinoClient) return null

    try {
      const result = await casinoClient.play(betAmount, 4)
      const winner = result.won
        ? horseId
        : horses.filter((h) => h.id !== horseId)[Math.floor(Math.random() * 3)].id

      // debit only on success
      setBalance((prev) => prev - betAmount)
      return winner
    } catch (e) {
      console.error('Error placing bet:', e)
      return null
    }
  }

  const startRace = async () => {
    if (selectedHorse === null || !isRaceOver || !casinoClient) return

    setWinner(null)

    const serverWinner = await handleBet(selectedHorse) // place bet first
    if (serverWinner === null) {
      return
    }

    // Start playing horses audio
    try {
      if (horsesAudioRef.current) {
        horsesAudioRef.current.currentTime = 0 // Reset to beginning
        await horsesAudioRef.current.play()
      }
    } catch (error) {
      console.log('Audio play failed:', error) // Some browsers block autoplay
    }

    // Reset horse positions
    setHorses((prevHorses) =>
      prevHorses.map((horse) => ({
        ...horse,
        position: 0,
        speed: RACE_CONSTANTS.V0,
        lapsCompleted: 0,
      }))
    )

    raceTimer.current = setInterval(() => {
      setHorses((prevHorses) => {
        const updatedHorses = prevHorses.map((horse) => {
          // Don't update if race is finished
          if (horse.lapsCompleted >= RACE_CONSTANTS.LAPS) {
            return horse
          }

          // Winner's boost in final lap
          let boost = 0
          if (horse.id === serverWinner && horse.lapsCompleted >= 2) {
            boost = RACE_CONSTANTS.WINNER_BOOST
          }

          // Calculate new speed
          const noise = (Math.random() - 0.5) * 2 * RACE_CONSTANTS.SIGMA_JITTER
          const newSpeed = RACE_CONSTANTS.V0 + boost + noise

          // Update position
          const newPosition = horse.position + newSpeed * RACE_CONSTANTS.DT

          // Check for lap completion
          const newLapsCompleted = Math.floor(newPosition / RACE_CONSTANTS.TRACK_LEN)

          // Check if race is finished
          if (newLapsCompleted >= RACE_CONSTANTS.LAPS) {
            // capture final order once, before stopping
            setFinalPositions(
              [...prevHorses].sort((a, b) => b.position - a.position).map((h) => h.id)
            )

            // Stop horses audio
            if (horsesAudioRef.current) {
              horsesAudioRef.current.pause()
            }

            // Play win/loss audio with a small delay
            setTimeout(() => {
              try {
                if (selectedHorse === serverWinner) {
                  setBalance((prev) => prev + betAmount * 3)
                  if (goodAudioRef.current) {
                    goodAudioRef.current.currentTime = 0
                    goodAudioRef.current.play()
                  }
                } else {
                  if (badAudioRef.current) {
                    badAudioRef.current.currentTime = 0
                    badAudioRef.current.play()
                  }
                }
              } catch (error) {
                console.log('Result audio play failed:', error)
              }
            }, 500) // 500ms delay for dramatic effect

            if (raceTimer.current) clearInterval(raceTimer.current)
          }

          return {
            ...horse,
            position: newPosition,
            speed: newSpeed,
            lapsCompleted: newLapsCompleted,
            isRacing: newLapsCompleted < RACE_CONSTANTS.LAPS,
            winner: horse.id === serverWinner,
          }
        })

        return updatedHorses
      })
    }, RACE_CONSTANTS.DT * 1000)
  }

  // Get sorted horses for leaderboard based on current race progress
  const getSortedHorses = () => {
    if (!isRaceOver && winner) {
      // After race is complete, return horses in predetermined order
      return [...horses].sort((a, b) => {
        const aIndex = finalPositions.indexOf(a.id)
        const bIndex = finalPositions.indexOf(b.id)
        return aIndex - bIndex
      })
    }

    // During race, sort by current position
    return [...horses].sort((a, b) => {
      if (a.lapsCompleted !== b.lapsCompleted) {
        return b.lapsCompleted - a.lapsCompleted
      }
      return b.position - a.position
    })
  }

  // Calculate horse position on the oval track
  const getHorsePosition = (position: number, lane: number) => {
    // Convert position from meters to percentage (0-100)
    const positionPercent = ((position % RACE_CONSTANTS.TRACK_LEN) / RACE_CONSTANTS.TRACK_LEN) * 100

    const outerWidth = 400 // Width of the outer oval
    const outerHeight = 250 // Height of the outer oval

    // Calculate lane-specific oval dimensions
    // Each lane's oval is 8% smaller than the previous one (adjusted for 4 horses)
    const laneScale = 1 - lane * 0.08
    const width = outerWidth * laneScale
    const height = outerHeight * laneScale

    const angle = (positionPercent / 100) * 2 * Math.PI // Convert position to angle

    // Calculate how spread out the lanes should be based on position
    // 1 = most spread out (sides), 0 = least spread out (top/bottom)
    const spreadFactor = Math.abs(Math.cos(angle))

    // Adjust lane spacing based on position
    const laneOffset = lane * 40 * spreadFactor // Reduced from 50 to 40 pixels max spread between lanes

    // Calculate position on the lane's oval
    const x = width * Math.cos(angle) + laneOffset * Math.sign(Math.cos(angle))
    const y = height * Math.sin(angle) - 20 // Move everything up by 20 pixels

    return { x, y }
  }

  // Helper: progress inside current lap   (0 → 1)
  const lapProgress = (pos: number) => (pos % RACE_CONSTANTS.TRACK_LEN) / RACE_CONSTANTS.TRACK_LEN

  /**
   * Horses face LEFT during the first half-lap (0 – 50 %)
   * and RIGHT during the second half-lap (50 – 100 %).
   */
  const shouldFaceLeft = (position: number) => lapProgress(position) < 0.5

  const isRaceOver = !horses.every((horse) => horse.isRacing)

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
        {/* Leaderboard - Left Side */}
        <div className="fixed left-4 md:left-8 top-1/4 w-48 md:w-64 bg-black/20 rounded-lg p-2 md:p-4 border border-[#ffd700]/10 z-10">
          <h2 className={`text-lg md:text-xl text-white mb-2 md:mb-4 ${daydream.className}`}>
            Leaderboard
          </h2>
          <div className="space-y-1 md:space-y-2">
            {getSortedHorses().map((horse, index) => (
              <div
                key={horse.id}
                className={`flex items-center gap-1 md:gap-2 p-1 md:p-2 rounded ${
                  index === 0 ? 'bg-[#ffd700]/20' : 'bg-white/5'
                }`}
              >
                <span
                  className={`text-base md:text-lg ${daydream.className} ${
                    index === 0 ? 'text-[#ffd700]' : 'text-white'
                  }`}
                >
                  {index + 1}.
                </span>
                <div className="relative w-6 h-6 md:w-8 md:h-8">
                  <Image src={horse.image} alt={horse.name} fill className="object-contain" />
                </div>
                <div className="flex-1">
                  <p className={`text-xs md:text-sm ${daydream.className} text-white`}>
                    {horse.name}
                  </p>
                  <p className="text-[10px] md:text-xs text-white/60">
                    Lap {horse.lapsCompleted + 1}/3
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Race Track */}
        <div className="relative w-[95vw] md:w-[800px] h-[60vh] md:h-[500px] mb-8">
          {/* Track background - outer oval */}
          <div
            className="absolute inset-0 border-2 md:border-4 border-[#ffd700]/20 bg-[#8B4513]"
            style={{
              borderRadius: '50%',
              transform: 'scaleX(1.5)',
              backgroundImage: 'url("/game/dirt.png")',
              backgroundRepeat: 'repeat',
              backgroundSize: '50px',
              opacity: 0.8,
            }}
          />

          {/* Track background - inner oval (hollow center) */}
          <div
            className="absolute inset-0 border-2 md:border-4 border-[#1a472a]"
            style={{
              borderRadius: '50%',
              transform: 'scaleX(0.75) scaleY(0.5)',
              backgroundImage: 'url("/game/grass.png")',
              backgroundRepeat: 'repeat',
              backgroundSize: '50px',
              opacity: 0.8,
            }}
          />

          {/* Start/Finish line */}
          <div
            className="absolute right-0 top-1/2 h-1 md:h-2 bg-white/50"
            style={{
              width: 'clamp(150px, 37.5vw, 300px)',
              transform: 'translateX(67%) translateY(-50%)',
            }}
          />

          {/* Horses */}
          {horses.map((horse) => {
            const pos = getHorsePosition(horse.position, horse.lane)
            return (
              <div
                key={horse.id}
                className="absolute w-16 h-16 md:w-24 md:h-24 transition-all duration-50"
                style={{
                  left: `calc(50% + ${pos.x}px)`,
                  top: `calc(50% + ${pos.y}px)`,
                  transform: `translate(-50%, -50%) ${shouldFaceLeft(horse.position) ? '' : 'scaleX(-1)'}`,
                }}
              >
                <Image src={horse.image} alt={horse.name} fill className="object-contain" />
              </div>
            )
          })}
        </div>

        {/* Winner Announcement */}
        {horses.find((horse) => horse.winner && !horse.isRacing) && (
          <div className={`text-2xl md:text-4xl text-white text-center mb-4 ${daydream.className}`}>
            {horses.find((horse) => horse.winner)?.id === selectedHorse ? (
              <div
                className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
                style={{
                  perspective: '1000px',
                }}
              >
                <div
                  className={`text-center transition-all duration-500`}
                  style={{
                    animation: 'win-pop 2s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                  }}
                >
                  <div
                    className="animate-win-bounce"
                    style={{
                      color: '#ffd700',
                      fontSize: 'clamp(3rem, 10vw, 8rem)',
                      fontWeight: 'bold',
                      textShadow: '0 0 30px rgba(255, 215, 0, 0.7)',
                      WebkitTextStroke: '3px rgba(0, 0, 0, 0.5)',
                      fontFamily: daydream.style.fontFamily,
                      transform: 'rotateX(10deg)',
                    }}
                  >
                    +${betAmount * 4}
                  </div>
                </div>
              </div>
            ) : (
              <span>Better luck next time!</span>
            )}
          </div>
        )}

        {/* Betting HUD */}
        <div className="w-full max-w-2xl bg-black/20 rounded-lg p-2 md:p-4 border border-[#ffd700]/10">
          <div className="flex flex-col items-center gap-2 md:gap-4">
            {/* Balance */}
            <p className={`text-lg md:text-xl text-white font-bold`}>Balance: {balance}</p>

            {/* Horse Selection */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 w-full">
              {horses.map((horse) => (
                <button
                  key={horse.id}
                  onClick={() => setSelectedHorse(horse.id)}
                  disabled={!isRaceOver || balance < betAmount}
                  className={`p-2 md:p-3 rounded-lg ${
                    selectedHorse === horse.id
                      ? 'bg-[#ffd700] text-black'
                      : !isRaceOver || balance < betAmount
                        ? 'bg-gray-500 cursor-not-allowed'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                  } transition-colors ${daydream.className}`}
                >
                  <div className="relative w-16 h-16 md:w-20 md:h-20 mx-auto mb-1 md:mb-2">
                    <Image src={horse.image} alt={horse.name} fill className="object-contain" />
                  </div>
                  <p className="text-center text-xs md:text-sm">{horse.name}</p>
                  <p className="text-center text-[10px] md:text-xs opacity-80">4x Payout</p>
                </button>
              ))}
            </div>

            {/* Bet Controls */}
            <div className="flex gap-2 md:gap-4 items-center">
              <input
                type="number"
                min=".01"
                max={balance}
                value={betAmount}
                onChange={(e) => setBetAmount(parseFloat(e.target.value))}
                className="w-16 md:w-20 px-2 py-1 bg-white/10 text-white rounded border border-[#ffd700]/20 focus:outline-none focus:border-[#ffd700]/40"
              />
              <button
                onClick={startRace}
                disabled={selectedHorse === null || !isRaceOver}
                className={`px-4 md:px-6 py-2 rounded-lg ${
                  selectedHorse === null || !isRaceOver
                    ? 'bg-gray-500 cursor-not-allowed'
                    : 'bg-[#ffd700] hover:bg-[#ffd700]/90'
                } text-black font-bold transition-colors ${daydream.className}`}
              >
                {!isRaceOver ? 'Racing...' : 'Start Race!'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
