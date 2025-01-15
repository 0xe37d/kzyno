'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import AirdropSignup from './components/AirdropSignup'
import { daydream } from './fonts'

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const letters = [
    { char: 'K', index: 1 },
    { char: 'A', index: 2 },
    { char: 'S', index: 3 },
    { char: 'I', index: 4 },
    { char: 'N', index: 5 },
    { char: 'O', index: 6 },
  ];

  return (
    <main className={`min-h-screen flex flex-col items-center justify-center p-4 ${daydream.className}`}>
      <nav className="fixed top-0 right-0 p-6">
        <Link 
          href="/about" 
          className="text-white hover:text-pink-200 transition-colors"
        >
          About
        </Link>
      </nav>

      <div className="slot-machine">
        <div className="slot-window">
          {letters.map(({ char, index }) => (
            <div key={index} className="slot-reel">
              <div className={`slot-letter slot-letter-${index} text-6xl md:text-8xl`}>
                {char}
              </div>
            </div>
          ))}
        </div>
        <div className="slot-handle"></div>
      </div>

      <p className="mt-8 text-white text-base md:text-lg text-center">
        The Future of Decentralized Gaming
      </p>
      <button 
        onClick={() => setIsModalOpen(true)}
        className="mt-12 px-8 py-4 bg-[#ff69b4] hover:bg-[#ff1493] 
                   transition-colors rounded-2xl text-white text-sm
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
