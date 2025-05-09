use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked},
};
use switchboard_on_demand::randomness::RandomnessAccountData;

declare_id!("93in8j7MghiE1oEDWC7eeMj71Mn93SdCgmifr2SYii8R");

pub fn randomness_transfer<'a>(
    system_program: AccountInfo<'a>,
    from: AccountInfo<'a>,
    to: AccountInfo<'a>,
    amount: u64,
    seeds: Option<&[&[&[u8]]]>, // Use Option to explicitly handle the presence or absence of seeds
) -> Result<()> {
    let amount_needed = amount;
    if amount_needed > from.lamports() {
        msg!(
            "Need {} lamports, but only have {}",
            amount_needed,
            from.lamports()
        );
        return Err(ErrorCode::NotEnoughFundsToPlay.into());
    }

    let transfer_accounts = anchor_lang::system_program::Transfer {
        from: from.to_account_info(),
        to: to.to_account_info(),
    };

    let transfer_ctx = match seeds {
        Some(seeds) => CpiContext::new_with_signer(system_program, transfer_accounts, seeds),
        None => CpiContext::new(system_program, transfer_accounts),
    };

    anchor_lang::system_program::transfer(transfer_ctx, amount)
}

#[program]
mod kzyno {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, total_token_supply: u64) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        global_state.admin = *ctx.accounts.admin.key;
        global_state.token_mint = ctx.accounts.token_mint.key();
        global_state.total_deposits = 0;
        global_state.circulating_tokens = 0;
        global_state.total_token_supply = total_token_supply;

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

        msg!(
            "Reserve vault token balance: {}",
            ctx.accounts.reserve_token_vault.amount
        );
        msg!(
            "User token account: {}",
            ctx.accounts.user_token_account.key()
        );
        msg!("Attempting transfer of {}", amount);

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
        global_state.total_deposits += amount;
        global_state.circulating_tokens += amount;

        Ok(())
    }

    pub fn deposit_funds(ctx: Context<DepositFunds>, amount: u64) -> Result<()> {
        // Update the user balance
        let user_balance = &mut ctx.accounts.user_balance;
        user_balance.balance = user_balance
            .balance
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

    // Flip the coin; only callable by the allowed user
    pub fn coin_flip(
        ctx: Context<CoinFlip>,
        randomness_account: Pubkey,
        guess: bool,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let player_state = &mut ctx.accounts.player_state;
        // Record the user's guess
        player_state.current_guess = guess;
        let randomness_data =
            RandomnessAccountData::parse(ctx.accounts.randomness_account_data.data.borrow())
                .unwrap();

        if randomness_data.seed_slot != clock.slot - 1 {
            msg!("seed_slot: {}", randomness_data.seed_slot);
            msg!("slot: {}", clock.slot);
            return Err(ErrorCode::RandomnessAlreadyRevealed.into());
        }
        // Track the player's commited values so you know they don't request randomness
        // multiple times.
        player_state.commit_slot = randomness_data.seed_slot;

        // ***
        // IMPORTANT: Remember, in Switchboard Randomness, it's the responsibility of the caller to reveal the randomness.
        // Therefore, the game collateral MUST be taken upon randomness request, not on reveal.
        // ***
        randomness_transfer(
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.user.to_account_info(), // Include the user_account
            ctx.accounts.escrow_account.to_account_info(),
            player_state.wager,
            None,
        )?;

        // Store flip commit
        player_state.randomness_account = randomness_account;

        // Log the result
        msg!("Coin flip initiated, randomness requested.");
        Ok(())
    }

    pub fn settle_flip(ctx: Context<SettleFlip>, escrow_bump: u8) -> Result<()> {
        let clock: Clock = Clock::get()?;
        let player_state = &mut ctx.accounts.player_state;

        // Verify that the provided randomness account matches the stored one
        if ctx.accounts.randomness_account_data.key() != player_state.randomness_account {
            return Err(ErrorCode::InvalidRandomnessAccount.into());
        }

        // call the switchboard on-demand parse function to get the randomness data
        let randomness_data =
            RandomnessAccountData::parse(ctx.accounts.randomness_account_data.data.borrow())
                .unwrap();
        if randomness_data.seed_slot != player_state.commit_slot {
            return Err(ErrorCode::RandomnessExpired.into());
        }
        // call the switchboard on-demand get_value function to get the revealed random value
        let revealed_random_value = randomness_data
            .get_value(&clock)
            .map_err(|_| ErrorCode::RandomnessNotResolved)?;

        // Use the revealed random value to determine the flip results
        let randomness_result = revealed_random_value[0] % 2 == 0;

        // Update and log the result
        player_state.latest_flip_result = randomness_result;

        let seed_prefix = b"stateEscrow".as_ref();
        let escrow_seed = &[&seed_prefix[..], &[escrow_bump]];
        let seeds_slice: &[&[u8]] = escrow_seed;
        let binding = [seeds_slice];
        let seeds: Option<&[&[&[u8]]]> = Some(&binding);

        if randomness_result {
            msg!("FLIP_RESULT: Heads");
        } else {
            msg!("FLIP_RESULT: Tails");
        }
        if randomness_result == player_state.current_guess {
            msg!("You win!");
            let rent = Rent::get()?;
            let needed_lamports = player_state.wager * 2
                + rent.minimum_balance(ctx.accounts.escrow_account.data_len());
            if needed_lamports > ctx.accounts.escrow_account.lamports() {
                msg!("Not enough funds in treasury to pay out the user. Please try again later");
            } else {
                randomness_transfer(
                    ctx.accounts.system_program.to_account_info(),
                    ctx.accounts.escrow_account.to_account_info(), // Transfer from the escrow
                    ctx.accounts.user.to_account_info(),           // Payout to the user's wallet
                    player_state.wager * 2, // If the player wins, they get double their wager if the escrow account has enough funds
                    seeds,                  // Include seeds
                )?;
            }
        } else {
            // On lose, we keep the user's initial colletaral and they are
            // allowed to play again.
            msg!("You lose!");
        }

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(total_token_supply: u64)]
pub struct Initialize<'info> {
    #[account(mut, signer)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + // account_discriminator: u64
                    std::mem::size_of::<GlobalState>(),
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        init,
        payer = admin,
        token::mint = token_mint,
        token::authority = reserve_authority,
        token::token_program = token_program,
        seeds = [b"reserve_token_vault"],
        bump
    )]
    pub reserve_token_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
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

    #[account(mut)]
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

    #[account(mut)]
    pub vault_account: SystemAccount<'info>, // Receiving account

    pub system_program: Program<'info, System>,
}

#[account]
pub struct GlobalState {
    pub admin: Pubkey,
    pub token_mint: Pubkey,
    pub total_deposits: u64,
    pub circulating_tokens: u64,
    pub total_token_supply: u64,
}

#[account]
pub struct UserBalance {
    pub authority: Pubkey, // The user
    pub balance: u64,      // Custom token/game balance
    pub bump: u8,          // For PDA verification
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
pub struct CoinFlip<'info> {
    #[account(mut,
        seeds = [b"playerState".as_ref(), user.key().as_ref()],
        bump = player_state.bump)]
    pub player_state: Account<'info, PlayerState>,
    pub user: Signer<'info>,
    /// CHECK: The account's data is validated manually within the handler.
    pub randomness_account_data: AccountInfo<'info>,
    /// CHECK: This is a simple Solana account holding SOL.
    #[account(mut, seeds = [b"stateEscrow".as_ref()], bump)]
    pub escrow_account: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleFlip<'info> {
    #[account(mut,
        seeds = [b"playerState".as_ref(), user.key().as_ref()],
        bump = player_state.bump)]
    pub player_state: Account<'info, PlayerState>,
    /// CHECK: The account's data is validated manually within the handler.
    pub randomness_account_data: AccountInfo<'info>,
    /// CHECK: This is a simple Solana account holding SOL.
    #[account(mut, seeds = [b"stateEscrow".as_ref()], bump )]
    pub escrow_account: AccountInfo<'info>,
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// === Errors ===
#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized access attempt.")]
    Unauthorized,
    GameStillActive,
    NotEnoughFundsToPlay,
    RandomnessAlreadyRevealed,
    RandomnessNotResolved,
    RandomnessExpired,
    InvalidRandomnessAccount,
    Overflow,
}
