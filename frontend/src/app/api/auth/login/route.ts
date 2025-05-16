import { NextResponse } from 'next/server'
import { PublicKey } from '@solana/web3.js'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import { SignJWT } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key' // Use environment variable in production
export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const { pubkey, timestamp, signature } = await request.json()

    // Verify timestamp is recent (within 5 minutes)
    const now = Date.now()
    if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Challenge expired' }, { status: 401 })
    }

    // Verify signature
    const message = `kzyno:${timestamp}`
    const pubkeyBytes = new PublicKey(pubkey).toBytes()
    const signatureBytes = bs58.decode(signature)

    const isValid = nacl.sign.detached.verify(
      new TextEncoder().encode(message),
      signatureBytes,
      pubkeyBytes
    )

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Create JWT
    const token = await new SignJWT({ pubkey })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
      .sign(new TextEncoder().encode(JWT_SECRET))

    // Set JWT as HTTP-only cookie
    const response = NextResponse.json({ success: true })
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
