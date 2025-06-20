'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type RpcCluster = 'mainnet-beta' | 'devnet' | 'localhost'

interface Settings {
  isMuted: boolean
  horseRaceSpeed: 'normal' | 'fast' | 'instant'
  rpcCluster: RpcCluster
}

interface SettingsContextType {
  settings: Settings
  updateSettings: (newSettings: Partial<Settings>) => void
  toggleMute: () => void
  setHorseRaceSpeed: (speed: 'normal' | 'fast' | 'instant') => void
  setRpcCluster: (cluster: RpcCluster) => void
}

const defaultSettings: Settings = {
  isMuted: false,
  horseRaceSpeed: 'normal',
  rpcCluster: 'mainnet-beta',
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

const STORAGE_KEY = 'kzyno-casino-settings'

interface SettingsProviderProps {
  children: ReactNode
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsedSettings = JSON.parse(stored) as Partial<Settings>
        setSettings((prev) => ({ ...prev, ...parsedSettings }))
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (!isLoaded) return // Don't save initial default values

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (error) {
      console.warn('Failed to save settings to localStorage:', error)
    }
  }, [settings, isLoaded])

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))
  }

  const toggleMute = () => {
    setSettings((prev) => ({ ...prev, isMuted: !prev.isMuted }))
  }

  const setHorseRaceSpeed = (speed: 'normal' | 'fast' | 'instant') => {
    setSettings((prev) => ({ ...prev, horseRaceSpeed: speed }))
  }

  const setRpcCluster = (cluster: RpcCluster) => {
    setSettings((prev) => ({ ...prev, rpcCluster: cluster }))
  }

  const value: SettingsContextType = {
    settings,
    updateSettings,
    toggleMute,
    setHorseRaceSpeed,
    setRpcCluster,
  }

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

// Custom hook for audio management that respects mute settings
export function useAudio(audioSrc: string, options?: { volume?: number; loop?: boolean }) {
  const { settings } = useSettings()
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audioElement = new Audio(audioSrc)

    if (options?.volume !== undefined) {
      audioElement.volume = options.volume
    }

    if (options?.loop) {
      audioElement.loop = options.loop
    }

    setAudio(audioElement)

    return () => {
      audioElement.pause()
      audioElement.src = ''
    }
  }, [audioSrc, options?.volume, options?.loop])

  const play = async () => {
    if (!audio || settings.isMuted) return

    try {
      audio.currentTime = 0
      await audio.play()
    } catch (error) {
      console.log('Audio play failed:', error)
    }
  }

  const pause = () => {
    if (audio) {
      audio.pause()
    }
  }

  const stop = () => {
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
  }

  return { play, pause, stop, audio }
}
