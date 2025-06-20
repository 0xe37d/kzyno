import { Connection } from '@solana/web3.js'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET
const DEVNET_RPC_URL = process.env.DEVNET_RPC_URL || 'https://api.devnet.solana.com'
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com'

export const runtime = 'edge'

async function confirmTxHttp(
  connection: Connection,
  sig: string,
  commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed',
  timeoutMs = 60_000
): Promise<void> {
  const start = Date.now()
  for (;;) {
    const res = await connection.getSignatureStatuses([sig], { searchTransactionHistory: true })
    const status = res.value[0]

    if (status?.confirmationStatus === commitment || status?.confirmations === null) {
      if (status?.err) throw status.err
      return // confirmed!
    }

    if (Date.now() - start > timeoutMs) throw new Error('confirmation timeout')

    await new Promise((r) => setTimeout(r, 500)) // 0.5 s back-off
  }
}

export async function POST(request: NextRequest) {
  try {
    const { serializedTransaction, cluster } = await request.json()
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

    // Deserialize the transaction from base64
    const transactionBuffer = Buffer.from(serializedTransaction, 'base64')

    // Send the transaction
    const signature = await connection.sendRawTransaction(transactionBuffer)

    // Confirm the transaction
    await confirmTxHttp(connection, signature, 'confirmed')

    return NextResponse.json({
      success: true,
      signature,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Transaction failed' }, { status: 500 })
  }
}
