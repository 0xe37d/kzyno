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
}

const games: GameCard[] = [
  {
    id: 'roulette',
    title: 'Roulette',
    description: 'Classic casino game with high stakes and big wins',
    image: '/game/roulette.png',
    path: '/roulette',
    isAvailable: true,
  },
  {
    id: 'horse-racing',
    title: 'Horse Racing',
    description: 'Bet on your favorite horse and watch them race!',
    image: '/game/horses.png',
    path: '/horse-racing',
    isAvailable: true,
  },
  {
    id: 'blackjack',
    title: 'Blackjack',
    description: 'Coming soon...',
    image: '/game/blackjack.png',
    path: '#',
    isAvailable: false,
  },
  {
    id: 'slots',
    title: 'Slots',
    description: 'Coming soon...',
    image: '/game/slots.png',
    path: '#',
    isAvailable: false,
  },
]

export default function Arcade() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900">
      <nav className="fixed top-0 right-0 p-4 md:p-6 z-50">
        <div className="flex gap-4">
          <Link
            href="/"
            className={`text-lg md:text-xl text-white hover:text-pink-200 transition-colors ${daydream.className}`}
          >
            Home
          </Link>
        </div>
      </nav>

      <main className="pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className={`text-4xl md:text-6xl text-white text-center mb-12 ${daydream.className}`}>
            Welcome to the Arcade
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {games.map((game) => (
              <div key={game.id} className={`relative group ${!game.isAvailable && 'opacity-50'}`}>
                <div className="relative aspect-square bg-white/5 rounded-lg overflow-hidden border border-white/10 transition-all duration-300 group-hover:border-white/30">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 z-10" />
                  <Image src={game.image} alt={game.title} fill className="object-contain p-4" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                    <h2 className={`text-2xl text-white mb-2 ${daydream.className}`}>
                      {game.title}
                    </h2>
                    <p className="text-white/80 text-sm mb-4">{game.description}</p>
                    {game.isAvailable ? (
                      <Link
                        href={game.path}
                        className={`inline-block px-6 py-2 bg-white/20 text-white rounded hover:bg-white/30 transition-colors ${daydream.className}`}
                      >
                        Play Now
                      </Link>
                    ) : (
                      <button
                        disabled
                        className={`px-6 py-2 bg-white/10 text-white/50 rounded cursor-not-allowed ${daydream.className}`}
                      >
                        Coming Soon
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
