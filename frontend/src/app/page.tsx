'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import AirdropSignup from './components/AirdropSignup'
import { daydream } from './fonts'

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const letters = [
    { char: 'K', index: 1 },
    { char: 'Z', index: 2 },
    { char: 'Y', index: 3 },
    { char: 'N', index: 4 },
    { char: 'O', index: 5 },
  ];

  return (
    <main className={`min-h-screen flex flex-col items-center justify-center p-4 ${daydream.className}`}>
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
              <div className={`slot-letter slot-letter-${index} text-4xl md:text-8xl`}>
                {char}
              </div>
            </div>
          ))}
        </div>
        <div className="slot-handle"></div>
      </div>

      <p className="mt-6 md:mt-8 text-white text-sm md:text-lg text-center max-w-xs md:max-w-none">
        The Future of Decentralized Gaming
      </p>
      <button 
        onClick={() => setIsModalOpen(true)}
        className="mt-8 md:mt-12 px-6 md:px-8 py-3 md:py-4 bg-[#ff69b4] hover:bg-[#ff1493] 
                   transition-colors rounded-xl md:rounded-2xl text-white text-sm md:text-base
                   border-2 border-black shadow-[0_0_15px_rgba(255,20,147,0.5)]"
      >
        Sign Up for Airdrop
      </button>

      <AirdropSignup 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </main>
  )
}
