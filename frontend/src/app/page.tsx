'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import AirdropSignup from './components/AirdropSignup'
import { daydream } from './fonts'
import XLogo from './x_logo'

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const letters = [
    { char: 'K', index: 1 },
    { char: 'Z', index: 2 },
    { char: 'Y', index: 3 },
    { char: 'N', index: 4 },
    { char: 'O', index: 5 },
  ]

  return (
    <main
      className={`min-h-screen flex flex-col items-center justify-center p-4 ${daydream.className}`}
    >
      <nav className="fixed top-0 right-0 p-4 md:p-6">
        <div className="flex gap-4">
          <Link
            href="/about"
            className="text-lg md:text-xl text-white hover:text-pink-200 transition-colors"
          >
            About
          </Link>
          <Link
            href="/arcade"
            className={`text-2xl md:text-3xl text-white hover:text-pink-200 transition-colors ${daydream.className}`}
          >
            Play Now
          </Link>
        </div>
      </nav>

      <div className="slot-machine">
        <div className="slot-window">
          {letters.map(({ char, index }) => (
            <div key={index} className="slot-reel">
              <div className={`slot-letter slot-letter-${index} text-4xl md:text-8xl`}>{char}</div>
            </div>
          ))}
        </div>
        <div className="slot-handle"></div>
      </div>

      <p className="mt-6 md:mt-8 text-white text-sm md:text-lg text-center max-w-xs md:max-w-none">
        The Future of Decentralized Gaming
      </p>
      <Link
        // onClick={() => setIsModalOpen(true)}
        className="mt-8 md:mt-12 px-8 md:px-12 py-4 md:py-5 
                   bg-gradient-to-r from-[#ff69b4] to-[#ff1493]
                   hover:from-[#ff1493] hover:to-[#ff69b4]
                   transition-all duration-300 ease-in-out
                   rounded-xl md:rounded-2xl text-white 
                   text-lg md:text-xl font-bold tracking-wide
                   border-2 border-white/20
                   shadow-[0_0_30px_rgba(255,20,147,0.6)]
                   hover:shadow-[0_0_50px_rgba(255,20,147,0.8)]
                   hover:scale-105 
                   animate-pulse"
        href="/arcade/dashboard"
      >
        Connect your wallet to play
      </Link>

      <div className="fixed bottom-0 right-0 p-4 md:p-6">
        <Link
          target="_blank"
          href="https://x.com/0xe37"
          className="hover:text-pink-200 transition-colors"
        >
          <XLogo />
        </Link>
      </div>

      <AirdropSignup isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </main>
  )
}
