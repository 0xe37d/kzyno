'use client'
import { CasinoProvider } from '@/contexts/CasinoContext'
import { useState } from 'react'

export default function ArcadeLayout({ children }: { children: React.ReactNode }) {
  const [cluster, setCluster] = useState('https://api.devnet.solana.com')
  const [isOpen, setIsOpen] = useState(false)

  const networks = [
    {
      value: 'https://api.mainnet-beta.solana.com',
      label: 'Mainnet',
      color: 'from-green-400 to-emerald-500',
      icon: '🌐',
    },
    {
      value: 'https://api.devnet.solana.com',
      label: 'Devnet',
      color: 'from-purple-400 to-pink-500',
      icon: '🚀',
    },
    {
      value: 'http://127.0.0.1:8899',
      label: 'Localhost',
      color: 'from-orange-400 to-red-500',
      icon: '💻',
    },
  ]

  const currentNetwork = networks.find((n) => n.value === cluster) || networks[1]

  return (
    <>
      {/* Futuristic Network Selector */}
      <div className="fixed z-50 top-4 left-4">
        <div className="relative">
          {/* Main Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="group relative overflow-hidden bg-gradient-to-r from-gray-900/90 to-black/90 backdrop-blur-md border border-cyan-500/30 rounded-xl px-4 py-3 transition-all duration-300 hover:border-cyan-400/60 hover:shadow-lg hover:shadow-cyan-500/25"
          >
            {/* Animated background */}
            <div
              className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-20 transition-opacity duration-300"
              style={{
                background: `linear-gradient(45deg, ${currentNetwork.color.replace('from-', '').replace(' to-', ', ')})`,
              }}
            />

            {/* Glowing border effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/20 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative flex items-center gap-3">
              <span className="text-lg">{currentNetwork.icon}</span>
              <div className="flex flex-col items-start">
                <span className="text-xs text-cyan-400 font-mono uppercase tracking-wider">
                  Network
                </span>
                <span className="text-white font-semibold">{currentNetwork.label}</span>
              </div>
              <div
                className={`w-2 h-2 rounded-full bg-gradient-to-r ${currentNetwork.color} animate-pulse`}
              />
              <svg
                className={`w-4 h-4 text-cyan-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </button>

          {/* Dropdown Menu */}
          <div
            className={`absolute top-full left-0 mt-2 w-64 transition-all duration-300 origin-top ${
              isOpen
                ? 'opacity-100 scale-100 translate-y-0'
                : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
            }`}
          >
            <div className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border border-cyan-500/30 rounded-xl overflow-hidden shadow-2xl shadow-cyan-500/10">
              {/* Header */}
              <div className="px-4 py-3 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-purple-500/10">
                <h3 className="text-cyan-400 font-mono text-sm uppercase tracking-wider">
                  Select Network
                </h3>
              </div>

              {/* Options */}
              <div className="p-2">
                {networks.map((network) => (
                  <button
                    key={network.value}
                    onClick={() => {
                      setCluster(network.value)
                      setIsOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group ${
                      cluster === network.value
                        ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/40'
                        : 'hover:bg-white/5 border border-transparent hover:border-white/10'
                    }`}
                  >
                    <span className="text-xl">{network.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="text-white font-medium">{network.label}</div>
                      <div className="text-xs text-gray-400 font-mono truncate">
                        {network.value}
                      </div>
                    </div>
                    <div
                      className={`w-3 h-3 rounded-full bg-gradient-to-r ${network.color} ${
                        cluster === network.value ? 'animate-pulse' : 'opacity-50'
                      }`}
                    />
                    {cluster === network.value && (
                      <svg
                        className="w-4 h-4 text-cyan-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-cyan-500/20 bg-gradient-to-r from-purple-500/5 to-cyan-500/5">
                <div className="text-xs text-gray-400 font-mono">
                  Status: <span className="text-green-400">Connected</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Click outside to close */}
        {isOpen && <div className="fixed inset-0 z-[-1]" onClick={() => setIsOpen(false)} />}
      </div>

      <CasinoProvider cluster={cluster}>{children}</CasinoProvider>

      {/* Custom styles */}
      <style jsx>{`
        @keyframes glow {
          0%,
          100% {
            box-shadow: 0 0 5px rgba(34, 211, 238, 0.3);
          }
          50% {
            box-shadow:
              0 0 20px rgba(34, 211, 238, 0.6),
              0 0 30px rgba(34, 211, 238, 0.3);
          }
        }

        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
      `}</style>
    </>
  )
}
