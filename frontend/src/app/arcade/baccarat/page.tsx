'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { daydream } from '../../fonts'
import Image from 'next/image'
import { useCasino } from '@/contexts/CasinoContext'
import { CasinoClient } from '@/lib/casino-client'
import { useAudio } from '@/contexts/SettingsContext'
import SettingsMenu from '@/components/SettingsMenu'

type Suit = 'hearts' | 'diamonds' | 'spades' | 'clubs'
type Value = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'
type BetType = 'player' | 'banker' | 'tie' | null
type GamePhase = 'betting' | 'dealing' | 'result'

interface Card {
  suit: Suit
  value: Value
  numerical: number
}

interface Hand {
  cards: Card[]
  total: number
}

interface BaccaratResult {
  winner: 'player' | 'banker' | 'tie'
  playerHand: Hand
  bankerHand: Hand
  won: boolean
}

export default function Baccarat() {
  const { casinoClient, isConnected } = useCasino()
  const [balance, setBalance] = useState(0)
  const [betAmount, setBetAmount] = useState(10)
  const [selectedBet, setSelectedBet] = useState<BetType>(null)
  const [gamePhase, setGamePhase] = useState<GamePhase>('betting')
  const [playerHand, setPlayerHand] = useState<Hand>({ cards: [], total: 0 })
  const [bankerHand, setBankerHand] = useState<Hand>({ cards: [], total: 0 })
  const [gameResult, setGameResult] = useState<BaccaratResult | null>(null)
  const [dealingCard, setDealingCard] = useState<number>(0) // 0-6 for dealing sequence

  // Audio hooks using settings
  const dealAudio = useAudio('/audio/deal.mp3', { volume: 0.5 })
  const goodAudio = useAudio('/audio/good.mp3', { volume: 0.8 })
  const badAudio = useAudio('/audio/bad.mp3', { volume: 0.8 })

  const fetchBalance = async (casinoClient: CasinoClient) => {
    try {
      const koins = await casinoClient.get_koins()
      setBalance(koins)
    } catch (error) {
      console.error('Error fetching balance:', error)
    }
  }

  useEffect(() => {
    if (!casinoClient || !isConnected) return
    fetchBalance(casinoClient)
  }, [casinoClient, isConnected])

  // Create deck and card utilities
  const createCard = (suit: Suit, value: Value): Card => {
    let numerical = 0
    if (value === 'A') numerical = 1
    else if (['J', 'Q', 'K'].includes(value)) numerical = 0
    else numerical = parseInt(value)

    return { suit, value, numerical }
  }

  const calculateHandValue = (cards: Card[]): number => {
    console.log(cards)
    const total = cards.reduce((sum, card) => sum + card.numerical, 0)
    console.log(total)

    return total % 10 // Baccarat rule: only last digit matters
  }

  const createShuffledDeck = (): Card[] => {
    const suits: Suit[] = ['hearts', 'diamonds', 'spades', 'clubs']
    const values: Value[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
    const deck: Card[] = []

    for (const suit of suits) {
      for (const value of values) {
        deck.push(createCard(suit, value))
      }
    }

    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[deck[i], deck[j]] = [deck[j], deck[i]]
    }

    return deck
  }

  const getBetMultiplier = (betType: BetType): number => {
    switch (betType) {
      case 'player':
        return 2
      case 'banker':
        return 2
      case 'tie':
        return 9
      default:
        return 1
    }
  }

  const shouldDrawThirdCard = (
    playerTotal: number,
    bankerTotal: number,
    playerThirdCard?: Card
  ): { player: boolean; banker: boolean } => {
    // Player third card rules
    const playerDraws = playerTotal <= 5

    // Banker third card rules (more complex)
    let bankerDraws = false
    if (!playerDraws) {
      // Player stands, banker draws on 0-5
      bankerDraws = bankerTotal <= 5
    } else if (playerThirdCard) {
      // Player drew third card, banker rules depend on player's third card
      const thirdCardValue = playerThirdCard.numerical
      switch (bankerTotal) {
        case 0:
        case 1:
        case 2:
          bankerDraws = true
          break
        case 3:
          bankerDraws = thirdCardValue !== 8
          break
        case 4:
          bankerDraws = [2, 3, 4, 5, 6, 7].includes(thirdCardValue)
          break
        case 5:
          bankerDraws = [4, 5, 6, 7].includes(thirdCardValue)
          break
        case 6:
          bankerDraws = [6, 7].includes(thirdCardValue)
          break
        default:
          bankerDraws = false
      }
    }

    return { player: playerDraws, banker: bankerDraws }
  }

  const playDealSound = () => {
    dealAudio.play()
  }

  const handleDeal = async () => {
    if (!selectedBet || !casinoClient || gamePhase !== 'betting' || balance < betAmount) return

    setGamePhase('dealing')
    setPlayerHand({ cards: [], total: 0 })
    setBankerHand({ cards: [], total: 0 })
    setGameResult(null)
    setDealingCard(0)

    try {
      // Get result from casino client
      const multiplier = getBetMultiplier(selectedBet)
      const result = await casinoClient.play(betAmount, multiplier)

      // Debit bet amount
      setBalance((prev) => prev - betAmount)

      // Determine what visual outcome we need based on bet and result
      let targetWinner: 'player' | 'banker' | 'tie'
      if (selectedBet === 'player') {
        targetWinner = result.won ? 'player' : 'banker'
      } else if (selectedBet === 'banker') {
        targetWinner = result.won ? 'banker' : 'player'
      } else {
        // tie bet
        targetWinner = result.won ? 'tie' : Math.random() < 0.5 ? 'player' : 'banker'
      }

      // Generate hands that achieve the target outcome
      const { finalPlayerHand, finalBankerHand } = generateTargetedHands(targetWinner)

      // Arrange cards in dealing order: Player, Banker, Player, Banker, then any third cards
      const dealingOrder: { card: Card; isPlayer: boolean }[] = []

      // Initial 4 cards
      dealingOrder.push({ card: finalPlayerHand.cards[0], isPlayer: true })
      dealingOrder.push({ card: finalBankerHand.cards[0], isPlayer: false })
      dealingOrder.push({ card: finalPlayerHand.cards[1], isPlayer: true })
      dealingOrder.push({ card: finalBankerHand.cards[1], isPlayer: false })

      // Third cards if they exist
      if (finalPlayerHand.cards[2]) {
        dealingOrder.push({ card: finalPlayerHand.cards[2], isPlayer: true })
      }
      if (finalBankerHand.cards[2]) {
        dealingOrder.push({ card: finalBankerHand.cards[2], isPlayer: false })
      }

      // Animate the dealing
      const newPlayerHand: Hand = { cards: [], total: 0 }
      const newBankerHand: Hand = { cards: [], total: 0 }

      dealingOrder.forEach((dealItem, index) => {
        setTimeout(() => {
          playDealSound()
          setDealingCard(index + 1)

          if (dealItem.isPlayer) {
            newPlayerHand.cards.push(dealItem.card)
            newPlayerHand.total = calculateHandValue(newPlayerHand.cards)
            setPlayerHand({ ...newPlayerHand })
          } else {
            newBankerHand.cards.push(dealItem.card)
            newBankerHand.total = calculateHandValue(newBankerHand.cards)
            setBankerHand({ ...newBankerHand })
          }

          // Finish game after last card
          if (index === dealingOrder.length - 1) {
            setTimeout(() => {
              const gameResult: BaccaratResult = {
                winner: targetWinner,
                playerHand: finalPlayerHand,
                bankerHand: finalBankerHand,
                won: result.won,
              }

              setGameResult(gameResult)
              setGamePhase('result')

              // Handle winnings and audio
              if (result.won) {
                setBalance((prev) => prev + betAmount * multiplier)
                goodAudio.play()
              } else {
                badAudio.play()
              }
            }, 1000)
          }
        }, index * 800) // 800ms between cards
      })
    } catch (error) {
      console.error('Error placing bet:', error)
      setGamePhase('betting')
    }
  }

  const generateTargetedHands = (
    targetWinner: 'player' | 'banker' | 'tie'
  ): { finalPlayerHand: Hand; finalBankerHand: Hand } => {
    const deck = createShuffledDeck()
    let attempts = 0
    const maxAttempts = 1000

    while (attempts < maxAttempts) {
      const shuffledDeck = [...deck].sort(() => Math.random() - 0.5)
      let deckIndex = 0

      // Deal initial two cards each
      const playerCards: Card[] = [shuffledDeck[deckIndex++], shuffledDeck[deckIndex++]]
      const bankerCards: Card[] = [shuffledDeck[deckIndex++], shuffledDeck[deckIndex++]]

      let playerTotal = calculateHandValue(playerCards)
      let bankerTotal = calculateHandValue(bankerCards)

      // Check for natural (8 or 9)
      const playerNatural = playerTotal >= 8
      const bankerNatural = bankerTotal >= 8

      if (!playerNatural && !bankerNatural) {
        // Apply third card rules
        const thirdCardRules = shouldDrawThirdCard(playerTotal, bankerTotal)
        let playerThirdCard: Card | undefined

        if (thirdCardRules.player) {
          playerThirdCard = shuffledDeck[deckIndex++]
          playerCards.push(playerThirdCard)
          playerTotal = calculateHandValue(playerCards)
        }

        const finalBankerRules = shouldDrawThirdCard(playerTotal, bankerTotal, playerThirdCard)
        if (finalBankerRules.banker) {
          bankerCards.push(shuffledDeck[deckIndex++])
          bankerTotal = calculateHandValue(bankerCards)
        }
      }

      // Check if this outcome matches our target
      let actualWinner: 'player' | 'banker' | 'tie'
      if (playerTotal > bankerTotal) {
        actualWinner = 'player'
      } else if (bankerTotal > playerTotal) {
        actualWinner = 'banker'
      } else {
        actualWinner = 'tie'
      }

      if (actualWinner === targetWinner) {
        return {
          finalPlayerHand: { cards: playerCards, total: playerTotal },
          finalBankerHand: { cards: bankerCards, total: bankerTotal },
        }
      }

      attempts++
    }

    // Fallback: force the outcome if we can't find a natural one
    return forceTargetOutcome(targetWinner, deck)
  }

  const forceTargetOutcome = (
    targetWinner: 'player' | 'banker' | 'tie',
    deck: Card[]
  ): { finalPlayerHand: Hand; finalBankerHand: Hand } => {
    // Create hands that guarantee the target outcome
    let playerCards: Card[]
    let bankerCards: Card[]

    if (targetWinner === 'tie') {
      // Force a tie - both hands total to same value
      const targetTotal = 7 // Common tie value
      playerCards = findCardsForTotal(deck, targetTotal)
      bankerCards = findCardsForTotal(deck, targetTotal)
    } else if (targetWinner === 'player') {
      // Player wins
      playerCards = findCardsForTotal(deck, 8) // Player gets 8
      bankerCards = findCardsForTotal(deck, 6) // Banker gets 6
    } else {
      // Banker wins
      playerCards = findCardsForTotal(deck, 5) // Player gets 5
      bankerCards = findCardsForTotal(deck, 7) // Banker gets 7
    }

    return {
      finalPlayerHand: { cards: playerCards, total: calculateHandValue(playerCards) },
      finalBankerHand: { cards: bankerCards, total: calculateHandValue(bankerCards) },
    }
  }

  const findCardsForTotal = (deck: Card[], targetTotal: number): Card[] => {
    // Find two cards that sum to target total (or close to it)
    for (let i = 0; i < deck.length - 1; i++) {
      for (let j = i + 1; j < deck.length; j++) {
        const total = (deck[i].numerical + deck[j].numerical) % 10
        if (total === targetTotal) {
          return [deck[i], deck[j]]
        }
      }
    }

    // Fallback: return first two cards
    return [deck[0], deck[1]]
  }

  const resetGame = () => {
    setGamePhase('betting')
    setPlayerHand({ cards: [], total: 0 })
    setBankerHand({ cards: [], total: 0 })
    setGameResult(null)
    setDealingCard(0)
  }

  // Add wallet connection check
  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f5132]">
        <h1 className={`text-2xl text-white mb-4 ${daydream.className}`}>
          <Link
            href="/arcade/dashboard"
            className="text-green-200 hover:text-green-300 underline-offset-[14px] underline"
          >
            Please connect your wallet to play
          </Link>
        </h1>
      </div>
    )
  }

  if (balance === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f5132]">
        <h1 className={`text-2xl text-white mb-4 ${daydream.className}`}>
          Deposit some SOL in the{' '}
          <Link href="/arcade/dashboard" className="text-green-200 hover:text-green-300">
            casino
          </Link>{' '}
          to play
        </h1>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-green-900 via-green-800 to-green-900 relative overflow-hidden">
      {/* Casino table background */}
      <div className="absolute inset-0 bg-[url('/game/felt.jpg')] opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />

      {/* Decorative border */}
      <div className="absolute inset-4 border-2 border-yellow-500/20 rounded-lg" />

      {/* Settings Menu */}
      <SettingsMenu />

      <nav className="fixed top-0 right-0 p-4 md:p-6 z-10">
        <div className="flex gap-4">
          <Link
            href="/arcade"
            className={`text-lg md:text-xl text-white hover:text-green-200 transition-colors ${daydream.className}`}
          >
            Back to Arcade
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-4 relative">
        {/* Game Title / Result */}
        <div className="mb-8 text-center h-32 md:h-40 flex flex-col justify-center">
          {gameResult && gamePhase === 'result' ? (
            <div>
              <h1
                className={`text-3xl md:text-5xl text-white mb-2 text-center ${daydream.className}`}
              >
                {gameResult.winner.toUpperCase()} WINS!
              </h1>
              {gameResult.won ? (
                <div className="text-center">
                  <p
                    className={`text-2xl md:text-3xl text-yellow-400 font-bold ${daydream.className}`}
                  >
                    YOU WIN!
                  </p>
                  <p className={`text-xl md:text-2xl text-white ${daydream.className}`}>
                    + {Math.floor(betAmount * getBetMultiplier(selectedBet!))}
                  </p>
                </div>
              ) : (
                <p className={`text-xl md:text-2xl text-red-400 ${daydream.className}`}>
                  Better luck next time!
                </p>
              )}
            </div>
          ) : (
            <h1
              className={`text-4xl md:text-6xl text-yellow-400 text-center ${daydream.className}`}
            >
              Baccarat
            </h1>
          )}
        </div>

        {/* Balance Display */}
        <div className="mb-8">
          <p className={`text-xl md:text-2xl text-white font-bold text-center`}>
            Balance: {balance}
          </p>
        </div>

        {/* Game Table */}
        <div className="w-full max-w-6xl bg-green-800/40 rounded-2xl p-6 md:p-8 border-2 border-yellow-500/30 backdrop-blur-sm">
          {/* Banker Section */}
          <div className="mb-8">
            <h2
              className={`text-2xl md:text-3xl text-white mb-4 text-center ${daydream.className}`}
            >
              BANKER ({bankerHand.total})
            </h2>
            <div className="flex justify-center gap-2 md:gap-4 min-h-[120px] items-center">
              {bankerHand.cards.map((card, index) => (
                <div key={index} className="relative">
                  <Image
                    src={`/cards/${card.suit}_${card.value}.png`}
                    alt={`${card.value} of ${card.suit}`}
                    width={80}
                    height={112}
                    className="rounded-lg shadow-xl transition-all duration-500 hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* VS Divider */}
          <div className="text-center mb-8">
            <div className={`text-3xl md:text-4xl text-yellow-400 font-bold ${daydream.className}`}>
              VS
            </div>
          </div>

          {/* Player Section */}
          <div className="mb-8">
            <h2
              className={`text-2xl md:text-3xl text-white mb-4 text-center ${daydream.className}`}
            >
              PLAYER ({playerHand.total})
            </h2>
            <div className="flex justify-center gap-2 md:gap-4 min-h-[120px] items-center">
              {playerHand.cards.map((card, index) => (
                <div key={index} className="relative">
                  <Image
                    src={`/cards/${card.suit}_${card.value}.png`}
                    alt={`${card.value} of ${card.suit}`}
                    width={80}
                    height={112}
                    className="rounded-lg shadow-xl transition-all duration-500 hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Betting Controls */}
          {gamePhase === 'betting' && (
            <div className="bg-black/20 rounded-xl p-4 md:p-6 border border-yellow-500/20">
              <div className="flex flex-col items-center gap-4 md:gap-6">
                {/* Bet Selection */}
                <div className="flex gap-2 md:gap-4 flex-wrap justify-center">
                  <button
                    onClick={() => setSelectedBet('player')}
                    className={`px-4 py-3 rounded-lg text-lg font-bold transition-all ${
                      selectedBet === 'player'
                        ? 'bg-blue-600 text-white scale-105'
                        : 'bg-white/10 hover:bg-white/20 text-white hover:scale-105'
                    } ${daydream.className}`}
                  >
                    PLAYER (2x)
                  </button>
                  <button
                    onClick={() => setSelectedBet('banker')}
                    className={`px-4 py-3 rounded-lg text-lg font-bold transition-all ${
                      selectedBet === 'banker'
                        ? 'bg-red-600 text-white scale-105'
                        : 'bg-white/10 hover:bg-white/20 text-white hover:scale-105'
                    } ${daydream.className}`}
                  >
                    BANKER (2x)
                  </button>
                  <button
                    onClick={() => setSelectedBet('tie')}
                    className={`px-4 py-3 rounded-lg text-lg font-bold transition-all ${
                      selectedBet === 'tie'
                        ? 'bg-purple-600 text-white scale-105'
                        : 'bg-white/10 hover:bg-white/20 text-white hover:scale-105'
                    } ${daydream.className}`}
                  >
                    TIE (9x)
                  </button>
                </div>

                {/* Bet Amount */}
                <div className="flex gap-4 items-center">
                  <label className={`text-white text-lg ${daydream.className}`}>Bet Amount:</label>
                  <input
                    type="number"
                    min="1"
                    max={balance}
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 px-3 py-2 bg-white/10 text-white rounded border border-yellow-500/20 focus:outline-none focus:border-yellow-500/40"
                  />
                </div>

                {/* Deal Button */}
                <button
                  onClick={handleDeal}
                  disabled={!selectedBet || balance < betAmount}
                  className={`px-8 py-3 rounded-lg text-xl font-bold transition-all ${
                    !selectedBet || balance < betAmount
                      ? 'bg-gray-500 cursor-not-allowed text-white'
                      : 'bg-yellow-600 hover:bg-yellow-700 text-black hover:scale-105 shadow-lg hover:shadow-yellow-500/25'
                  } ${daydream.className}`}
                >
                  DEAL CARDS
                </button>
              </div>
            </div>
          )}

          {/* Dealing Phase */}
          {gamePhase === 'dealing' && (
            <div className="text-center">
              <p className={`text-2xl text-white animate-pulse ${daydream.className}`}>
                Dealing cards... ({dealingCard}/6)
              </p>
            </div>
          )}

          {/* Result Phase */}
          {gamePhase === 'result' && (
            <div className="text-center">
              <button
                onClick={resetGame}
                className={`px-8 py-3 rounded-lg text-xl font-bold bg-yellow-600 hover:bg-yellow-700 text-black transition-all hover:scale-105 ${daydream.className}`}
              >
                DEAL AGAIN
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
