import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js'
import { WalletContextState } from '@solana/wallet-adapter-react'
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token'
import * as borsh from 'borsh'

export interface PlayResult {
  won: boolean
  amount_change: number
}

// Define Borsh schemas
const PLAY_GAME_SCHEMA = {
  struct: {
    bet: 'u64',
    multiplier: 'u64',
    rngSeed: 'u64',
  },
}

const DEPOSIT_SCHEMA = {
  struct: {
    amount: 'u64',
  },
}

const WITHDRAW_SCHEMA = {
  struct: {
    amount: 'u64',
  },
}

export class CasinoClient {
  private connection: Connection
  private walletContext: WalletContextState
  private programId: PublicKey
  private globalState: PublicKey
  private tokenMint: PublicKey
  private reserveTokenAccount: PublicKey
  private vaultPda: PublicKey

  constructor(walletContext: WalletContextState) {
    this.walletContext = walletContext

    // Use the same values as in the Rust client
    this.programId = new PublicKey('JbGEnnwtxn5n2rWMbfnAconA2QafwQXV9oavX5bKk6i')
    this.globalState = new PublicKey('Vd1GpfCNoEfg4q3thANHEUm9iogE6VpTFyYUL3EpEAR')
    this.tokenMint = new PublicKey('e37NMn6EQLSnaz2NZFmBckryxzDYFGfQSqZayeTB6pm')
    this.reserveTokenAccount = new PublicKey('DXwKLeheJz5j9iRbSUEAGos7XosPMCrVSPvXuduLJbjB')
    this.vaultPda = new PublicKey('CuXZnu43y2Cjg2wc7ukWu4eP3V33uQkmLAbQTwwWaUvX')

    // Connect to devnet
    this.connection = new Connection('https://api.devnet.solana.com', 'confirmed')
  }

  async get_balance(): Promise<[number, number]> {
    if (!this.walletContext.publicKey) {
      throw new Error('Wallet not connected')
    }

    try {
      // Get SOL balance
      const solBalance = await this.connection.getBalance(this.walletContext.publicKey)

      // Get token balance using Token-2022 program
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        this.walletContext.publicKey,
        { mint: this.tokenMint, programId: TOKEN_2022_PROGRAM_ID }
      )

      let tokenBalance = 0
      if (tokenAccounts.value.length > 0) {
        tokenBalance = Number(tokenAccounts.value[0].account.data.parsed.info.tokenAmount.amount)
      }

      return [solBalance, tokenBalance]
    } catch (error) {
      console.error('Error getting balance:', error)
      throw new Error('Failed to get balance')
    }
  }

  async play(bet: number, multiplier: number): Promise<PlayResult> {
    if (!this.walletContext.publicKey || !this.walletContext.signTransaction) {
      throw new Error('Wallet not connected or cannot sign transactions')
    }

    try {
      // Convert SOL to lamports for the transaction
      const betLamports = Math.floor(bet * 1e9)

      // Generate random seed - use a more controlled range for better fairness
      // Using a smaller range to make wins more likely with higher multipliers
      const rngSeed = Math.floor(Math.random() * 1000) + 1

      // Create instruction data using Borsh
      const instructionData = {
        bet: betLamports,
        multiplier,
        rngSeed,
      }

      // Serialize the instruction data
      const serializedData = borsh.serialize(PLAY_GAME_SCHEMA, instructionData)

      // Create a buffer with the instruction variant (3 for PlayGame)
      const variantBuffer = Buffer.alloc(1)
      variantBuffer.writeUInt8(3, 0)

      // Combine the variant and serialized data
      const data = Buffer.concat([variantBuffer, serializedData])

      // Create instruction
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: this.walletContext.publicKey, isSigner: true, isWritable: true },
          { pubkey: this.vaultPda, isSigner: false, isWritable: true },
          { pubkey: this.globalState, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: this.programId,
        data,
      })

      // Create and sign transaction
      const transaction = new Transaction().add(instruction)
      const latestBlockhash = await this.connection.getLatestBlockhash()
      transaction.recentBlockhash = latestBlockhash.blockhash
      transaction.feePayer = this.walletContext.publicKey

      // Sign transaction
      const signedTransaction = await this.walletContext.signTransaction(transaction)

      // Send transaction
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize())

      // Confirm transaction
      await this.connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      })

      // Determine if the player won based on the RNG seed
      // For a multiplier of N, the chance of winning should be 1/N
      // So we check if rngSeed <= (1000/multiplier)
      const winThreshold = Math.floor(1000 / multiplier)
      const won = rngSeed <= winThreshold
      const amountChange = won ? bet * (multiplier - 1) : -bet

      console.log(
        `RNG Seed: ${rngSeed}, Multiplier: ${multiplier}, Win Threshold: ${winThreshold}, Won: ${won}`
      )

      return {
        won,
        amount_change: amountChange,
      }
    } catch (error: unknown) {
      console.error('Error playing game:', error)
      throw new Error(
        `Failed to play game: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async deposit(amount: number): Promise<void> {
    if (!this.walletContext.publicKey || !this.walletContext.signTransaction) {
      console.error('Wallet not connected or cannot sign transactions')
      return
    }

    try {
      // Check if token account exists first
      const userTokenAccount = await this.getTokenAccountAddress()
      const accountInfo = await this.connection.getAccountInfo(userTokenAccount)

      if (!accountInfo) {
        console.error(
          'Token account does not exist. Please create a token account first using createTokenAccount()'
        )
        return
      }

      // Find the reserve authority PDA
      const [reserveAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from('reserve_authority')],
        this.programId
      )

      // Convert SOL to lamports for the transaction
      const amountLamports = Math.floor(amount * 1e9)

      // Create instruction data using Borsh
      const instructionData = {
        amount: amountLamports,
      }

      // Serialize the instruction data
      const serializedData = borsh.serialize(DEPOSIT_SCHEMA, instructionData)

      // Create a buffer with the instruction variant (1 for Deposit)
      const variantBuffer = Buffer.alloc(1)
      variantBuffer.writeUInt8(1, 0)

      // Combine the variant and serialized data
      const data = Buffer.concat([variantBuffer, serializedData])

      // Create instruction
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: this.walletContext.publicKey, isSigner: true, isWritable: true },
          { pubkey: userTokenAccount, isSigner: false, isWritable: true },
          { pubkey: this.reserveTokenAccount, isSigner: false, isWritable: true },
          { pubkey: this.vaultPda, isSigner: false, isWritable: true },
          { pubkey: this.globalState, isSigner: false, isWritable: true },
          { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: reserveAuthority, isSigner: false, isWritable: false },
          { pubkey: this.tokenMint, isSigner: false, isWritable: false },
        ],
        programId: this.programId,
        data,
      })

      // Create and sign transaction
      const transaction = new Transaction().add(instruction)
      const latestBlockhash = await this.connection.getLatestBlockhash()
      transaction.recentBlockhash = latestBlockhash.blockhash
      transaction.feePayer = this.walletContext.publicKey

      // Sign transaction
      const signedTransaction = await this.walletContext.signTransaction(transaction)

      // Send transaction
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize())

      // Wait for confirmation with a timeout
      const confirmationPromise = this.connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      })

      // Add a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Transaction confirmation timeout')), 30000)
      })

      // Race between confirmation and timeout
      const confirmation = await Promise.race([confirmationPromise, timeoutPromise])

      if (
        confirmation &&
        typeof confirmation === 'object' &&
        'value' in confirmation &&
        confirmation.value &&
        typeof confirmation.value === 'object' &&
        'err' in confirmation.value &&
        confirmation.value.err
      ) {
        console.error(`Transaction failed: ${confirmation.value.err.toString()}`)
        return
      }

      console.log(`✅ Successfully deposited ${amount} SOL`)
    } catch (error: unknown) {
      console.error('Error depositing:', error)
      return
    }
  }

  async withdraw(amount: number): Promise<void> {
    if (!this.walletContext.publicKey || !this.walletContext.signTransaction) {
      console.error('Wallet not connected or cannot sign transactions')
      return
    }

    try {
      // Check if token account exists first
      const userTokenAccount = await this.getTokenAccountAddress()
      const accountInfo = await this.connection.getAccountInfo(userTokenAccount)

      if (!accountInfo) {
        console.error(
          'Token account does not exist. Please create a token account first using createTokenAccount()'
        )
        return
      }

      // Convert SOL to lamports for the transaction
      const amountLamports = Math.floor(amount * 1e9)

      // Create instruction data using Borsh
      const instructionData = {
        amount: amountLamports,
      }

      // Serialize the instruction data
      const serializedData = borsh.serialize(WITHDRAW_SCHEMA, instructionData)

      // Create a buffer with the instruction variant (2 for BurnAndWithdraw)
      const variantBuffer = Buffer.alloc(1)
      variantBuffer.writeUInt8(2, 0)

      // Combine the variant and serialized data
      const data = Buffer.concat([variantBuffer, serializedData])

      // Create instruction
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: this.walletContext.publicKey, isSigner: true, isWritable: true },
          { pubkey: userTokenAccount, isSigner: false, isWritable: true },
          { pubkey: this.tokenMint, isSigner: false, isWritable: true },
          { pubkey: this.vaultPda, isSigner: false, isWritable: true },
          { pubkey: this.globalState, isSigner: false, isWritable: true },
          { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: this.programId,
        data,
      })

      // Create and sign transaction
      const transaction = new Transaction().add(instruction)
      const latestBlockhash = await this.connection.getLatestBlockhash()
      transaction.recentBlockhash = latestBlockhash.blockhash
      transaction.feePayer = this.walletContext.publicKey

      // Sign transaction
      const signedTransaction = await this.walletContext.signTransaction(transaction)

      // Send transaction
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize())

      // Wait for confirmation with a timeout
      const confirmationPromise = this.connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      })

      // Add a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Transaction confirmation timeout')), 30000)
      })

      // Race between confirmation and timeout
      const confirmation = await Promise.race([confirmationPromise, timeoutPromise])

      if (
        confirmation &&
        typeof confirmation === 'object' &&
        'value' in confirmation &&
        confirmation.value &&
        typeof confirmation.value === 'object' &&
        'err' in confirmation.value &&
        confirmation.value.err
      ) {
        console.error(`Transaction failed: ${confirmation.value.err.toString()}`)
        return
      }

      console.log(`✅ Successfully withdrew ${amount} SOL`)
    } catch (error: unknown) {
      console.error('Error withdrawing:', error)
      return
    }
  }

  async get_status(): Promise<{
    total_deposits: number
    circulating_tokens: number
    total_token_supply: number
    vault_balance: string
  }> {
    try {
      // Get global state account data
      const globalStateAccount = await this.connection.getAccountInfo(this.globalState)
      if (!globalStateAccount) {
        console.error('Global state account not found')
        return {
          total_deposits: 0,
          circulating_tokens: 0,
          total_token_supply: 0,
          vault_balance: 'Not initialized',
        }
      }

      // Define the Borsh schema for the global state based on state.rs
      // For Solana public keys, we need to use an array of u8 with length 32
      const GLOBAL_STATE_SCHEMA = {
        struct: {
          admin: { array: { type: 'u8', len: 32 } },
          token_mint: { array: { type: 'u8', len: 32 } },
          reserve_token_account: { array: { type: 'u8', len: 32 } },
          vault_account: { array: { type: 'u8', len: 32 } },
          total_deposits: 'u64',
          circulating_tokens: 'u64',
          total_token_supply: 'u64',
          is_initialized: 'bool',
        },
      }

      // Define the type for the global state
      interface GlobalState {
        admin: Uint8Array
        token_mint: Uint8Array
        reserve_token_account: Uint8Array
        vault_account: Uint8Array
        total_deposits: bigint
        circulating_tokens: bigint
        total_token_supply: bigint
        is_initialized: boolean
      }

      // Deserialize the account data
      const globalState = borsh.deserialize(
        GLOBAL_STATE_SCHEMA,
        globalStateAccount.data
      ) as GlobalState

      // Get vault balance
      let vaultBalance = 'Not initialized'
      try {
        const vaultAccount = await this.connection.getAccountInfo(this.vaultPda)
        if (vaultAccount) {
          // Convert lamports to SOL
          const vaultBalanceLamports = vaultAccount.lamports
          const vaultBalanceSol = vaultBalanceLamports / 1e9
          vaultBalance = `${vaultBalanceSol.toFixed(4)} SOL`
        }
      } catch (error) {
        console.error('Error getting vault balance:', error)
      }

      return {
        total_deposits: Number(globalState.total_deposits),
        circulating_tokens: Number(globalState.circulating_tokens),
        total_token_supply: Number(globalState.total_token_supply),
        vault_balance: vaultBalance,
      }
    } catch (error: unknown) {
      console.error('Error getting status:', error)
      return {
        total_deposits: 0,
        circulating_tokens: 0,
        total_token_supply: 0,
        vault_balance: 'Error getting status',
      }
    }
  }

  // New method to create a token account
  async createTokenAccount(): Promise<PublicKey> {
    if (!this.walletContext.publicKey || !this.walletContext.signTransaction) {
      console.error('Wallet not connected or cannot sign transactions')
      return new PublicKey('0')
    }

    try {
      // Find the associated token account using Token-2022 program
      const associatedTokenAccount = await this.getTokenAccountAddress()

      // Check if the account already exists
      const accountInfo = await this.connection.getAccountInfo(associatedTokenAccount)

      if (accountInfo) {
        console.log('Token account already exists')
        return associatedTokenAccount
      }

      console.log('Creating token account...')

      // Create the associated token account using Token-2022 program
      const createAccountInstruction = createAssociatedTokenAccountInstruction(
        this.walletContext.publicKey, // payer
        associatedTokenAccount, // associated token account
        this.walletContext.publicKey, // owner
        this.tokenMint, // mint
        TOKEN_2022_PROGRAM_ID // token program
      )

      // Create and sign transaction
      const transaction = new Transaction().add(createAccountInstruction)
      const latestBlockhash = await this.connection.getLatestBlockhash()
      transaction.recentBlockhash = latestBlockhash.blockhash
      transaction.feePayer = this.walletContext.publicKey

      // Sign transaction
      const signedTransaction = await this.walletContext.signTransaction(transaction)

      // Send transaction
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize())

      // Wait for confirmation with a timeout
      const confirmationPromise = this.connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      })

      // Add a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Transaction confirmation timeout')), 30000)
      })

      // Race between confirmation and timeout
      const confirmation = await Promise.race([confirmationPromise, timeoutPromise])

      if (
        confirmation &&
        typeof confirmation === 'object' &&
        'value' in confirmation &&
        confirmation.value &&
        typeof confirmation.value === 'object' &&
        'err' in confirmation.value &&
        confirmation.value.err
      ) {
        throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`)
      }

      console.log(`✅ Successfully created token account: ${associatedTokenAccount.toString()}`)
      return associatedTokenAccount
    } catch (error: unknown) {
      console.error('Error creating token account:', error)
      throw new Error(
        `Failed to create token account: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  // Helper method to get token account address
  private async getTokenAccountAddress(): Promise<PublicKey> {
    if (!this.walletContext.publicKey) {
      throw new Error('Wallet not connected')
    }

    return await getAssociatedTokenAddress(
      this.tokenMint,
      this.walletContext.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    )
  }
}
