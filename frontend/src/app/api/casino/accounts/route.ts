import { Connection, PublicKey } from '@solana/web3.js'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import idl from '@shared/anchor/idl/kzyno.json'

const PROGRAM_ID = new PublicKey(idl.address)
const JWT_SECRET = process.env.JWT_SECRET
const DEVNET_RPC_URL = process.env.DEVNET_RPC_URL || 'https://api.devnet.solana.com'
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const { operation, cluster } = await request.json()
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

    // Derive PDAs
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
    const [userLiquidity] = PublicKey.findProgramAddressSync(
      [new TextEncoder().encode('user_liquidity'), new PublicKey(user).toBuffer(), Buffer.alloc(8)],
      PROGRAM_ID
    )

    switch (operation) {
      case 'get_koins': {
        try {
          const userBalanceAccount = await connection.getAccountInfo(userBalance)
          if (!userBalanceAccount) {
            return NextResponse.json({ koins: 0 })
          }

          // Deserialize the account data manually since we're not using Anchor in the backend
          // This assumes the userBalance account structure from the IDL
          const balance = userBalanceAccount.data.readBigUInt64LE(8) // Skip discriminator
          const koins = (Number(balance) / 1e9) * 1000 // Convert to koins (1000 koins per SOL)
          return NextResponse.json({ koins: Math.round(koins) })
        } catch {
          return NextResponse.json({ koins: 0 })
        }
      }

      case 'get_balance': {
        try {
          // Get SOL balance
          const solBalance = await connection.getBalance(new PublicKey(user))

          // Get token balance
          let tokenBalance = 0
          try {
            const tokenAccount = await connection.getAccountInfo(userLiquidity)
            if (tokenAccount) {
              const shares = tokenAccount.data.readBigUInt64LE(8) // Skip discriminator
              tokenBalance = Number(shares)
            }
          } catch {
            console.log('No token balance account found yet')
          }

          // Get casino balance
          let casinoBalance = 0
          try {
            const userBalanceAccount = await connection.getAccountInfo(userBalance)
            if (userBalanceAccount) {
              const balance = userBalanceAccount.data.readBigUInt64LE(8) // Skip discriminator
              casinoBalance = Number(balance)
            }
          } catch {
            console.log('No casino balance account found yet')
          }

          return NextResponse.json({
            sol: solBalance,
            token: tokenBalance,
            casino: casinoBalance,
          })
        } catch (error) {
          console.error('Error getting balance:', error)
          return NextResponse.json({ error: 'Failed to get balance' }, { status: 500 })
        }
      }

      case 'get_status': {
        try {
          const globalStateAccount = await connection.getAccountInfo(globalState)
          const vaultAccountInfo = await connection.getAccountInfo(vaultAccount)

          if (!globalStateAccount || !vaultAccountInfo) {
            return NextResponse.json({
              total_liquidity: 0,
              vault_balance: 0,
              profit: 0,
              profit_share: 0,
            })
          }
          // pub admin: Pubkey -> [u8; 32] -> 32 bytes, offset 8 due to discriminator
          // pub total_shares: u128, offset 40
          // pub acc_profit_per_share: i128, 56
          // pub user_funds: u64, offset 72
          // pub deposits: u64, offset 80
          // pub last_bankroll: u64, // vault – user_funds at last sync, offset 88

          // Parse global state data manually
          const totalSharesLower = globalStateAccount.data.readBigUInt64LE(40)
          const totalSharesUpper = globalStateAccount.data.readBigUInt64LE(48)
          const totalShares = totalSharesLower + (totalSharesUpper << 64n)

          const accProfitPerShareLower = globalStateAccount.data.readBigInt64LE(56)
          const accProfitPerShareUpper = globalStateAccount.data.readBigInt64LE(64)
          const accProfitPerShare = accProfitPerShareLower + (accProfitPerShareUpper << 64n)
          const userFunds = globalStateAccount.data.readBigUInt64LE(72) // Read 6 bytes for u64
          const deposits = globalStateAccount.data.readBigUInt64LE(80) // Read 6 bytes for u64

          const vaultBalance = vaultAccountInfo.lamports
          const profits = vaultBalance - Number(deposits) - Number(userFunds)

          // Calculate profit share
          let profitShare = 0
          try {
            const userLiquidityAccount = await connection.getAccountInfo(userLiquidity)
            if (userLiquidityAccount) {
              const shares = userLiquidityAccount.data.readBigUInt64LE(8)
              const profitEntry = userLiquidityAccount.data.readBigUInt64LE(16)

              const delta = accProfitPerShare - profitEntry
              const pnlQ64 = shares * delta
              const lamports = Number(pnlQ64 >> 64n) // Convert Q64 to lamports
              profitShare = lamports
            }
          } catch {
            console.log('No user liquidity account found yet')
          }

          return NextResponse.json({
            total_liquidity: Number(totalShares),
            vault_balance: vaultBalance / 1e9,
            profit: profits / 1e9,
            profit_share: profitShare / 1e9,
          })
        } catch (error) {
          console.error('Error getting status:', error)
          return NextResponse.json({
            total_liquidity: 0,
            vault_balance: 0,
            profit: 0,
            profit_share: 0,
          })
        }
      }

      case 'get_play_data': {
        try {
          const globalStateAccount = await connection.getAccountInfo(globalState)
          const vaultAccountInfo = await connection.getAccountInfo(vaultAccount)

          if (!globalStateAccount || !vaultAccountInfo) {
            return NextResponse.json({ error: 'Required accounts not found' }, { status: 404 })
          }

          // Parse global state data
          const userFunds = globalStateAccount.data.readBigUInt64LE(72) // Read 6 bytes for u64
          const vaultBalance = vaultAccountInfo.lamports
          const casinoBalance = vaultBalance - Number(userFunds)

          return NextResponse.json({
            casino_balance: casinoBalance,
            user_funds: Number(userFunds),
          })
        } catch (error) {
          console.error('Error getting play data:', error)
          return NextResponse.json({ error: 'Failed to get play data' }, { status: 500 })
        }
      }

      default:
        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 })
    }
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
