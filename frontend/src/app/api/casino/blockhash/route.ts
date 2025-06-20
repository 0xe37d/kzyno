import { Connection } from '@solana/web3.js'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET
const DEVNET_RPC_URL = process.env.DEVNET_RPC_URL || 'https://api.devnet.solana.com'
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const { cluster } = await request.json()
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (!JWT_SECRET) {
      return NextResponse.json({ error: 'JWT_SECRET is not set' }, { status: 500 })
    }

    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET))
    const user = payload.pubkey

    if (!user) {
      const response = NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      response.cookies.delete('auth_token')
      return response
    }

    let clusterEndpoint: string
    if (cluster === 'devnet') {
      clusterEndpoint = DEVNET_RPC_URL
    } else if (cluster === 'localhost') {
      clusterEndpoint = 'http://127.0.0.1:8899'
    } else {
      clusterEndpoint = MAINNET_RPC_URL
    }

    const connection = new Connection(clusterEndpoint, {
      commitment: 'confirmed',
      wsEndpoint: undefined,
    })

    // Get the latest blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized')

    return NextResponse.json({
      blockhash,
      lastValidBlockHeight,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to get blockhash' }, { status: 500 })
  }
}
