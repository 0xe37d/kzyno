import { Program, AnchorProvider, setProvider, BN } from '@coral-xyz/anchor'
import { PublicKey, Connection, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { AnchorWallet } from '@solana/wallet-adapter-react'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { MessageSignerWalletAdapter } from '@solana/wallet-adapter-base'
import type { Kzyno } from '@shared/anchor/types/kzyno'
import idl from '@shared/anchor/idl/kzyno.json'
import bs58 from 'bs58'
import { KOINS_PER_SOL } from './constants'

export interface PlayResult {
  won: boolean
  amount_change: number
}

export interface Balance {
  sol: number
  token: number
  casino: number
}

export const leU64 = (n: number | BN) => new BN(n).toArrayLike(Buffer, 'le', 8)

const q64ToLamports = (q: BN) => q.abs().shrn(64)

async function isAuthenticated(): Promise<boolean> {
  const res = await fetch('/api/auth/me', {
    method: 'GET',
    credentials: 'include', // send cookies!
  })
  return res.ok // 200 = logged-in, 401 = not
}

export class CasinoClient {
  private program: Program<Kzyno>
  private connection: Connection
  private globalState: PublicKey
  private vaultPda: PublicKey
  private provider: AnchorProvider
  private userBalancePda: PublicKey | null = null
  private userLiquidityPda: PublicKey | null = null
  private adapter: MessageSignerWalletAdapter
  private isAuthenticated: boolean = false
  private cluster: 'devnet' | 'mainnet-beta' | 'localhost'
  private authPromise: Promise<void> | null = null

  constructor(
    connection: Connection,
    wallet: AnchorWallet,
    adapter: MessageSignerWalletAdapter,
    cluster: 'devnet' | 'mainnet-beta' | 'localhost'
  ) {
    this.connection = connection
    this.cluster = cluster
    this.provider = new AnchorProvider(this.connection, wallet, {})
    setProvider(this.provider)
    this.program = new Program(idl as Kzyno, this.provider) as Program<Kzyno>
    this.adapter = adapter
    // Find PDAs
    ;[this.globalState] = PublicKey.findProgramAddressSync(
      [Buffer.from('global_state')],
      this.program.programId
    )
    ;[this.vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault')],
      this.program.programId
    )

    // Initialize userBalancePda if wallet is connected
    if (wallet.publicKey) {
      ;[this.userBalancePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_balance'), wallet.publicKey.toBuffer()],
        this.program.programId
      )
      ;[this.userLiquidityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_liquidity'), wallet.publicKey.toBuffer(), leU64(0)],
        this.program.programId
      )
    }
  }

  async get_koins(): Promise<number> {
    if (!this.provider.wallet.publicKey || !this.userBalancePda) {
      throw new Error('Wallet not connected')
    }
    await this.authenticate()

    try {
      const response = await fetch('/api/casino/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'get_koins',
          cluster: this.cluster,
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch koins')
      }

      const result = await response.json()
      return result.koins
    } catch {
      return 0
    }
  }

  async get_balance(): Promise<Balance> {
    if (!this.provider.wallet.publicKey || !this.userLiquidityPda) {
      throw new Error('Wallet not connected')
    }
    await this.authenticate()

    try {
      const response = await fetch('/api/casino/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'get_balance',
          cluster: this.cluster,
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to get balance')
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error getting balance:', error)
      throw new Error('Failed to get balance')
    }
  }

  async authenticate(): Promise<void> {
    if (!this.provider.wallet.publicKey) {
      throw new Error('Wallet not connected')
    }

    if (this.isAuthenticated) {
      return
    }

    // If authentication is already in progress, return the existing promise
    if (this.authPromise) {
      return this.authPromise
    }

    // Create new authentication promise
    this.authPromise = this._performAuthentication()

    try {
      await this.authPromise
    } finally {
      // Clear the promise when done (success or failure)
      this.authPromise = null
    }
  }

  private async _performAuthentication(): Promise<void> {
    if (await isAuthenticated()) {
      this.isAuthenticated = true
      return
    }

    try {
      // Step 1: Get challenge
      const { timestamp } = await fetch('/api/auth/challenge').then((r) => r.json())

      // Step 2: Sign message
      const message = `kzyno:${timestamp}`
      const signatureBytes = await this.adapter.signMessage(new TextEncoder().encode(message))
      const signature = bs58.encode(signatureBytes)

      // Step 3: Login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pubkey: this.provider.wallet.publicKey.toString(),
          timestamp,
          signature,
        }),
      })

      if (!response.ok) {
        throw new Error('Authentication failed')
      }

      this.isAuthenticated = true
    } catch (error) {
      console.error('Authentication error:', error)
      throw new Error(
        `Authentication failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async logout(): Promise<void> {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Logout failed')
      }

      // Reset authentication state
      this.isAuthenticated = false
      this.authPromise = null
    } catch (error) {
      console.error('Logout error:', error)
      throw new Error(`Logout failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async play(bet: number, multiplier: number): Promise<PlayResult> {
    await this.authenticate()

    if (!this.provider.wallet.publicKey) {
      throw new Error('Wallet not connected')
    }

    if (!this.userBalancePda) {
      throw new Error('User balance PDA not found')
    }

    try {
      const betLamports = Math.floor((bet / KOINS_PER_SOL) * LAMPORTS_PER_SOL)

      // Get play data from backend
      const playDataResponse = await fetch('/api/casino/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'get_play_data',
          cluster: this.cluster,
        }),
        credentials: 'include',
      })

      if (!playDataResponse.ok) {
        throw new Error('Failed to get play data')
      }

      const playData = await playDataResponse.json()
      console.log(playData)
      const casinoBalance = playData.casino_balance
      const risk = 100 // 1% risk
      const chanceMinusOne = multiplier - 1
      const maxBetSize = Math.floor(casinoBalance / risk / chanceMinusOne)

      if (betLamports > maxBetSize) {
        throw new Error(`Bet too big. Maximum bet size is ${maxBetSize / LAMPORTS_PER_SOL} SOL`)
      }

      const response = await fetch('/api/casino/play_game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bet: betLamports,
          multiplier,
          cluster: this.cluster,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to play game')
      }

      const result = await response.json()
      return {
        won: result.won,
        amount_change: result.amount_change / LAMPORTS_PER_SOL,
      }
    } catch (error) {
      console.error('Error playing game:', error)
      throw new Error(
        `Failed to play game: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async deposit(amount: number): Promise<void> {
    if (!this.provider.wallet.publicKey) {
      throw new Error('Wallet not connected')
    }
    await this.authenticate()

    try {
      // Convert amount to smallest token unit (assuming 9 decimals like SOL)
      const amountTokens = new BN(Math.floor(amount * 1e9))

      // Get recent blockhash from backend
      const blockhashResponse = await fetch('/api/casino/blockhash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cluster: this.cluster }),
        credentials: 'include',
      })

      if (!blockhashResponse.ok) {
        throw new Error('Failed to get blockhash')
      }

      const { blockhash } = await blockhashResponse.json()

      const tx = await this.program.methods
        .depositLiquidity(new BN(0), amountTokens)
        .accounts({
          signer: this.provider.wallet.publicKey,
          // @ts-expect-error: anchor types are dumb sometimes
          vaultAccount: this.vaultPda,
          globalState: this.globalState,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .transaction()

      // Set the blockhash
      tx.recentBlockhash = blockhash
      tx.feePayer = this.provider.wallet.publicKey

      const signedTx = await this.provider.wallet.signTransaction(tx)

      const serializedTx = signedTx.serialize()
      const response = await fetch('/api/casino/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serializedTransaction: serializedTx, cluster: this.cluster }),
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to deposit')
      }

      console.log(`✅ Successfully deposited ${amount} tokens`)
    } catch (error) {
      console.error('Error depositing:', error)
      throw new Error(
        `Failed to deposit: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async withdraw(amount: number): Promise<void> {
    if (!this.provider.wallet.publicKey) {
      throw new Error('Wallet not connected')
    }
    await this.authenticate()

    try {
      // Get recent blockhash from backend
      const blockhashResponse = await fetch('/api/casino/blockhash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cluster: this.cluster }),
        credentials: 'include',
      })

      if (!blockhashResponse.ok) {
        throw new Error('Failed to get blockhash')
      }

      const { blockhash } = await blockhashResponse.json()

      const tx = await this.program.methods
        .withdrawLiquidity(new BN(0))
        .accounts({
          signer: this.provider.wallet.publicKey,
          // @ts-expect-error: anchor types are dumb sometimes
          vaultAccount: this.vaultPda,
          globalState: this.globalState,
          systemProgram: SystemProgram.programId,
        })
        .transaction()

      // Set the blockhash
      tx.recentBlockhash = blockhash
      tx.feePayer = this.provider.wallet.publicKey

      const signedTx = await this.provider.wallet.signTransaction(tx)

      const serializedTx = signedTx.serialize()
      const response = await fetch('/api/casino/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serializedTransaction: serializedTx, cluster: this.cluster }),
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to withdraw')
      }

      console.log(`✅ Successfully withdrew ${amount} tokens`)
    } catch (error) {
      console.error('Error withdrawing:', error)
      throw new Error(
        `Failed to withdraw: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  get_profit_share(
    userLiquidityAccount: Awaited<ReturnType<typeof this.program.account.userLiquidity.fetch>>,
    globalState: Awaited<ReturnType<typeof this.program.account.globalState.fetch>>
  ): number {
    const delta = globalState.accProfitPerShare.sub(userLiquidityAccount.profitEntry)
    const pnlQ64 = userLiquidityAccount.shares.mul(delta) // BN * BN
    const lamports = q64ToLamports(pnlQ64)
    return lamports.toNumber()
  }

  async get_status(): Promise<{
    total_liquidity: number
    vault_balance: number
    profit: number
    profit_share: number
  }> {
    await this.authenticate()
    try {
      const response = await fetch('/api/casino/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'get_status',
          cluster: this.cluster,
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to get status')
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error getting status:', error)
      return {
        total_liquidity: 0,
        vault_balance: 0,
        profit: 0,
        profit_share: 0,
      }
    }
  }

  async depositFunds(amount: number): Promise<void> {
    if (!this.provider.wallet.publicKey) {
      throw new Error('Wallet not connected')
    }
    await this.authenticate()
    try {
      const userBalancePda = PublicKey.findProgramAddressSync(
        [Buffer.from('user_balance'), this.provider.wallet.publicKey.toBuffer()],
        this.program.programId
      )[0]

      // Convert SOL to lamports
      const amountLamports = new BN(Math.floor(amount * LAMPORTS_PER_SOL))

      // Get recent blockhash from backend
      const blockhashResponse = await fetch('/api/casino/blockhash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cluster: this.cluster }),
        credentials: 'include',
      })

      if (!blockhashResponse.ok) {
        throw new Error('Failed to get blockhash')
      }

      const { blockhash } = await blockhashResponse.json()

      const tx = await this.program.methods
        .depositFunds(amountLamports)
        .accounts({
          signer: this.provider.wallet.publicKey,
          // @ts-expect-error: anchor types are dumb sometimes
          userBalance: userBalancePda,
          globalState: this.globalState,
          vaultAccount: this.vaultPda,
          systemProgram: SystemProgram.programId,
        })
        .transaction()

      // Set the blockhash
      tx.recentBlockhash = blockhash
      tx.feePayer = this.provider.wallet.publicKey

      const signedTx = await this.provider.wallet.signTransaction(tx)

      const serializedTx = signedTx.serialize()
      const response = await fetch('/api/casino/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serializedTransaction: serializedTx, cluster: this.cluster }),
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to deposit funds')
      }

      console.log(`✅ Successfully deposited ${amount} SOL to casino balance`)
    } catch (error) {
      console.error('Error depositing funds:', error)
      throw new Error(
        `Failed to deposit funds: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async withdrawFunds(amount: number): Promise<void> {
    if (!this.provider.wallet.publicKey) {
      throw new Error('Wallet not connected')
    }
    await this.authenticate()
    try {
      const userBalancePda = PublicKey.findProgramAddressSync(
        [Buffer.from('user_balance'), this.provider.wallet.publicKey.toBuffer()],
        this.program.programId
      )[0]

      // Convert SOL to lamports
      const amountLamports = new BN(Math.floor(amount * LAMPORTS_PER_SOL))

      // Get recent blockhash from backend
      const blockhashResponse = await fetch('/api/casino/blockhash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cluster: this.cluster }),
        credentials: 'include',
      })

      if (!blockhashResponse.ok) {
        throw new Error('Failed to get blockhash')
      }

      const { blockhash } = await blockhashResponse.json()

      const tx = await this.program.methods
        .withdrawFunds(amountLamports)
        .accounts({
          user: this.provider.wallet.publicKey,
          // @ts-expect-error: anchor types are dumb sometimes
          userBalance: userBalancePda,
          globalState: this.globalState,
          vaultAccount: this.vaultPda,
          systemProgram: SystemProgram.programId,
        })
        .transaction()

      // Set the blockhash
      tx.recentBlockhash = blockhash
      tx.feePayer = this.provider.wallet.publicKey

      const signedTx = await this.provider.wallet.signTransaction(tx)

      const serializedTx = signedTx.serialize()
      const response = await fetch('/api/casino/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serializedTransaction: serializedTx, cluster: this.cluster }),
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to withdraw')
      }

      console.log(`✅ Successfully withdrew ${amount} SOL from casino balance`)
    } catch (error) {
      console.error('Error withdrawing funds:', error)
      throw new Error(
        `Failed to withdraw funds: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}
