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

  constructor(connection: Connection, wallet: AnchorWallet, adapter: MessageSignerWalletAdapter) {
    this.connection = connection
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

    try {
      const userBalanceAccount = await this.program.account.userBalance.fetch(this.userBalancePda)
      const sol = Number(userBalanceAccount.balance) / 1e9
      return sol * KOINS_PER_SOL
    } catch {
      return 0
    }
  }

  async get_balance(): Promise<Balance> {
    if (!this.provider.wallet.publicKey || !this.userLiquidityPda) {
      throw new Error('Wallet not connected')
    }

    try {
      // Get SOL balance
      const solBalance = await this.connection.getBalance(this.provider.wallet.publicKey)

      let tokenBalance = 0
      if (this.userLiquidityPda) {
        try {
          const tokenBalanceAccount = await this.program.account.userLiquidity.fetch(
            this.userLiquidityPda
          )
          tokenBalance = Number(tokenBalanceAccount.shares) / 1e9
        } catch {
          console.log('No token balance account found yet')
        }
      }

      // Get casino balance
      let casinoBalance = 0
      if (this.userBalancePda) {
        try {
          const userBalanceAccount = await this.program.account.userBalance.fetch(
            this.userBalancePda
          )
          casinoBalance = Number(userBalanceAccount.balance)
        } catch {
          console.log('No casino balance account found yet')
        }
      }

      return { sol: solBalance, token: tokenBalance, casino: casinoBalance }
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
    } catch (error) {
      console.error('Authentication error:', error)
      throw new Error(
        `Authentication failed: ${error instanceof Error ? error.message : String(error)}`
      )
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

      // Calculate max bet size
      const globalState = await this.program.account.globalState.fetch(this.globalState)
      const vaultAccount = await this.connection.getAccountInfo(this.vaultPda)

      if (!vaultAccount) {
        throw new Error('Vault account not found')
      }

      const risk = 100 // 1% risk
      const casinoBalance = vaultAccount.lamports - Number(globalState.userFunds)
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
          user: this.provider.wallet.publicKey.toString(),
          cluster: this.connection.rpcEndpoint,
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

    try {
      // Convert amount to smallest token unit (assuming 9 decimals like SOL)
      const amountTokens = new BN(Math.floor(amount * 1e9))

      await this.program.methods
        .depositLiquidity(new BN(0), amountTokens)
        .accounts({
          signer: this.provider.wallet.publicKey,
          // @ts-expect-error: anchor types are dumb sometimes
          vaultAccount: this.vaultPda,
          globalState: this.globalState,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc()

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

    try {
      await this.program.methods
        .withdrawLiquidity(new BN(0))
        .accounts({
          signer: this.provider.wallet.publicKey,
          // @ts-expect-error: anchor types are dumb sometimes
          vaultAccount: this.vaultPda,
          globalState: this.globalState,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

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
    try {
      console.log('Program ID:', this.program.programId.toString())
      const globalState = await this.program.account.globalState.fetch(this.globalState)
      const vaultAccount = await this.connection.getAccountInfo(this.vaultPda)
      const vaultBalance = vaultAccount ? vaultAccount.lamports : 0
      const profits = vaultBalance - Number(globalState.deposits) - Number(globalState.userFunds)

      let profit_share = 0
      if (this.userLiquidityPda) {
        const userLiquidityAccount = await this.program.account.userLiquidity.fetch(
          this.userLiquidityPda
        )
        profit_share = this.get_profit_share(userLiquidityAccount, globalState)
      }

      return {
        total_liquidity: Number(globalState.totalShares),
        vault_balance: vaultAccount ? vaultAccount.lamports / LAMPORTS_PER_SOL : 0,
        profit: profits / LAMPORTS_PER_SOL,
        profit_share: profit_share / LAMPORTS_PER_SOL,
      }
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

    try {
      const userBalancePda = PublicKey.findProgramAddressSync(
        [Buffer.from('user_balance'), this.provider.wallet.publicKey.toBuffer()],
        this.program.programId
      )[0]

      // Convert SOL to lamports
      const amountLamports = new BN(Math.floor(amount * LAMPORTS_PER_SOL))

      await this.program.methods
        .depositFunds(amountLamports)
        .accounts({
          signer: this.provider.wallet.publicKey,
          // @ts-expect-error: anchor types are dumb sometimes
          userBalance: userBalancePda,
          globalState: this.globalState,
          vaultAccount: this.vaultPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

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

    try {
      const userBalancePda = PublicKey.findProgramAddressSync(
        [Buffer.from('user_balance'), this.provider.wallet.publicKey.toBuffer()],
        this.program.programId
      )[0]

      // Convert SOL to lamports
      const amountLamports = new BN(Math.floor(amount * LAMPORTS_PER_SOL))

      await this.program.methods
        .withdrawFunds(amountLamports)
        .accounts({
          user: this.provider.wallet.publicKey,
          // @ts-expect-error: anchor types are dumb sometimes
          userBalance: userBalancePda,
          globalState: this.globalState,
          vaultAccount: this.vaultPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      console.log(`✅ Successfully withdrew ${amount} SOL from casino balance`)
    } catch (error) {
      console.error('Error withdrawing funds:', error)
      throw new Error(
        `Failed to withdraw funds: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}
