import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { ethers } from 'ethers'
import { rateLimit } from '../../../lib/rate-limit'

export const runtime = 'edge'

// Validation functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function isValidWalletAddress(address: string): boolean {
  try {
    return ethers.isAddress(address)
  } catch {
    return false
  }
}

function sanitizeInput(input: string): string {
  return input.trim().toLowerCase()
}

export async function POST(req: Request) {
  try {
    // Rate limiting
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for') || 'unknown'
    const { success } = await rateLimit(ip)

    if (!success) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    const body = await req.json()
    const { email, walletAddress, twitter, discord } = body

    // Input validation
    if (!email || !walletAddress) {
      return new NextResponse(JSON.stringify({ error: 'Email and wallet address are required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email)
    const sanitizedWallet = sanitizeInput(walletAddress)
    const sanitizedTwitter = twitter ? sanitizeInput(twitter) : ''
    const sanitizedDiscord = discord ? sanitizeInput(discord) : ''

    // Validate email format
    if (!isValidEmail(sanitizedEmail)) {
      return new NextResponse(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // Validate wallet address
    if (!isValidWalletAddress(sanitizedWallet)) {
      return new NextResponse(JSON.stringify({ error: 'Invalid wallet address' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // Send to Discord
    await sendToDiscord({
      email: sanitizedEmail,
      wallet: sanitizedWallet,
      twitter: sanitizedTwitter,
      discord: sanitizedDiscord,
      ip,
    })

    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Airdrop submission error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })

    return new NextResponse(
      JSON.stringify({ error: 'Failed to submit entry. Please try again later.' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
}

async function sendToDiscord(data: {
  email: string
  wallet: string
  twitter?: string
  discord?: string
  ip: string
}) {
  const webhook = process.env.DISCORD_WEBHOOK_URL
  if (!webhook) {
    throw new Error('Discord webhook URL not configured')
  }

  const message = {
    embeds: [
      {
        title: '🎰 New Kzyno Airdrop Signup',
        color: 0xff69b4, // Pink
        fields: [
          { name: 'Email', value: data.email },
          { name: 'Wallet', value: data.wallet },
          { name: 'Twitter', value: data.twitter || 'Not provided' },
          { name: 'Discord', value: data.discord || 'Not provided' },
          { name: 'IP', value: data.ip },
          { name: 'Time', value: new Date().toISOString() },
        ],
      },
    ],
  }

  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  })

  if (!response.ok) {
    throw new Error('Failed to send Discord notification')
  }
}
