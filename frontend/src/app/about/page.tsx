'use client'

import React from 'react'
import Link from 'next/link'
import { daydream } from '../fonts'
import { NEXT_PUBLIC_COMMIT_HASH } from '../commit-hash'

export default function About() {
  return (
    <div className="min-h-screen flex flex-col">
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

      <main className="flex-1 flex items-center justify-center p-4 pt-16 md:pt-20">
        <div className="w-full md:max-w-6xl mx-auto px-2 md:px-0">
          <h1 className={`text-3xl md:text-6xl text-white font-bold mb-6 md:mb-8 ${daydream.className}`}>
            About kzyno
          </h1>
          
          <div className="grid md:grid-cols-2 gap-3 md:gap-8 items-start">
            <section className="max-w-sm mx-auto md:max-w-none w-full bg-[#2a0a1f] p-3 md:p-6 rounded-xl md:rounded-2xl border-2 border-[#ff69b4] shadow-[0_0_30px_rgba(255,20,147,0.3)] md:sticky md:top-8">
              <h2 className={`text-2xl text-white mb-4 ${daydream.className}`}>What is kzyno?</h2>
              <div className="space-y-4">
                <p className="text-pink-100 leading-relaxed">
                  this is a decentralized casino. it&apos;s not owned by a company, a person, or any central entity. it&apos;s just code—open, transparent, and running on the blockchain. anyone can interact with it, from anywhere, without permission. no gatekeepers, no middlemen. just the game, as it should be.
                </p>
                <p className="text-pink-100 leading-relaxed">
                  but it&apos;s more than that. when you play here, you&apos;re not just a player. you can own a piece of the casino itself. through tokens, you become a stakeholder. and as a stakeholder, you share in the profits. all of them. the contract is designed to return everything to the token holders. no cuts, no skimming, no hidden fees. just a direct flow of value back to the people who are part of it.
                </p>
                <p className="text-pink-100 leading-relaxed">
                  this flips the script. traditionally, the house always wins, and players are left with nothing. here, the players are the house. the line between the two disappears. it&apos;s a fairer system, one where the incentives align with the community, not some distant corporation.
                </p>
                <p className="text-pink-100 leading-relaxed">
                  it&apos;s not about reinventing gambling. it&apos;s about rethinking who benefits from it. this is a casino where transparency and ownership are built into the foundation. where the rules are clear, the code is open, and the value flows back to the people who make it work.
                </p>
                <p className="text-pink-100 leading-relaxed">
                  this isn&apos;t just a casino. it&apos;s a different way of doing things. one where freedom isn&apos;t an abstract idea—it&apos;s how the system operates. 
                </p>
              </div>
              <div className="mt-8 pt-6 border-t border-[#ff69b4] border-opacity-30">
                <div className="font-mono text-xs text-pink-300">LATEST COMMIT</div>
                <a
                  href={`https://github.com/0xe37d/kzyno/${NEXT_PUBLIC_COMMIT_HASH ? 'commit/' + NEXT_PUBLIC_COMMIT_HASH : ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm hover:text-[#ff69b4] transition-colors flex items-center gap-2 group"
                >
                  <span className="text-pink-200 group-hover:text-[#ff69b4]">$</span>
                  <span className="text-pink-100">git rev-parse HEAD</span>
                  <span className="text-[#ff69b4]">=</span>
                  <span className="text-white">
                    {NEXT_PUBLIC_COMMIT_HASH ? (
                      <>
                        <span className="md:hidden">{NEXT_PUBLIC_COMMIT_HASH.slice(0, 7)}</span>
                        <span className="hidden md:inline">{NEXT_PUBLIC_COMMIT_HASH}</span>
                      </>
                    ) : 'main'}
                  </span>
                </a>
              </div>
            </section>

            <div className="w-full space-y-3 md:space-y-8">
              <section className="max-w-sm mx-auto md:max-w-none bg-[#2a0a1f] p-3 md:p-6 rounded-xl md:rounded-2xl border-2 border-[#ff69b4] shadow-[0_0_30px_rgba(255,20,147,0.3)]">
                <h2 className={`text-xl md:text-2xl text-white mb-3 md:mb-4 ${daydream.className}`}>Why Choose kzyno?</h2>
                <ul className="text-pink-100 space-y-3">
                  <li className="flex items-start">
                    <span className="text-[#ff69b4] mr-2">•</span>
                    <span>Provably fair gaming mechanics</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[#ff69b4] mr-2">•</span>
                    <span>Instant deposits and withdrawals</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[#ff69b4] mr-2">•</span>
                    <span>No account registration required</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[#ff69b4] mr-2">•</span>
                    <span>Community-driven governance</span>
                  </li>
                </ul>
              </section>

              <section className="max-w-sm mx-auto md:max-w-none bg-[#2a0a1f] p-3 md:p-6 rounded-xl md:rounded-2xl border-2 border-[#ff69b4] shadow-[0_0_30px_rgba(255,20,147,0.3)]">
                <h2 className={`text-xl md:text-2xl text-white mb-3 md:mb-4 ${daydream.className}`}>Tokenomics</h2>
                <ul className="text-pink-100 space-y-3">
                  <li className="flex items-start">
                    <span className="text-[#ff69b4] mr-2">•</span>
                    <span>$KZYNO token for governance and rewards</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[#ff69b4] mr-2">•</span>
                    <span>100% of profits distributed to token holders</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[#ff69b4] mr-2">•</span>
                    <span>Play-to-earn mechanics</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[#ff69b4] mr-2">•</span>
                    <span>Deflationary token model</span>
                  </li>
                </ul>
              </section>

              <section className="max-w-sm mx-auto md:max-w-none bg-[#2a0a1f] p-3 md:p-6 rounded-xl md:rounded-2xl border-2 border-[#ff69b4] shadow-[0_0_30px_rgba(255,20,147,0.3)]">
                <h2 className={`text-xl md:text-2xl text-white mb-3 md:mb-4 ${daydream.className}`}>Roadmap</h2>
                <div className="space-y-4 text-pink-100">
                  <div>
                    <h3 className={`text-[#ff69b4] ${daydream.className}`}>Q1 2025</h3>
                    <p>Platform development and smart contract audits</p>
                  </div>
                  <div>
                    <h3 className={`text-[#ff69b4] ${daydream.className}`}>Q2 2025</h3>
                    <p>Token launch and initial game releases</p>
                  </div>
                  <div>
                    <h3 className={`text-[#ff69b4] ${daydream.className}`}>Q3 2025</h3>
                    <p>Expanded game selection</p>
                  </div>
                  <div>
                    <h3 className={`text-[#ff69b4] ${daydream.className}`}>Q4 2025</h3>
                    <p>DAO governance implementation</p>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/"
              className={`inline-block px-8 py-4 bg-[#2a0a1f] text-white rounded-2xl border-2 border-[#ff69b4] 
                       hover:bg-[#ff69b4] transition-colors shadow-[0_0_15px_rgba(255,20,147,0.3)]
                       ${daydream.className}`}
            >
              Join the Revolution
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
} 