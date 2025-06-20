'use client'

import React from 'react'
import Link from 'next/link'
import { daydream } from '../fonts'
import Image from 'next/image'

interface GameCard {
  id: string
  title: string
  description: string
  image: string
  path: string
  isAvailable: boolean
  multiplier: string
}

const games: GameCard[] = [
  {
    id: 'baccarat',
    title: 'Baccarat',
    description: 'Classic card game! Bet on Player, Banker, or Tie!',
    image: '/game/baccarat.png',
    path: '/arcade/baccarat',
    isAvailable: true,
    multiplier: '9x',
  },
  {
    id: 'horse-racing',
    title: 'Horse Racing',
    description: 'Bet on your favorite horse and watch them race!',
    image: '/game/horses.png',
    path: '/arcade/horse-racing',
    isAvailable: true,
    multiplier: '4x',
  },
  {
    id: 'russian-roulette',
    title: 'Russian Roulette',
    description: 'Will he survive? 1 in 6 chance of survival!',
    image: '/game/standing.png',
    path: '/arcade/russian-roulette',
    isAvailable: true,
    multiplier: '6x',
  },
  {
    id: 'coinflip',
    title: 'Coin Flip',
    description: 'Bet on your favorite side and watch the coin flip!',
    image: '/game/coin.png',
    path: '/arcade/coinflip',
    isAvailable: true,
    multiplier: '2x',
  },
  {
    id: 'slots',
    title: 'Slots',
    description: 'Coming soon...',
    image: '/game/slots.png',
    path: '#',
    isAvailable: false,
    multiplier: '10x',
  },
  {
    id: 'roulette',
    title: 'Roulette',
    description: 'Coming soon...',
    image: '/game/roulette.png',
    path: '/arcade/roulette',
    isAvailable: false,
    multiplier: '36x',
  },
]

export default function Arcade() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-900 via-pink-800 to-pink-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-32 h-32 bg-pink-500/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-black-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-pink-400/10 rounded-full blur-2xl animate-pulse delay-500"></div>
        <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-black-400/15 rounded-full blur-xl animate-pulse delay-700"></div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      <nav className="fixed top-0 right-0 p-4 md:p-6 z-50">
        <div className="flex gap-4">
          <Link
            href="/home"
            className={`text-lg md:text-xl text-white hover:text-pink-200 transition-colors drop-shadow-lg ${daydream.className}`}
          >
            Home
          </Link>
        </div>
      </nav>

      <main className="pt-20 pb-12 px-4 relative z-10">
        <div className="max-w-7xl mx-auto">
          <h1
            className={`text-4xl md:text-6xl text-white text-center mb-4 drop-shadow-2xl ${daydream.className}`}
          >
            Welcome to the Arcade
          </h1>
          <p className="text-white/80 text-center mb-12 text-lg drop-shadow-lg">
            Choose your game and let the fun begin! 🎮
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
            {games.map((game) => (
              <div
                key={game.id}
                className={`relative group perspective-1000 ${!game.isAvailable && 'opacity-60'}`}
              >
                {/* Floating Multiplier Badge - moved outside the card container */}
                <div className="absolute -top-3 -right-3 z-30 transform transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-1 group-hover:rotate-12">
                  <div className="relative">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-md opacity-75 animate-pulse"></div>

                    {/* Main badge */}
                    <div
                      className={`relative bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-black font-black text-lg md:text-xl px-3 py-1 rounded-full border-2 border-white/30 shadow-2xl ${daydream.className}`}
                    >
                      <span className="relative z-10 drop-shadow-sm">{game.multiplier}</span>

                      {/* Inner shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-white/40 rounded-full"></div>

                      {/* Sparkle effects */}
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping opacity-75"></div>
                      <div className="absolute -bottom-1 -left-1 w-1 h-1 bg-yellow-200 rounded-full animate-pulse delay-500"></div>
                    </div>
                  </div>
                </div>

                <div className="relative aspect-square bg-gradient-to-br from-white/10 to-white/5 rounded-2xl overflow-hidden border border-white/20 transition-all duration-500 ease-out transform-gpu group-hover:scale-105 group-hover:-translate-y-4 group-hover:rotate-1 shadow-2xl group-hover:shadow-pink-500/25 backdrop-blur-sm">
                  {/* Glowing border effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-pink-500/20 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>

                  {/* Inner glow */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 z-10 rounded-2xl" />

                  {/* Game image */}
                  <div className="relative h-2/3 p-6 flex items-center justify-center">
                    <Image
                      src={game.image}
                      alt={game.title}
                      width={120}
                      height={120}
                      className="object-contain transition-transform duration-500 group-hover:scale-110 drop-shadow-2xl"
                    />
                  </div>

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                    <h2
                      className={`text-2xl md:text-3xl text-white mb-2 drop-shadow-lg ${daydream.className}`}
                    >
                      {game.title}
                    </h2>
                    <p className="text-white/90 text-sm mb-4 bg-black/40 backdrop-blur-sm p-3 rounded-xl font-medium border border-white/10">
                      {game.description}
                    </p>
                    {game.isAvailable ? (
                      <Link
                        href={game.path}
                        className={`inline-block px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl hover:from-pink-400 hover:to-purple-500 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-pink-500/25 border border-white/20 ${daydream.className}`}
                      >
                        Play Now ✨
                      </Link>
                    ) : (
                      <button
                        disabled
                        className={`px-6 py-3 bg-white/10 text-white/50 rounded-xl cursor-not-allowed backdrop-blur-sm border border-white/10 ${daydream.className}`}
                      >
                        Coming Soon 🚀
                      </button>
                    )}
                  </div>

                  {/* Floating sparkles on hover */}
                  <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-1 h-1 bg-white rounded-full animate-sparkle"
                        style={{
                          left: `${20 + Math.random() * 60}%`,
                          top: `${20 + Math.random() * 60}%`,
                          animationDelay: `${Math.random() * 2}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
        }

        @keyframes sparkle {
          0%,
          100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-sparkle {
          animation: sparkle 2s ease-in-out infinite;
        }

        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>
    </div>
  )
}
