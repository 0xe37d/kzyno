use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Burn, Mint, TokenAccount, TokenInterface, TransferChecked},
};

declare_id!("Har3kPZU49yuvD7etW76fMcj3AW83Q1TbRkz1Y9RjCdv");

#[program]
mod kzyno {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        global_state.admin = *ctx.accounts.admin.key;
        global_state.token_mint = ctx.accounts.token_mint.key();

        Ok(())
    }

    pub fn deposit_liquidity(ctx: Context<DepositLiquidity>, amount: u64) -> Result<()> {
        // Transfer SOL from the signer to the vault account
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.signer.to_account_info(),
                to: ctx.accounts.vault_account.to_account_info(),
            },
        );

        transfer(cpi_context, amount)?;

        // Transfer kzyno token from the reserve token account to the user token account
        let signer_seeds: &[&[&[u8]]] = &[&[b"reserve_authority", &[ctx.bumps.reserve_authority]]];
        let decimals = ctx.accounts.token_mint.decimals;
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.reserve_token_vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            mint: ctx.accounts.token_mint.to_account_info(),
            authority: ctx.accounts.reserve_authority.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(signer_seeds);

        token_interface::transfer_checked(cpi_context, amount, decimals)?;

        // Update the global state
        let global_state = &mut ctx.accounts.global_state;
        global_state.circulating_tokens = global_state
            .circulating_tokens
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;
        global_state.deposits = global_state
            .deposits
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;

        Ok(())
    }

    pub fn deposit_funds(ctx: Context<DepositFunds>, amount: u64) -> Result<()> {
        // Update the user balance
        let user_balance = &mut ctx.accounts.user_balance;
        user_balance.balance = user_balance
            .balance
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;

        // Update the user funds in global state
        let global_state = &mut ctx.accounts.global_state;
        global_state.user_funds = global_state
            .user_funds
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;

        // Transfer SOL from the signer to the vault account
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.signer.to_account_info(),
                to: ctx.accounts.vault_account.to_account_info(),
            },
        );

        transfer(cpi_context, amount)?;

        Ok(())
    }

    pub fn play_game(
        ctx: Context<PlayGame>,
        chance: u64,
        random_number: u64,
        wager: u64,
    ) -> Result<()> {
        // Only admin can call play game
        if ctx.accounts.signer.key() != ctx.accounts.global_state.admin {
            return Err(ErrorCode::Unauthorized.into());
        }

        if ctx.accounts.user_balance.balance < wager {
            return Err(ErrorCode::NotEnoughFundsToPlay.into());
        }

        // Chance must be between 2 and 50
        if chance < 2 || chance > 50 {
            return Err(ErrorCode::InvalidChance.into());
        }

        let global_state = &mut ctx.accounts.global_state;
        // Calculate max bet size given max drawdown risk r
        // bet_max(hard) = r · B / (m – 1)
        let risk = 100; // 1% r
        let vault_balance = ctx.accounts.vault_account.lamports();
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

    pub fn withdraw_funds(ctx: Context<WithdrawFunds>, amount: u64) -> Result<()> {
        if ctx.accounts.user_balance.balance < amount {
            return Err(ErrorCode::NotEnoughFunds.into());
        }

        let vault_seeds: &[&[u8]] = &[
            b"vault",                   // the static seed
            &[ctx.bumps.vault_account], // the bump
        ];
        let signer_seeds: &[&[&[u8]]] = &[vault_seeds]; // slice-of-slices

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_account.to_account_info(),
            to: ctx.accounts.user.to_account_info(),
        };

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );

        transfer(cpi_ctx, amount)?;
        let global_state = &mut ctx.accounts.global_state;
        global_state.user_funds = global_state
            .user_funds
            .checked_sub(amount)
            .ok_or(ErrorCode::Overflow)?;

        Ok(())
    }

    pub fn withdraw_liquidity(ctx: Context<WithdrawReserveLiquidity>, amount: u64) -> Result<()> {
        // Verify proper token mint
        if ctx.accounts.token_mint.key() != ctx.accounts.global_state.token_mint {
            return Err(ErrorCode::IncorrectTokenMint.into());
        }

        let cpi_accounts = Burn {
            mint: ctx.accounts.token_mint.to_account_info(),
            from: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.signer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);

        // Burn the fkn token!
        token_interface::burn(cpi_context, amount)?;

        let global_state = &mut ctx.accounts.global_state;
        global_state.deposits = global_state
            .deposits
            .checked_sub(amount)
            .ok_or(ErrorCode::Overflow)?;
        // Calculate what fraction of circulating kzyno tokens they own
        let fraction = global_state
            .circulating_tokens
            .checked_div(amount)
            .ok_or(ErrorCode::Overflow)?;

        // Calculate the current bankroll + profits: amount in vault - amount that is user credit / funds
        let bankroll_plus_profits = ctx
            .accounts
            .vault_account
            .lamports()
            .checked_sub(global_state.user_funds)
            .ok_or(ErrorCode::Overflow)?;

        // They are entitled to that fraction of the bankroll + profits
        let dues = bankroll_plus_profits
            .checked_div(fraction)
            .ok_or(ErrorCode::Overflow)?;

        // Send the money
        let vault_seeds: &[&[u8]] = &[
            b"vault",                   // the static seed
            &[ctx.bumps.vault_account], // the bump
        ];
        let signer_seeds: &[&[&[u8]]] = &[vault_seeds]; // slice-of-slices
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_account.to_account_info(),
            to: ctx.accounts.signer.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );

        transfer(cpi_ctx, dues)?;

        // Update the global state
        global_state.circulating_tokens -= amount;

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

    #[account(
        init_if_needed,
        payer = admin,
        token::mint = token_mint,
        token::authority = reserve_authority,
        token::token_program = token_program,
        seeds = [b"reserve_token_vault"],
        bump
    )]
    pub reserve_token_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = admin,
        space = 0,
        seeds = [b"reserve_authority"],
        bump
    )]
    /// CHECK: Only used as token account authority
    pub reserve_authority: UncheckedAccount<'info>,
    pub token_mint: InterfaceAccount<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
#[instruction(amount: u64)]
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

    #[account(mut)]
    pub token_mint: InterfaceAccount<'info, Mint>,
    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = token_mint,
        associated_token::authority = signer,
        associated_token::token_program = token_program,
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = token_mint,
        token::authority = reserve_authority,
        token::token_program = token_program,
        seeds = [b"reserve_token_vault"],
        bump
    )]
    pub reserve_token_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        seeds = [b"reserve_authority"],
        bump,
    )]
    /// CHECK: Only used as token account authority
    pub reserve_authority: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(amount: u64)]
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
    pub token_mint: Pubkey,
    pub circulating_tokens: u64,
    pub user_funds: u64,
    pub deposits: u64,
}

#[account]
pub struct UserBalance {
    pub balance: u64, // Game balance
    pub bump: u8,     // For PDA verification
}

#[account]
pub struct PlayerState {
    allowed_user: Pubkey,
    latest_flip_result: bool,   // Stores the result of the latest flip
    randomness_account: Pubkey, // Reference to the Switchboard randomness account
    current_guess: bool,        // The current guess
    wager: u64,                 // The wager amount
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
#[instruction(amount: u64)]
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

    #[account(mut)]
    pub token_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = signer,
        associated_token::token_program = token_program,
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = token_mint,
        token::authority = reserve_authority,
        token::token_program = token_program,
        seeds = [b"reserve_token_vault"],
        bump
    )]
    pub reserve_token_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        seeds = [b"reserve_authority"],
        bump,
    )]
    /// CHECK: Only used as token account authority
    pub reserve_authority: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
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
}

// === Events ===
#[event]
pub struct PlayResult {
    pub won: bool,
}
