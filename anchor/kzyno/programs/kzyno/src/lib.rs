use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("Har3kPZU49yuvD7etW76fMcj3AW83Q1TbRkz1Y9RjCdv");

fn sync_bankroll(idx: &mut GlobalState, vault_balance_now: u64) -> Result<()> {
    let bankroll_now = vault_balance_now
        .checked_sub(idx.user_funds)
        .ok_or(ErrorCode::Overflow)?;

    if idx.total_shares == 0 {
        idx.last_bankroll = bankroll_now;
        return Ok(());
    }

    // signed change (could be negative after a big payout)
    let delta_lamports = i128::from(bankroll_now) - i128::from(idx.last_bankroll);
    if delta_lamports != 0 {
        // convert lamports → Q64.64 lamports-per-share
        let delta_q64 = (delta_lamports << 64) / (idx.total_shares as i128);
        idx.acc_profit_per_share = idx
            .acc_profit_per_share
            .checked_add(delta_q64)
            .ok_or(ErrorCode::Overflow)?;
        idx.last_bankroll = bankroll_now;
    }
    Ok(())
}

#[program]
mod kzyno {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        global_state.admin = *ctx.accounts.admin.key;

        Ok(())
    }

    pub fn deposit_liquidity(
        ctx: Context<DepositLiquidity>,
        _index: u64, // index of the position, used to create the position account
        lamports_in: u64,
    ) -> Result<()> {
        let vault = &ctx.accounts.vault_account;
        let global_state = &mut ctx.accounts.global_state;
        sync_bankroll(global_state, vault.lamports())?;

        // 2. mint shares
        let shares = if global_state.total_shares == 0 {
            u128::from(lamports_in)
        } else {
            u128::from(lamports_in)
                .checked_mul(global_state.total_shares)
                .ok_or(ErrorCode::Overflow)?
                .checked_div(u128::from(global_state.deposits))
                .ok_or(ErrorCode::Overflow)?
        };

        // 3. record the position
        let pos = &mut ctx.accounts.user_liquidity;
        pos.deposited = lamports_in;
        pos.shares = shares;
        pos.profit_entry = global_state.acc_profit_per_share;

        global_state.deposits = global_state
            .deposits
            .checked_add(lamports_in)
            .ok_or(ErrorCode::Overflow)?;

        global_state.last_bankroll = global_state
            .last_bankroll
            .checked_add(lamports_in)
            .ok_or(ErrorCode::Overflow)?;

        global_state.total_shares = global_state
            .total_shares
            .checked_add(shares)
            .ok_or(ErrorCode::Overflow)?;

        // Transfer SOL from the signer to the vault account
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.signer.to_account_info(),
                to: ctx.accounts.vault_account.to_account_info(),
            },
        );

        transfer(cpi_context, lamports_in)?;

        Ok(())
    }

    pub fn deposit_funds(ctx: Context<DepositFunds>, lamports_in: u64) -> Result<()> {
        // Update the user balance
        let user_balance = &mut ctx.accounts.user_balance;
        user_balance.balance = user_balance
            .balance
            .checked_add(lamports_in)
            .ok_or(ErrorCode::Overflow)?;

        // Update the user funds in global state
        let global_state = &mut ctx.accounts.global_state;
        global_state.user_funds = global_state
            .user_funds
            .checked_add(lamports_in)
            .ok_or(ErrorCode::Overflow)?;

        // Transfer SOL from the signer to the vault account
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.signer.to_account_info(),
                to: ctx.accounts.vault_account.to_account_info(),
            },
        );

        transfer(cpi_context, lamports_in)?;

        Ok(())
    }

    pub fn play_game(
        ctx: Context<PlayGame>,
        chance: u64,
        random_number: u64,
        wager: u64,
    ) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        let vault_balance = ctx.accounts.vault_account.lamports();
        sync_bankroll(global_state, vault_balance)?;

        // Only admin can call play game
        if ctx.accounts.signer.key() != global_state.admin {
            return Err(ErrorCode::Unauthorized.into());
        }

        if ctx.accounts.user_balance.balance < wager {
            return Err(ErrorCode::NotEnoughFundsToPlay.into());
        }

        // Chance must be between 2 and 50
        if chance < 2 || chance > 50 {
            return Err(ErrorCode::InvalidChance.into());
        }

        // Calculate max bet size given max drawdown risk r
        // bet_max(hard) = r · B / (m – 1)
        let risk = 100; // 1% r
        let casino_balance = vault_balance
            .checked_sub(global_state.user_funds)
            .ok_or(ErrorCode::Overflow)?;
        let chance_minus_one = chance.checked_sub(1).ok_or(ErrorCode::Overflow)?;
        let max_bet_size = casino_balance
            .checked_div(risk)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(chance_minus_one)
            .ok_or(ErrorCode::Overflow)?;

        if wager > max_bet_size {
            return Err(ErrorCode::BetTooBig.into());
        }

        // The casino has a 1/53 edge. the number 53 is intentionally chosen to be prime,
        // so as to make the casino edge calculation independent of the user's chosen chance.
        let casino_wins_anyway = random_number % 53 == 0;
        let player_wins = random_number % chance == 0 && !casino_wins_anyway;

        let user_balance = &mut ctx.accounts.user_balance;
        if player_wins {
            // their winnings would be wager * chance - wager = wager * (chance - 1)
            let winnings = wager
                .checked_mul(chance_minus_one)
                .ok_or(ErrorCode::Overflow)?;
            user_balance.balance = user_balance
                .balance
                .checked_add(winnings)
                .ok_or(ErrorCode::Overflow)?;
            global_state.user_funds = global_state
                .user_funds
                .checked_add(winnings)
                .ok_or(ErrorCode::Overflow)?;
            emit!(PlayResult { won: true })
        } else {
            user_balance.balance = user_balance
                .balance
                .checked_sub(wager)
                .ok_or(ErrorCode::Overflow)?;
            global_state.user_funds = global_state
                .user_funds
                .checked_sub(wager)
                .ok_or(ErrorCode::Overflow)?;
            emit!(PlayResult { won: false })
        }

        Ok(())
    }

    pub fn withdraw_funds(ctx: Context<WithdrawFunds>, lamports_in: u64) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        let vault = &ctx.accounts.vault_account;
        sync_bankroll(global_state, vault.lamports())?;

        if ctx.accounts.user_balance.balance < lamports_in {
            return Err(ErrorCode::NotEnoughFunds.into());
        }

        let vault_seeds: &[&[u8]] = &[
            b"vault",                   // the static seed
            &[ctx.bumps.vault_account], // the bump
        ];
        let signer_seeds: &[&[&[u8]]] = &[vault_seeds]; // slice-of-slices

        let cpi_accounts = Transfer {
            from: vault.to_account_info(),
            to: ctx.accounts.user.to_account_info(),
        };

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );

        transfer(cpi_ctx, lamports_in)?;
        global_state.user_funds = global_state
            .user_funds
            .checked_sub(lamports_in)
            .ok_or(ErrorCode::Overflow)?;

        Ok(())
    }

    pub fn withdraw_liquidity(ctx: Context<WithdrawReserveLiquidity>, _index: u64) -> Result<()> {
        let idx = &mut ctx.accounts.global_state;
        let vault = &ctx.accounts.vault_account;
        sync_bankroll(idx, vault.lamports())?;

        // Calculate share
        let pos = &mut ctx.accounts.user_liquidity;

        // principal share (exact pro-rata)
        let principal = (u128::from(idx.deposits) * pos.shares / idx.total_shares) as u64;
        // profits earned while staked
        let profit_delta = idx.acc_profit_per_share - pos.profit_entry; // i128
        let pnl_q64 = pos.shares as i128 * profit_delta; // i256 in math, cast fits
        let pnl_lamports = (pnl_q64 >> 64) as i64; // signed
        let payout = (principal as i128 + pnl_lamports as i128) as u64;

        // burn shares & update globals
        idx.total_shares = idx
            .total_shares
            .checked_sub(pos.shares)
            .ok_or(ErrorCode::Overflow)?;
        idx.last_bankroll = idx
            .last_bankroll
            .checked_sub(payout)
            .ok_or(ErrorCode::Overflow)?;

        // Send the money
        let vault_seeds: &[&[u8]] = &[
            b"vault",                   // the static seed
            &[ctx.bumps.vault_account], // the bump
        ];
        let signer_seeds: &[&[&[u8]]] = &[vault_seeds]; // slice-of-slices
        let cpi_accounts = Transfer {
            from: vault.to_account_info(),
            to: ctx.accounts.signer.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );

        transfer(cpi_ctx, payout)?;

        idx.deposits = idx
            .deposits
            .checked_sub(pos.deposited)
            .ok_or(ErrorCode::Overflow)?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction()]
pub struct Initialize<'info> {
    #[account(mut, signer)]
    pub admin: Signer<'info>,

    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + // account_discriminator: u64
                    std::mem::size_of::<GlobalState>(),
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(index: u64, lamports_in: u64)]
pub struct DepositLiquidity<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub vault_account: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [b"global_state"], 
        bump
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        init,
        space = 8 + std::mem::size_of::<UserLiquidity>(), // Allocate space
        payer = signer,
        seeds = [b"user_liquidity", signer.key().as_ref(), &index.to_le_bytes()], 
        bump,

    )]
    pub user_liquidity: Account<'info, UserLiquidity>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(lamports_in: u64)]
pub struct DepositFunds<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init_if_needed,
        seeds = [b"user_balance", signer.key().as_ref()],
        bump,
        payer = signer,
        space = 8 + std::mem::size_of::<UserBalance>(), // Allocate space
    )]
    pub user_balance: Account<'info, UserBalance>,

    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub vault_account: SystemAccount<'info>, // Receiving account

    #[account(
        mut,
        seeds = [b"global_state"], 
        bump
    )]
    pub global_state: Account<'info, GlobalState>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct GlobalState {
    pub admin: Pubkey,
    pub total_shares: u128,
    pub acc_profit_per_share: i128,
    pub user_funds: u64,
    pub deposits: u64,
    pub last_bankroll: u64, // vault – user_funds at last sync
}

#[account]
pub struct UserBalance {
    pub balance: u64, // Game balance
    pub bump: u8,     // For PDA verification
}

#[account]
pub struct UserLiquidity {
    pub deposited: u64,     // lamports they put in
    pub shares: u128,       // proportional share of the bankroll
    pub profit_entry: i128, // snapshot of acc_profits_per_share at the time of deposit
    pub bump: u8,           // For PDA verification
}

#[account]
pub struct PlayerState {
    allowed_user: Pubkey,
    latest_flip_result: bool,   // Stores the result of the latest flip
    randomness_account: Pubkey, // Reference to the Switchboard randomness account
    current_guess: bool,        // The current guess
    wager: u64,                 // The wager lamports_in
    bump: u8,
    commit_slot: u64, // The slot at which the randomness was committed
}

#[derive(Accounts)]
#[instruction(chance: u64, random_number: u64, wager: u64)]
pub struct PlayGame<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"user_balance", user.key().as_ref()],
        bump,
    )]
    pub user_balance: Account<'info, UserBalance>,
    #[account(
        mut,
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        seeds = [b"vault"],
        bump
    )]
    pub vault_account: SystemAccount<'info>, // Receiving account

    #[account(mut)]
    pub user: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(chance: u64)]
pub struct WithdrawFunds<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [b"user_balance", user.key().as_ref()],
        bump,
    )]
    pub user_balance: Account<'info, UserBalance>,
    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub vault_account: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [b"global_state"], 
        bump
    )]
    pub global_state: Account<'info, GlobalState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(index: u64)]
pub struct WithdrawReserveLiquidity<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub vault_account: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [b"global_state"], 
        bump
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        mut,
        seeds = [b"user_liquidity", signer.key().as_ref(), &index.to_le_bytes()],
        close = signer,
        bump,

    )]
    pub user_liquidity: Account<'info, UserLiquidity>,

    pub system_program: Program<'info, System>,
}

// === Errors ===
#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized access attempt.")]
    Unauthorized,
    GameStillActive,
    NotEnoughFundsToPlay,
    NotEnoughFunds,
    IncorrectTokenMint,
    RandomnessAlreadyRevealed,
    RandomnessNotResolved,
    RandomnessExpired,
    InvalidChance,
    InvalidRandomnessAccount,
    Overflow,
    BetTooBig,
    InsufficientOutput,
    LiquidityLocked,
}

// === Events ===
#[event]
pub struct PlayResult {
    pub won: bool,
}
