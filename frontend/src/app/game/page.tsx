'use client'

import React, { useRef, useState } from 'react'
import Link from 'next/link'
import { daydream } from '../fonts'
import Image from 'next/image'
import confetti from 'canvas-confetti'

export default function Game() {
  const [isSpinning, setIsSpinning] = useState(false)
  const [balance, setBalance] = useState(1000)  // Starting balance of $1000
  const [betUnit, setBetUnit] = useState(1)  // Default bet unit
  const [bets, setBets] = useState<{ [key: string]: number }>({})  // Map of number to bet amount
  const [showWinnings, setShowWinnings] = useState(false)
  const [winAmount, setWinAmount] = useState(0)
  const [isWinAnimating, setIsWinAnimating] = useState(false)
  const wheelRef = useRef<HTMLDivElement>(null)
  const numberOrder = ['00', '15', '3', '13', '5', '18', '8', '2', '4', '6', '12', '21', '19', '9', '14', '11', '7', '17', '20', '1', '10', '16']

  // Calculate optimal chip combination for a bet amount
  const getChipCombination = (amount: number): number[] => {
    const chips: number[] = []
    let remaining = amount
    
    // Use greedy algorithm to find minimum chips
    while (remaining >= 10) {
      chips.push(10)
      remaining -= 10
    }
    while (remaining >= 5) {
      chips.push(5)
      remaining -= 5
    }
    while (remaining >= 1) {
      chips.push(1)
      remaining -= 1
    }
    
    return chips
  }

  // Exact mapping of numbers to angles (measured counterclockwise)
  const numberToAngle: { [key: string]: number } = {
    '00': 0,
    '16': 15,
    '10': 30,
    '1': 45,
    '20': 65,
    '17': 80,
    '7': 95,
    '11': 110,
    '14': 130,
    '9': 145,
    '19': 160,
    '21': 175,
    '12': 190,
    '6': 205,
    '4': 225,
    '2': 240,
    '8': 255,
    '18': 270,
    '5': 285,
    '13': 300,
    '3': 320,
    '15': 330
  }

  const handleSpin = () => {
    if (!isSpinning && wheelRef.current && Object.keys(bets).length > 0) {
      setIsSpinning(true)
      
      // Pick a random target number
      const targetNumber = numberOrder[Math.floor(Math.random() * numberOrder.length)]
      const targetDegrees = numberToAngle[targetNumber]
      
      // Add 5 full rotations plus the target degrees
      const totalDegrees = (5 * 360) + targetDegrees
      
      wheelRef.current.style.transition = 'transform 5s cubic-bezier(0.2, 0.1, 0.1, 1)'
      wheelRef.current.style.transform = `rotate(${totalDegrees}deg)`

      setTimeout(() => {
        setIsSpinning(false)
        if (wheelRef.current) {
          wheelRef.current.style.transition = 'none'
          wheelRef.current.style.transform = `rotate(${targetDegrees}deg)`
          
          // Calculate winnings
          let winnings = 0
          if (bets[targetNumber]) {
            winnings = bets[targetNumber] * 20  // 20:1 payout for single number bets
            setWinAmount(winnings)
            setShowWinnings(true)
            setIsWinAnimating(true)
            
            // Trigger confetti
            const startTime = Date.now()
            const duration = 2000
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 }
            
            function randomInRange(min: number, max: number) {
              return Math.random() * (max - min) + min
            }
            
            const interval = setInterval(function() {
              const timeLeft = duration - (Date.now() - startTime)
              
              if (timeLeft <= 0) {
                return clearInterval(interval)
              }
              
              const particleCount = 50 * (timeLeft / duration)
              
              // since particles fall down, start a bit higher than random
              confetti(Object.assign({}, defaults, { 
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
              }))
              confetti(Object.assign({}, defaults, { 
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
              }))
            }, 250) as NodeJS.Timeout

            setTimeout(() => {
              setShowWinnings(false)
              setIsWinAnimating(false)
            }, 2000)
          }
          
          // Update balance and clear bets
          setBalance(prev => prev + winnings)
          setBets({})
        }
      }, 5000)
    }
  }

  const handleNumberClick = (number: string) => {
    if (!isSpinning && balance >= betUnit) {
      setBets(prev => {
        const newBets = { ...prev }
        newBets[number] = (newBets[number] || 0) + betUnit
        return newBets
      })
      setBalance(prev => prev - betUnit)
    }
  }

  const handleBetUnitChange = (unit: number) => {
    setBetUnit(unit)
  }

  const clearBets = () => {
    setBalance(prev => prev + Object.values(bets).reduce((a, b) => a + b, 0))
    setBets({})
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="fixed top-0 right-0 p-4 md:p-6 z-10">
        <div className="flex gap-4">
          <Link 
            href="/about" 
            className={`text-lg md:text-xl text-white hover:text-pink-200 transition-colors ${daydream.className}`}
          >
            About
          </Link>
          <Link 
            href="/" 
            className={`text-lg md:text-xl text-white hover:text-pink-200 transition-colors ${daydream.className}`}
          >
            Home
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-start items-center justify-center gap-8">
            {/* Game Section (Wheel + Board) */}
            <div className="w-full flex-1 flex flex-col items-center gap-8">
              {/* Wheel Section */}
              <div className="w-full max-w-[min(100vw,600px)] aspect-square relative flex items-center justify-center cursor-pointer" onClick={handleSpin}>
                {/* Winner indicator triangle */}
                <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[30px] border-t-black z-10 filter drop-shadow-[0_0_8px_rgba(0,0,0,0.9)]" />

                {/* Winning Amount Animation */}
                {showWinnings && winAmount > 0 && (
                  <div 
                    className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
                    style={{
                      perspective: '1000px'
                    }}
                  >
                    <div
                      className={`text-center transition-all duration-500 ${isWinAnimating ? 'scale-150 opacity-100' : 'scale-0 opacity-0'}`}
                      style={{
                        animation: 'win-pop 2s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                      }}
                    >
                      <div
                        className="animate-win-bounce"
                        style={{
                          color: '#4ade80',
                          fontSize: 'clamp(3rem, 10vw, 8rem)',
                          fontWeight: 'bold',
                          textShadow: '0 0 30px rgba(74, 222, 128, 0.7)',
                          WebkitTextStroke: '3px rgba(0, 0, 0, 0.5)',
                          fontFamily: daydream.style.fontFamily,
                          transform: 'rotateX(10deg)',
                        }}
                      >
                        +${winAmount}
                      </div>
                    </div>
                  </div>
                )}

                <div 
                  ref={wheelRef} 
                  className="w-[80%] h-[80%] relative"
                  style={{ transformOrigin: 'center center' }}
                >
                  <Image
                    src="/game/roulette.svg"
                    alt="Roulette Wheel"
                    fill
                    priority
                    className="object-contain"
                  />
                </div>
              </div>

              {/* Board Section */}
              <div 
                className="w-full max-w-[min(100vw,800px)] aspect-[2341/1131] relative bg-no-repeat bg-contain bg-center"
                style={{ backgroundImage: 'url("/game/board.svg")' }}
              >
                {/* Clickable overlay */}
                <div className="absolute inset-0 grid grid-cols-8 gap-x-0.5 mr-[10%] ml-[3%] my-[4%]">
                  {/* Main number grid - 7 columns of numbers */}
                  <div className="col-span-7 grid grid-cols-7 gap-x-0.5">
                    {/* Column 1 */}
                    <div className="grid grid-rows-3 gap-y-0.5">
                      <div data-number="1" className="cursor-pointer hover:bg-white/10 transition-colors relative h-full" onClick={() => handleNumberClick('1')}>
                        {bets['1'] && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {getChipCombination(bets['1']).map((chipValue: number, index: number) => (
                              <div
                                key={index}
                                className="absolute"
                                style={{
                                  transform: `translateY(${index * -8}px)`,
                                  zIndex: index + 10
                                }}
                              >
                                <Image
                                  src={`/game/${chipValue === 1 ? 'dollar' : chipValue === 5 ? 'five_dollar' : 'ten_dollar'}_chip.svg`}
                                  alt={`$${chipValue} chip`}
                                  width={12}
                                  height={12}
                                  className="w-12 h-12 md:w-16 md:h-16"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div data-number="10" className="cursor-pointer hover:bg-white/10 transition-colors relative h-full" onClick={() => handleNumberClick('10')}>
                        {bets['10'] && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {getChipCombination(bets['10']).map((chipValue: number, index: number) => (
                              <div
                                key={index}
                                className="absolute"
                                style={{
                                  transform: `translateY(${index * -8}px)`,
                                  zIndex: index + 10
                                }}
                              >
                                <Image
                                  src={`/game/${chipValue === 1 ? 'dollar' : chipValue === 5 ? 'five_dollar' : 'ten_dollar'}_chip.svg`}
                                  alt={`$${chipValue} chip`}
                                  width={12}
                                  height={12}
                                  className="w-12 h-12 md:w-16 md:h-16"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div data-number="16" className="cursor-pointer hover:bg-white/10 transition-colors relative h-full" onClick={() => handleNumberClick('16')}>
                        {bets['16'] && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {getChipCombination(bets['16']).map((chipValue: number, index: number) => (
                              <div
                                key={index}
                                className="absolute"
                                style={{
                                  transform: `translateY(${index * -8}px)`,
                                  zIndex: index + 10
                                }}
                              >
                                <Image
                                  src={`/game/${chipValue === 1 ? 'dollar' : chipValue === 5 ? 'five_dollar' : 'ten_dollar'}_chip.svg`}
                                  alt={`$${chipValue} chip`}
                                  width={12}
                                  height={12}
                                  className="w-12 h-12 md:w-16 md:h-16"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Column 2 */}
                    <div className="grid grid-rows-3 gap-y-0.5">
                      <div data-number="7" className="cursor-pointer hover:bg-white/10 transition-colors relative h-full" onClick={() => handleNumberClick('7')}>
                        {bets['7'] && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {getChipCombination(bets['7']).map((chipValue: number, index: number) => (
                              <div
                                key={index}
                                className="absolute"
                                style={{
                                  transform: `translateY(${index * -8}px)`,
                                  zIndex: index + 10
                                }}
                              >
                                <Image
                                  src={`/game/${chipValue === 1 ? 'dollar' : chipValue === 5 ? 'five_dollar' : 'ten_dollar'}_chip.svg`}
                                  alt={`$${chipValue} chip`}
                                  width={12}
                                  height={12}
                                  className="w-12 h-12 md:w-16 md:h-16"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div data-number="17" className="cursor-pointer hover:bg-white/10 transition-colors relative h-full" onClick={() => handleNumberClick('17')}>
                        {bets['17'] && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {getChipCombination(bets['17']).map((chipValue: number, index: number) => (
                              <div
                                key={index}
                                className="absolute"
                                style={{
                                  transform: `translateY(${index * -8}px)`,
                                  zIndex: index + 10
                                }}
                              >
                                <Image
                                  src={`/game/${chipValue === 1 ? 'dollar' : chipValue === 5 ? 'five_dollar' : 'ten_dollar'}_chip.svg`}
                                  alt={`$${chipValue} chip`}
                                  width={12}
                                  height={12}
                                  className="w-12 h-12 md:w-16 md:h-16"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div data-number="20" className="cursor-pointer hover:bg-white/10 transition-colors relative h-full" onClick={() => handleNumberClick('20')}>
                        {bets['20'] && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {getChipCombination(bets['20']).map((chipValue: number, index: number) => (
                              <div
                                key={index}
                                className="absolute"
                                style={{
                                  transform: `translateY(${index * -8}px)`,
                                  zIndex: index + 10
                                }}
                              >
                                <Image
                                  src={`/game/${chipValue === 1 ? 'dollar' : chipValue === 5 ? 'five_dollar' : 'ten_dollar'}_chip.svg`}
                                  alt={`$${chipValue} chip`}
                                  width={12}
                                  height={12}
                                  className="w-12 h-12 md:w-16 md:h-16"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Column 3 */}
                    <div className="grid grid-rows-3 gap-y-0.5">
                      <div data-number="9" className="cursor-pointer hover:bg-white/10 transition-colors relative h-full" onClick={() => handleNumberClick('9')}>
                        {bets['9'] && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {getChipCombination(bets['9']).map((chipValue: number, index: number) => (
                              <div
                                key={index}
                                className="absolute"
                                style={{
                                  transform: `translateY(${index * -8}px)`,
                                  zIndex: index + 10
                                }}
                              >
                                <Image
                                  src={`/game/${chipValue === 1 ? 'dollar' : chipValue === 5 ? 'five_dollar' : 'ten_dollar'}_chip.svg`}
                                  alt={`$${chipValue} chip`}
                                  width={12}
                                  height={12}
                                  className="w-12 h-12 md:w-16 md:h-16"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div data-number="14" className="cursor-pointer hover:bg-white/10 transition-colors relative h-full" onClick={() => handleNumberClick('14')}>
                        {bets['14'] && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {getChipCombination(bets['14']).map((chipValue: number, index: number) => (
                              <div
                                key={index}
                                className="absolute"
                                style={{
                                  transform: `translateY(${index * -8}px)`,
                                  zIndex: index + 10
                                }}
                              >
                                <Image
                                  src={`/game/${chipValue === 1 ? 'dollar' : chipValue === 5 ? 'five_dollar' : 'ten_dollar'}_chip.svg`}
                                  alt={`$${chipValue} chip`}
                                  width={12}
                                  height={12}
                                  className="w-12 h-12 md:w-16 md:h-16"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div data-number="11" className="cursor-pointer hover:bg-white/10 transition-colors relative h-full" onClick={() => handleNumberClick('11')}>
                        {bets['11'] && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {getChipCombination(bets['11']).map((chipValue: number, index: number) => (
                              <div
                                key={index}
                                className="absolute"
                                style={{
                                  transform: `translateY(${index * -8}px)`,
                                  zIndex: index + 10
                                }}
                              >
                                <Image
                                  src={`/game/${chipValue === 1 ? 'dollar' : chipValue === 5 ? 'five_dollar' : 'ten_dollar'}_chip.svg`}
                                  alt={`$${chipValue} chip`}
                                  width={12}
                                  height={12}
                                  className="w-12 h-12 md:w-16 md:h-16"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Column 4 */}
                    <div className="grid grid-rows-3 gap-y-0.5">
                      <div data-number="12" className="cursor-pointer hover:bg-white/10 transition-colors relative h-full" onClick={() => handleNumberClick('12')}>
                        {bets['12'] && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {getChipCombination(bets['12']).map((chipValue: number, index: number) => (
                              <div
                                key={index}
                                className="absolute"
                                style={{
                                  transform: `translateY(${index * -8}px)`,
                                  zIndex: index + 10
                                }}
                              >
                                <Image
                                  src={`/game/${chipValue === 1 ? 'dollar' : chipValue === 5 ? 'five_dollar' : 'ten_dollar'}_chip.svg`}
                                  alt={`$${chipValue} chip`}
                                  width={12}
                                  height={12}
                                  className="w-12 h-12 md:w-16 md:h-16"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div data-number="21" className="cursor-pointer hover:bg-white/10 transition-colors relative h-full" onClick={() => handleNumberClick('21')}>
                        {bets['21'] && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {getChipCombination(bets['21']).map((chipValue: number, index: number) => (
                              <div
                                key={index}
                                className="absolute"
                                style={{
                                  transform: `translateY(${index * -8}px)`,
                                  zIndex: index + 10
                                }}
                              >
                                <Image
                                  src={`/game/${chipValue === 1 ? 'dollar' : chipValue === 5 ? 'five_dollar' : 'ten_dollar'}_chip.svg`}
                                  alt={`$${chipValue} chip`}
                                  width={12}
                                  height={12}
                                  className="w-12 h-12 md:w-16 md:h-16"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div data-number="19" className="cursor-pointer hover:bg-white/10 transition-colors relative h-full" onClick={() => handleNumberClick('19')}>
                        {bets['19'] && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {getChipCombination(bets['19']).map((chipValue: number, index: number) => (
                              <div
                                key={index}
                                className="absolute"
                                style={{
                                  transform: `translateY(${index * -8}px)`,
                                  zIndex: index + 10
                                }}
                              >
                                <Image
                                  src={`/game/${chipValue === 1 ? 'dollar' : chipValue === 5 ? 'five_dollar' : 'ten_dollar'}_chip.svg`}
                                  alt={`$${chipValue} chip`}
                                  width={12}
                                  height={12}
                                  className="w-12 h-12 md:w-16 md:h-16"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Column 5 */}
                    <div className="grid grid-rows-3 gap-y-0.5">
                      <div data-number="2" className="cursor-pointer hover:bg-white/10 transition-colors relative h-full" onClick={() => handleNumberClick('2')}>
                        {bets['2'] && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {getChipCombination(bets['2']).map((chipValue: number, index: number) => (
                              <div
                                key={index}
                                className="absolute"
                                style={{
                                  transform: `translateY(${index * -8}px)`,
                                  zIndex: index + 10
                                }}
                              >
                                <Image
                                  src={`/game/${chipValue === 1 ? 'dollar' : chipValue === 5 ? 'five_dollar' : 'ten_dollar'}_chip.svg`}
                                  alt={`$${chipValue} chip`}
                                  width={12}
                                  height={12}
                                  className="w-12 h-12 md:w-16 md:h-16"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div data-number="4" className="cursor-pointer hover:bg-white/10 transition-colors relative h-full" onClick={() => handleNumberClick('4')}>
                        {bets['4'] && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {getChipCombination(bets['4']).map((chipValue: number, index: number) => (
                              <div
                                key={index}
                                className="absolute"
                                style={{
                                  transform: `translateY(${index * -8}px)`,
                                  zIndex: index + 10
                                }}
                              >
                                <Image
                                  src={`/game/${chipValue === 1 ? 'dollar' : chipValue === 5 ? 'five_dollar' : 'ten_dollar'}_chip.svg`}
                                  alt={`$${chipValue} chip`}
                                  width={12}
                                  height={12}
                                  className="w-12 h-12 md:w-16 md:h-16"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div data-number="6" className="cursor-pointer hover:bg-white/10 transition-colors relative h-full" onClick={() => handleNumberClick('6')}>
                        {bets['6'] && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {getChipCombination(bets['6']).map((chipValue: number, index: number) => (
                              <div
                                key={index}
                                className="absolute"
                                style={{
                                  transform: `translateY(${index * -8}px)`,
                                  zIndex: index + 10
                                }}
                              >
                                <Image
                                  src={`/game/${chipValue === 1 ? 'dollar' : chipValue === 5 ? 'five_dollar' : 'ten_dollar'}_chip.svg`}
                                  alt={`$${chipValue} chip`}
                                  width={12}
                                  height={12}
                                  className="w-12 h-12 md:w-16 md:h-16"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Column 6 */}
                    <div className="grid grid-rows-3 gap-y-0.5">
                      <div data-number="5" className="cursor-pointer hover:bg-white/10 transition-colors relative h-full" onClick={() => handleNumberClick('5')}>
                        {bets['5'] && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {getChipCombination(bets['5']).map((chipValue: number, index: number) => (
                              <div
                                key={index}
                                className="absolute"
                                style={{
                                  transform: `translateY(${index * -8}px)`,
                                  zIndex: index + 10
                                }}
                              >
                                <Image
                                  src={`/game/${chipValue === 1 ? 'dollar' : chipValue === 5 ? 'five_dollar' : 'ten_dollar'}_chip.svg`}
                                  alt={`$${chipValue} chip`}
                                  width={12}
                                  height={12}
                                  className="w-12 h-12 md:w-16 md:h-16"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div data-number="18" className="cursor-pointer hover:bg-white/10 transition-colors relative h-full" onClick={() => handleNumberClick('18')}>
                        {bets['18'] && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {getChipCombination(bets['18']).map((chipValue: number, index: number) => (
                              <div
                                key={index}
                                className="absolute"
                                style={{
                                  transform: `translateY(${index * -8}px)`,
                                  zIndex: index + 10
                                }}
                              >
                                <Image
                                  src={`/game/${chipValue === 1 ? 'dollar' : chipValue === 5 ? 'five_dollar' : 'ten_dollar'}_chip.svg`}
                                  alt={`$${chipValue} chip`}
                                  width={12}
                                  height={12}
                                  className="w-12 h-12 md:w-16 md:h-16"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div data-number="8" className="cursor-pointer hover:bg-white/10 transition-colors relative h-full" onClick={() => handleNumberClick('8')}>
                        {bets['8'] && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {getChipCombination(bets['8']).map((chipValue: number, index: number) => (
                              <div
                                key={index}
                                className="absolute"
                                style={{
                                  transform: `translateY(${index * -8}px)`,
                                  zIndex: index + 10
                                }}
                              >
                                <Image
                                  src={`/game/${chipValue === 1 ? 'dollar' : chipValue === 5 ? 'five_dollar' : 'ten_dollar'}_chip.svg`}
                                  alt={`$${chipValue} chip`}
                                  width={12}
                                  height={12}
                                  className="w-12 h-12 md:w-16 md:h-16"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Column 7 */}
                    <div className="grid grid-rows-3 gap-y-0.5">
                      <div data-number="15" className="cursor-pointer hover:bg-white/10 transition-colors relative h-full" onClick={() => handleNumberClick('15')}>
                        {bets['15'] && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {getChipCombination(bets['15']).map((chipValue: number, index: number) => (
                              <div
                                key={index}
                                className="absolute"
                                style={{
                                  transform: `translateY(${index * -8}px)`,
                                  zIndex: index + 10
                                }}
                              >
                                <Image
                                  src={`/game/${chipValue === 1 ? 'dollar' : chipValue === 5 ? 'five_dollar' : 'ten_dollar'}_chip.svg`}
                                  alt={`$${chipValue} chip`}
                                  width={12}
                                  height={12}
                                  className="w-12 h-12 md:w-16 md:h-16"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div data-number="3" className="cursor-pointer hover:bg-white/10 transition-colors relative h-full" onClick={() => handleNumberClick('3')}>
                        {bets['3'] && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {getChipCombination(bets['3']).map((chipValue: number, index: number) => (
                              <div
                                key={index}
                                className="absolute"
                                style={{
                                  transform: `translateY(${index * -8}px)`,
                                  zIndex: index + 10
                                }}
                              >
                                <Image
                                  src={`/game/${chipValue === 1 ? 'dollar' : chipValue === 5 ? 'five_dollar' : 'ten_dollar'}_chip.svg`}
                                  alt={`$${chipValue} chip`}
                                  width={12}
                                  height={12}
                                  className="w-12 h-12 md:w-16 md:h-16"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div data-number="13" className="cursor-pointer hover:bg-white/10 transition-colors relative h-full" onClick={() => handleNumberClick('13')}>
                        {bets['13'] && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {getChipCombination(bets['13']).map((chipValue: number, index: number) => (
                              <div
                                key={index}
                                className="absolute"
                                style={{
                                  transform: `translateY(${index * -8}px)`,
                                  zIndex: index + 10
                                }}
                              >
                                <Image
                                  src={`/game/${chipValue === 1 ? 'dollar' : chipValue === 5 ? 'five_dollar' : 'ten_dollar'}_chip.svg`}
                                  alt={`$${chipValue} chip`}
                                  width={12}
                                  height={12}
                                  className="w-12 h-12 md:w-16 md:h-16"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 00 section - on the right */}
                  <div className="col-span-1">
                    <div 
                      data-number="00"
                      className="w-full h-full cursor-pointer hover:bg-white/10 transition-colors relative"
                      onClick={() => handleNumberClick('00')}
                    >
                      {bets['00'] && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          {getChipCombination(bets['00']).map((chipValue: number, index: number) => (
                            <div
                              key={index}
                              className="absolute"
                              style={{
                                transform: `translateY(${index * -8}px)`,
                                zIndex: index + 10
                              }}
                            >
                              <Image
                                src={`/game/${chipValue === 1 ? 'dollar' : chipValue === 5 ? 'five_dollar' : 'ten_dollar'}_chip.svg`}
                                alt={`$${chipValue} chip`}
                                width={12}
                                height={12}
                                className="w-12 h-12 md:w-16 md:h-16"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls Section */}
            <div className="w-full md:w-64 flex flex-col items-center gap-4 md:gap-8 md:sticky md:top-20 p-4 md:p-0">
              {/* Balance and Controls Section */}
              <div className="w-full flex flex-col items-center gap-4">
                <p className={`text-xl md:text-2xl text-white ${daydream.className}`}>
                  Balance: ${balance}
                </p>
                <div className="w-full flex flex-row md:flex-col gap-4 items-center justify-center">
                  <div className="flex gap-2 items-center">
                    <button 
                      className={`px-3 py-1 md:px-4 md:py-2 ${betUnit === 1 ? 'bg-white/30' : 'bg-white/10'} text-white rounded hover:bg-white/20 transition-colors ${daydream.className} text-sm md:text-base`}
                      onClick={() => handleBetUnitChange(1)}
                    >
                      $1
                    </button>
                    <button 
                      className={`px-3 py-1 md:px-4 md:py-2 ${betUnit === 5 ? 'bg-white/30' : 'bg-white/10'} text-white rounded hover:bg-white/20 transition-colors ${daydream.className} text-sm md:text-base`}
                      onClick={() => handleBetUnitChange(5)}
                    >
                      $5
                    </button>
                    <button 
                      className={`px-3 py-1 md:px-4 md:py-2 ${betUnit === 10 ? 'bg-white/30' : 'bg-white/10'} text-white rounded hover:bg-white/20 transition-colors ${daydream.className} text-sm md:text-base`}
                      onClick={() => handleBetUnitChange(10)}
                    >
                      $10
                    </button>
                  </div>
                  <button 
                    className={`px-3 py-1 md:px-4 md:py-2 bg-red-500/50 text-white rounded hover:bg-red-500/70 transition-colors ${daydream.className} text-sm md:text-base`}
                    onClick={clearBets}
                  >
                    Clear
                  </button>
                </div>

                {/* Bet Summary Section */}
                {Object.keys(bets).length > 0 && (
                  <div className="w-full mt-4 p-4 bg-white/10 rounded">
                    <p className={`text-lg text-white mb-2 ${daydream.className}`}>Current Bets:</p>
                    <div className="flex flex-col gap-1">
                      {Object.entries(bets).map(([number, amount]) => (
                        <div key={number} className="flex justify-between text-white">
                          <span>Number {number}:</span>
                          <span>${amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <p className={`text-base md:text-xl text-white text-center ${daydream.className}`}>
                {isSpinning ? 'Spinning...' : Object.keys(bets).length > 0 ? 'Click wheel to spin!' : 'Place your bets!'}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}