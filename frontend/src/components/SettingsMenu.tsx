'use client'

import React, { useState } from 'react'
import { useSettings } from '@/contexts/SettingsContext'
import { daydream } from '@/app/fonts'

export default function SettingsMenu() {
  const { settings, toggleMute, setHorseRaceSpeed, setRpcCluster } = useSettings()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="fixed top-4 left-4 z-50">
      {/* Settings Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-12 h-12 bg-black/60 hover:bg-black/80 rounded-full 
          flex items-center justify-center text-white transition-all duration-300
          border border-white/20 hover:border-white/40 backdrop-blur-sm
          ${isOpen ? 'scale-110' : 'hover:scale-105'}
        `}
        aria-label="Settings"
      >
        <svg
          className={`w-6 h-6 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {/* Settings Panel */}
      {isOpen && (
        <div className="absolute top-16 left-0 w-80 bg-black/90 backdrop-blur-lg rounded-xl border border-white/20 p-6 shadow-2xl animate-in slide-in-from-top-2 duration-300">
          <h3 className={`text-xl text-white mb-6 font-bold ${daydream.className}`}>Settings ⚙️</h3>

          {/* Audio Settings */}
          <div className="mb-6">
            <h4 className={`text-lg text-white mb-3 ${daydream.className}`}>Audio</h4>
            <button
              onClick={toggleMute}
              className={`
                w-full px-4 py-3 rounded-lg text-left transition-all duration-200 flex items-center justify-between
                ${
                  settings.isMuted
                    ? 'bg-red-600/80 hover:bg-red-600 text-white'
                    : 'bg-green-600/80 hover:bg-green-600 text-white'
                }
              `}
            >
              <span className={daydream.className}>
                {settings.isMuted ? '🔇 Muted' : '🔊 Sound On'}
              </span>
              <div
                className={`w-12 h-6 rounded-full relative transition-colors ${settings.isMuted ? 'bg-red-800' : 'bg-green-800'}`}
              >
                <div
                  className={`
                  w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform duration-200
                  ${settings.isMuted ? 'translate-x-0.5' : 'translate-x-6'}
                `}
                />
              </div>
            </button>
          </div>

          {/* Horse Race Speed */}
          <div className="mb-6">
            <h4 className={`text-lg text-white mb-3 ${daydream.className}`}>Horse Race Speed 🐎</h4>
            <div className="space-y-2">
              {[
                { value: 'normal', label: '🐌 Normal', desc: 'Full race experience' },
                { value: 'fast', label: '⚡ Fast', desc: '2x speed' },
                { value: 'instant', label: '🚀 Instant', desc: 'Skip to results' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setHorseRaceSpeed(option.value as 'normal' | 'fast' | 'instant')}
                  className={`
                    w-full px-4 py-3 rounded-lg text-left transition-all duration-200
                    ${
                      settings.horseRaceSpeed === option.value
                        ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }
                  `}
                >
                  <div className={`font-semibold ${daydream.className}`}>{option.label}</div>
                  <div className="text-sm text-white/70">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* RPC Cluster */}
          <div className="mb-4">
            <h4 className={`text-lg text-white mb-3 ${daydream.className}`}>Network 🌐</h4>
            <div className="space-y-2">
              {[
                { value: 'localhost', label: '🧪 Localhost', desc: 'For testing' },
                { value: 'devnet', label: '🔧 Devnet', desc: 'Public testing' },
                { value: 'mainnet-beta', label: '🚀 Mainnet', desc: 'Production network' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    setRpcCluster(option.value as 'mainnet-beta' | 'devnet' | 'localhost')
                  }
                  className={`
                    w-full px-4 py-3 rounded-lg text-left transition-all duration-200
                    ${
                      settings.rpcCluster === option.value
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }
                  `}
                >
                  <div className={`font-semibold ${daydream.className}`}>{option.label}</div>
                  <div className="text-sm text-white/70">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setIsOpen(false)}
            className={`
              w-full mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg 
              transition-all duration-200 ${daydream.className}
            `}
          >
            Close
          </button>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && <div className="fixed inset-0 -z-10" onClick={() => setIsOpen(false)} />}
    </div>
  )
}
