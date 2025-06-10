'use client'
import { CasinoProvider } from '@/contexts/CasinoContext'
import { useSettings } from '@/contexts/SettingsContext'

export default function ArcadeLayout({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings()

  return <CasinoProvider cluster={settings.rpcCluster}>{children}</CasinoProvider>
}
