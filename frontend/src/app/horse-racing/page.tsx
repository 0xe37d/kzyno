'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { daydream } from '../fonts'
import Image from 'next/image'

interface Horse {
  id: string
  name: string
  image: string
  odds: number
  position: number // 0-100 representing position around the track
  speed: number // Individual horse speed multiplier
  lane: number // 0-2 representing which lane the horse is in
  lapsCompleted: number // Track number of completed laps
}

export default function HorseRacing() {
  const [balance, setBalance] = useState(1000)
  const [betAmount, setBetAmount] = useState(10)
  const [selectedHorse, setSelectedHorse] = useState<string | null>(null)
  const [isRacing, setIsRacing] = useState(false)
  const [winner, setWinner] = useState<string | null>(null)
  const [horses, setHorses] = useState<Horse[]>([
    {
      id: 'alien',
      name: 'Alien Horse',
      image: '/game/alien_horse.webp',
      odds: 3,
      position: 0,
      speed: 1.2,
      lane: 0,
      lapsCompleted: 0,
    },
    {
      id: 'evil',
      name: 'Evil Horse',
      image: '/game/evil_horse.webp',
      odds: 3,
      position: 0,
      speed: 0.9,
      lane: 1,
      lapsCompleted: 0,
    },
    {
      id: 'mcqueen',
      name: 'McQueen Horse',
      image: '/game/mcqueen_horse.webp',
      odds: 3,
      position: 0,
      speed: 1.0,
      lane: 2,
      lapsCompleted: 0,
    },
    {
      id: 'pig',
      name: 'Pig',
      image: '/game/pig.webp',
      odds: 3,
      position: 0,
      speed: 0.8,
      lane: 3,
      lapsCompleted: 0,
    },
  ])

  // Determine final race positions
  const [finalPositions, setFinalPositions] = useState<string[]>([])

  // Fisher-Yates shuffle algorithm for determining race order
  const shuffleArray = (array: string[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }

  const handleBet = (horseId: string) => {
    if (!isRacing && balance >= betAmount) {
      setSelectedHorse(horseId)
      setBalance((prev) => prev - betAmount)
    }
  }

  const startRace = () => {
    if (!selectedHorse || isRacing) return

    setIsRacing(true)
    setWinner(null)

    // Determine final positions at the start
    const shuffledHorses = shuffleArray([...horses.map((h) => h.id)])
    console.log('Predetermined finish order:', shuffledHorses)
    setFinalPositions(shuffledHorses)

    // Reset horse positions to their starting positions
    setHorses((prevHorses) =>
      prevHorses.map((horse) => ({
        ...horse,
        position: 0,
        lapsCompleted: 0,
      }))
    )

    const interval = setInterval(() => {
      setHorses((prevHorses) => {
        const updatedHorses = prevHorses.map((horse) => {
          // Don't move if already completed 3 laps
          if (horse.lapsCompleted >= 3) {
            return horse
          }

          // Calculate overall progress (0-1)
          const currentProgress = (horse.lapsCompleted * 100 + horse.position) / 300

          // Base movement amount (random between 1-2)
          const baseMove = (1 + Math.random()) / 2

          // Start adjusting speeds in the final lap
          let speedMultiplier = 1
          if (horse.lapsCompleted >= 2) {
            const horseRank = shuffledHorses.indexOf(horse.id)
            const targetProgress = (horses.length - horseRank) / horses.length

            // Calculate how far behind/ahead the horse is from their target position
            const progressDiff = targetProgress - currentProgress

            // More aggressive speed adjustments
            if (progressDiff > 0.02) {
              // Speed up if falling behind
              speedMultiplier = 1.5
            } else if (progressDiff < -0.02) {
              // Slow down if too far ahead
              speedMultiplier = 0.5
            }
          }

          // Reduce randomness in the final stages
          const randomFactor =
            horse.lapsCompleted >= 2 ? 0.95 + Math.random() * 0.1 : 0.9 + Math.random() * 0.2

          const moveAmount = baseMove * speedMultiplier * randomFactor

          const newPosition = (horse.position + moveAmount) % 100

          // Check if horse completed a lap
          if (horse.position > 90 && newPosition < 10) {
            const newLapsCompleted = horse.lapsCompleted + 1
            return {
              ...horse,
              position: newPosition,
              lapsCompleted: newLapsCompleted,
            }
          }

          return {
            ...horse,
            position: newPosition,
          }
        })

        // Find the predetermined winner
        const winner = shuffledHorses[0]
        const winningHorse = updatedHorses.find((h) => h.id === winner)

        // End race if winner has completed 3 laps
        if (winningHorse && winningHorse.lapsCompleted >= 3) {
          setWinner(winner)
          setIsRacing(false)
          if (winner === selectedHorse) {
            setBalance((prev) => prev + betAmount * 3)
          }
          clearInterval(interval)
        }

        return updatedHorses
      })
    }, 50)
  }

  // Get sorted horses for leaderboard based on current race progress
  const getSortedHorses = () => {
    if (!isRacing && winner) {
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
    const outerWidth = 400 // Width of the outer oval
    const outerHeight = 250 // Height of the outer oval

    // Calculate lane-specific oval dimensions
    // Each lane's oval is 8% smaller than the previous one (adjusted for 4 horses)
    const laneScale = 1 - lane * 0.08
    const width = outerWidth * laneScale
    const height = outerHeight * laneScale

    const angle = (position / 100) * 2 * Math.PI // Convert position to angle

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

  // Determine if horse should face left or right based on position
  const shouldFaceLeft = (position: number) => {
    // Horses face left when going clockwise (0-50) and right when going counterclockwise (50-100)
    return position < 50
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
        <div className="fixed left-4 md:left-8 top-1/4 w-48 md:w-64 bg-black/20 rounded-lg p-2 md:p-4 border border-[#ffd700]/10">
          <h2 className={`text-lg md:text-xl text-white mb-2 md:mb-4 ${daydream.className}`}>
            Leaderboard
          </h2>
          <div className="space-y-1 md:space-y-2">
            {getSortedHorses().map((horse, index) => (
              <div
                key={horse.id}
                className={`flex items-center gap-1 md:gap-2 p-1 md:p-2 rounded ${
                  selectedHorse === horse.id ? 'bg-[#ffd700]/20' : 'bg-white/5'
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
        {winner && !isRacing && (
          <div className={`text-2xl md:text-4xl text-white text-center mb-4 ${daydream.className}`}>
            {winner === selectedHorse ? (
              <span className="text-[#ffd700]">You won ${betAmount * 3}!</span>
            ) : (
              <span>Better luck next time!</span>
            )}
          </div>
        )}

        {/* Betting HUD */}
        <div className="w-full max-w-2xl bg-black/20 rounded-lg p-2 md:p-4 border border-[#ffd700]/10">
          <div className="flex flex-col items-center gap-2 md:gap-4">
            {/* Balance */}
            <p className={`text-lg md:text-xl text-white ${daydream.className}`}>
              Balance: ${balance}
            </p>

            {/* Horse Selection */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 w-full">
              {horses.map((horse) => (
                <button
                  key={horse.id}
                  onClick={() => handleBet(horse.id)}
                  disabled={isRacing || balance < betAmount}
                  className={`p-2 md:p-3 rounded-lg ${
                    selectedHorse === horse.id
                      ? 'bg-[#ffd700] text-black'
                      : isRacing || balance < betAmount
                        ? 'bg-gray-500 cursor-not-allowed'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                  } transition-colors ${daydream.className}`}
                >
                  <div className="relative w-16 h-16 md:w-20 md:h-20 mx-auto mb-1 md:mb-2">
                    <Image src={horse.image} alt={horse.name} fill className="object-contain" />
                  </div>
                  <p className="text-center text-xs md:text-sm">{horse.name}</p>
                  <p className="text-center text-[10px] md:text-xs opacity-80">3x Payout</p>
                </button>
              ))}
            </div>

            {/* Bet Controls */}
            <div className="flex gap-2 md:gap-4 items-center">
              <input
                type="number"
                min="1"
                max={balance}
                value={betAmount}
                onChange={(e) =>
                  setBetAmount(Math.min(balance, Math.max(1, parseInt(e.target.value) || 1)))
                }
                className="w-16 md:w-20 px-2 py-1 bg-white/10 text-white rounded border border-[#ffd700]/20 focus:outline-none focus:border-[#ffd700]/40"
              />
              <button
                onClick={startRace}
                disabled={!selectedHorse || isRacing}
                className={`px-4 md:px-6 py-2 rounded-lg ${
                  !selectedHorse || isRacing
                    ? 'bg-gray-500 cursor-not-allowed'
                    : 'bg-[#ffd700] hover:bg-[#ffd700]/90'
                } text-black font-bold transition-colors ${daydream.className}`}
              >
                {isRacing ? 'Racing...' : 'Start Race!'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
