import { CasinoProvider } from '@/contexts/CasinoContext'

export default function ArcadeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <select
        className="fixed z-50 top-4 left-4 p-2 bg-gray-800 text-white rounded"
        defaultValue={'http://127.0.0.1:8899'}
      >
        <option value="https://api.mainnet-beta.solana.com">Mainnet</option>
        <option value="https://api.devnet.solana.com">Devnet</option>
        <option value="http://127.0.0.1:8899">Localhost</option>
      </select>
      <CasinoProvider>{children}</CasinoProvider>
    </>
  )
}
