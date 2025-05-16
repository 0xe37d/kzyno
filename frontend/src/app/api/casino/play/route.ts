import { NextResponse } from 'next/server'
import { Connection, PublicKey, Keypair, SystemProgram, Signer } from '@solana/web3.js'
import { Program, AnchorProvider, BN, utils } from '@coral-xyz/anchor'
import idl from '@/lib/kzyno.json'
import type { Kzyno } from '@/lib/kzyno'

const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY

export const runtime = 'edge'

export async function POST(request: Request) {
  if (!ADMIN_PRIVATE_KEY) {
    throw new Error('ADMIN_PRIVATE_KEY environment variable is not set')
  }

  try {
    const { bet, multiplier, user } = await request.json()

    const adminKeypair = Keypair.fromSecretKey(Buffer.from(JSON.parse(ADMIN_PRIVATE_KEY)))

    const signer: Signer = {
      publicKey: adminKeypair.publicKey,
      secretKey: adminKeypair.secretKey,
    }
    const wallet = signer as Signer & Signer[]

    // Initialize connection and program
    const connection = new Connection('http://127.0.0.1:8899', 'confirmed')
    const provider = new AnchorProvider(
      connection,
      {
        publicKey: adminKeypair.publicKey,
        signTransaction: async (tx) => {
          tx.sign(wallet)
          return tx
        },
        signAllTransactions: async (tx) => {
          return tx
        },
      },
      {}
    )
    const program = new Program(idl as Kzyno, provider) as Program<Kzyno>

    // Find PDAs
    const [globalState] = PublicKey.findProgramAddressSync(
      [Buffer.from('global_state')],
      program.programId
    )

    const [userBalancePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('user_balance'), new PublicKey(user).toBuffer()],
      program.programId
    )

    const [vaultAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault')],
      program.programId
    )

    // Generate random seed
    const rngSeed = Math.floor(Math.random() * 10000000)

    // Call the program as admin and get transaction signature
    const tx = await program.methods
      .playGame(new BN(multiplier), new BN(rngSeed), new BN(bet))
      .accounts({
        signer: adminKeypair.publicKey,
        // @ts-expect-error: anchor types are dumb sometimes
        userBalance: userBalancePda,
        globalState,
        vaultAccount: vaultAccountPda,
        user: new PublicKey(user),
        systemProgram: SystemProgram.programId,
      })
      .signers([adminKeypair])
      .rpc()

    // Wait for transaction confirmation
    await connection.confirmTransaction(tx)

    // Get transaction data
    const transactionData = await program.provider.connection.getTransaction(tx, {
      commitment: 'confirmed',
    })

    if (!transactionData?.meta?.innerInstructions?.[0]?.instructions?.[0]) {
      throw new Error('Failed to get CPI instruction data')
    }

    // Decode the event data from the CPI instruction
    const eventIx = transactionData.meta.innerInstructions[0].instructions[0]
    const rawData = utils.bytes.bs58.decode(eventIx.data)
    const base64Data = utils.bytes.base64.encode(rawData.subarray(8))
    const event = program.coder.events.decode(base64Data)

    if (!event) {
      throw new Error('Failed to decode event data')
    }

    const amountChange = event.data.won ? bet * (multiplier - 1) : -bet

    return NextResponse.json({
      won: event.data.won,
      amount_change: amountChange,
    })
  } catch (error) {
    console.error('Error in play game endpoint:', error)
    return NextResponse.json({ error: 'Failed to process game' }, { status: 500 })
  }
}
