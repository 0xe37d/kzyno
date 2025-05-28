import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  ConfirmedTransactionMeta,
} from '@solana/web3.js'
import { buildPlayGameData } from '@/lib/solana/serialization'
import idl from '@shared/anchor/idl/kzyno.json'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PROGRAM_ID = new PublicKey(idl.address) // <- from idl
const ADMIN_KEY = JSON.parse(process.env.ADMIN_PRIVATE_KEY!) // `[1,2,3,..]`
const JWT_SECRET = process.env.JWT_SECRET
const DEVNET_RPC_URL = process.env.DEVNET_RPC_URL

export const runtime = 'edge'

function getPlayResult(meta: ConfirmedTransactionMeta | null | undefined) {
  if (!meta?.logMessages) return null

  // find the first "Program data:" line
  const line = meta.logMessages.find((l) => l.startsWith('Program data:'))
  if (!line) return null

  // strip prefix and decode base-64 → Buffer
  const b64 = line.slice('Program data:'.length).trim()
  const buf = Buffer.from(b64, 'base64')

  if (buf.length < 9) return null // sanity
  const won = buf[8] === 1 // bool as u8
  return { won }
}

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
    const { bet, multiplier, cluster } = await request.json()
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

    /* 1. admin signer ---------------------------------------------------- */
    const adminKeypair = Keypair.fromSecretKey(Uint8Array.from(ADMIN_KEY))

    /* 2. connection (HTTP fetch, works in workers) ----------------------- */
    const connection = new Connection(cluster.includes('devnet') ? DEVNET_RPC_URL : cluster, {
      commitment: 'confirmed',
      wsEndpoint: undefined, // <- prevents any WebSocket attempt
    })

    /* 3. derive PDAs ----------------------------------------------------- */
    const [globalState] = PublicKey.findProgramAddressSync(
      [new TextEncoder().encode('global_state')],
      PROGRAM_ID
    )
    const [userBalance] = PublicKey.findProgramAddressSync(
      [new TextEncoder().encode('user_balance'), new PublicKey(user).toBuffer()],
      PROGRAM_ID
    )
    const [vaultAccount] = PublicKey.findProgramAddressSync(
      [new TextEncoder().encode('vault')],
      PROGRAM_ID
    )

    /* 4. build instruction ---------------------------------------------- */
    const rngSeed = Math.floor(Math.random() * 1e7)
    const data = await buildPlayGameData(multiplier, rngSeed, bet)

    const keys = [
      { pubkey: adminKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: userBalance, isSigner: false, isWritable: true },
      { pubkey: globalState, isSigner: false, isWritable: true },
      { pubkey: vaultAccount, isSigner: false, isWritable: true },
      { pubkey: new PublicKey(user), isSigner: false, isWritable: true },

      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys,
      data: Buffer.from(data),
    })

    /* 5. assemble + sign ------------------------------------------------- */
    const { blockhash } = await connection.getLatestBlockhash('finalized')

    const tx = new Transaction({
      feePayer: adminKeypair.publicKey,
      recentBlockhash: blockhash,
    }).add(ix)

    tx.sign(adminKeypair) // sync sign ok in edge

    /* 6. send + confirm -------------------------------------------------- */
    const sig = await connection.sendRawTransaction(tx.serialize())
    await confirmTxHttp(connection, sig, 'confirmed')

    /* 7. optional: read logs to know win/loss --------------------------- */
    const { meta } = (await connection.getTransaction(sig, { commitment: 'confirmed' })) || {}
    const result = getPlayResult(meta)
    const won = result?.won ?? false

    const amountChange = won ? bet * (multiplier - 1) : -bet

    return new NextResponse(JSON.stringify({ won, amount_change: amountChange }), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new NextResponse(JSON.stringify({ error: 'failed' }), { status: 500 })
  }
}
