// Test comment for pre-commit hook
mod error;
mod instruction;
mod state;

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    program_error::ProgramError,
    pubkey::Pubkey,
    program::invoke,
    system_instruction,
    rent::Rent,
    program_pack::Pack,
    program::invoke_signed,
};

use spl_token::{
    instruction as token_instruction,
    state::{Account as TokenAccount, Mint},
};
use borsh::{BorshSerialize, BorshDeserialize};

use crate::{
    error::CasinoError,
    instruction::CasinoInstruction,
    state::GlobalState,
};

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = CasinoInstruction::unpack(instruction_data)?;

    match instruction {
        CasinoInstruction::Initialize { total_token_supply } => {
            process_initialize(program_id, accounts, total_token_supply)
        }
        CasinoInstruction::Deposit { amount } => {
            process_deposit(program_id, accounts, amount)
        }
        CasinoInstruction::BurnAndWithdraw { amount } => {
            process_burn_and_withdraw(program_id, accounts, amount)
        }
        CasinoInstruction::PlayGame { bet_amount, multiplier, rng_seed } => {
            process_play_game(program_id, accounts, bet_amount, multiplier, rng_seed)
        }
    }
}

// Helper function to load account data
fn load_account_data<T: BorshDeserialize>(account: &AccountInfo) -> Result<T, ProgramError> {
    let data = account.try_borrow_data()?;
    let mut reader = std::io::Cursor::new(data.as_ref());
    T::deserialize_reader(&mut reader)
        .map_err(|_| ProgramError::InvalidAccountData)
}

fn process_initialize(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    total_token_supply: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let admin = next_account_info(account_info_iter)?;
    let global_state_account = next_account_info(account_info_iter)?;
    let token_mint = next_account_info(account_info_iter)?;
    let reserve_token_account = next_account_info(account_info_iter)?;
    let vault_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;

    // Verify admin is a signer
    if !admin.is_signer {
        return Err(CasinoError::InvalidAdmin.into());
    }

    // Verify system program
    if system_program.key != &solana_program::system_program::ID {
        return Err(CasinoError::InvalidInstruction.into());
    }

    // Verify token program
    if token_program.key != &spl_token::id() {
        return Err(CasinoError::InvalidInstruction.into());
    }

    // Verify global state account is owned by the program
    if global_state_account.owner != program_id {
        return Err(CasinoError::InvalidGlobalState.into());
    }

    // Create PDA for reserve authority
    let (reserve_authority, _bump) = Pubkey::find_program_address(
        &[b"reserve_authority"],
        program_id,
    );

    // Set the reserve token account's authority to the PDA
    let set_authority_ix = token_instruction::set_authority(
        token_program.key,
        reserve_token_account.key,
        Some(&reserve_authority),
        token_instruction::AuthorityType::AccountOwner,
        admin.key,
        &[],
    )?;

    invoke(
        &set_authority_ix,
        &[
            reserve_token_account.clone(),
            token_mint.clone(),
            admin.clone(),
            token_program.clone(),
        ],
    )?;

    // Initialize global state
    let global_state = GlobalState {
        admin: *admin.key,
        token_mint: *token_mint.key,
        reserve_token_account: *reserve_token_account.key,
        vault_account: *vault_account.key,
        total_deposits: 0,
        circulating_tokens: 0,
        total_token_supply,
    };

    // Get a mutable reference to the account's data
    let mut account_data = global_state_account.try_borrow_mut_data()?;
    
    // Serialize the global state into the account's data
    global_state.serialize(&mut &mut account_data[..])
        .map_err(|_| ProgramError::InvalidAccountData)?;

    Ok(())
}

fn process_deposit(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let user = next_account_info(account_info_iter)?;
    let user_token_account = next_account_info(account_info_iter)?;
    let reserve_token_account = next_account_info(account_info_iter)?;
    let vault_account = next_account_info(account_info_iter)?;
    let global_state_account = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let reserve_authority = next_account_info(account_info_iter)?;
    let token_mint = next_account_info(account_info_iter)?;

    // Verify user is a signer
    if !user.is_signer {
        return Err(CasinoError::InvalidInstruction.into());
    }

    // Verify global state account is owned by the program
    if global_state_account.owner != program_id {
        return Err(CasinoError::InvalidGlobalState.into());
    }

    // Verify system program
    if system_program.key != &solana_program::system_program::ID {
        return Err(CasinoError::InvalidInstruction.into());
    }

    // Verify reserve authority is the expected PDA
    let (expected_authority, _) = Pubkey::find_program_address(
        &[b"reserve_authority"],
        program_id,
    );
    if reserve_authority.key != &expected_authority {
        return Err(CasinoError::InvalidInstruction.into());
    }

    // Load global state
    let mut global_state: GlobalState = load_account_data(global_state_account)?;

    // Transfer funds from user to vault using system program
    let transfer_ix = system_instruction::transfer(
        user.key,
        vault_account.key,
        amount,
    );

    invoke(
        &transfer_ix,
        &[
            user.clone(),
            vault_account.clone(),
            system_program.clone(),
        ],
    )?;

    // Calculate tokens to transfer (1:1 ratio for simplicity)
    let tokens_to_transfer = amount;

    // Use the reserve_authority from the accounts list
    let reserve_authority_info = reserve_authority.clone();
    
    let transfer_ix = token_instruction::transfer(
        token_program.key,
        reserve_token_account.key,
        user_token_account.key,
        reserve_authority_info.key, // PDA authority
        &[], // no multisig
        tokens_to_transfer,
    )?;
    
    // Ensure bump is defined
    let (expected_authority, bump) = Pubkey::find_program_address(
        &[b"reserve_authority"],
        program_id,
    );

    invoke_signed(
        &transfer_ix,
        &[
            reserve_token_account.clone(),
            user_token_account.clone(),
            reserve_authority_info.clone(), // This is the authority, not the mint
            token_program.clone(),
        ],
        &[&[b"reserve_authority", &[bump][..]]],
    )?;

    // Update global state
    global_state.total_deposits += amount;
    global_state.circulating_tokens += tokens_to_transfer;

    // Save updated global state
    let mut account_data = global_state_account.try_borrow_mut_data()?;
    global_state.serialize(&mut &mut account_data[..])
        .map_err(|_| ProgramError::InvalidAccountData)?;

    Ok(())
}

fn process_burn_and_withdraw(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let user = next_account_info(account_info_iter)?;
    let user_token_account = next_account_info(account_info_iter)?;
    let token_mint = next_account_info(account_info_iter)?;
    let vault_account = next_account_info(account_info_iter)?;
    let global_state_account = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    // Verify user is a signer
    if !user.is_signer {
        return Err(CasinoError::InvalidInstruction.into());
    }

    // Verify global state account is owned by the program
    if global_state_account.owner != program_id {
        return Err(CasinoError::InvalidGlobalState.into());
    }

    // Verify system program
    if system_program.key != &solana_program::system_program::ID {
        return Err(CasinoError::InvalidInstruction.into());
    }

    // Load global state
    let mut global_state: GlobalState = load_account_data(global_state_account)?;

    // Verify vault account is the expected PDA
    let (expected_vault, _) = Pubkey::find_program_address(
        &[b"vault", global_state_account.key.as_ref()],
        program_id,
    );
    if vault_account.key != &expected_vault {
        return Err(CasinoError::InvalidVaultAccount.into());
    }

    // Calculate user's share of the vault
    let share = amount as f64 / global_state.circulating_tokens as f64;
    let payout = (vault_account.lamports() as f64 * share) as u64;

    // Burn tokens
    let burn_ix = token_instruction::burn(
        token_program.key,
        user_token_account.key,
        token_mint.key,
        user.key,
        &[],
        amount,
    )?;

    invoke(
        &burn_ix,
        &[
            user_token_account.clone(),
            token_mint.clone(),
            user.clone(),
            token_program.clone(),
        ],
    )?;

    // Verify vault has enough funds for payout
    if vault_account.lamports() < payout {
        return Err(CasinoError::InsufficientFunds.into());
    }

    // Get the vault PDA seeds
    let seeds = &[b"vault", global_state_account.key.as_ref()];
    let (_, bump) = Pubkey::find_program_address(seeds, program_id);

    // Transfer payout from vault to user using system program
    let transfer_ix = system_instruction::transfer(
        vault_account.key,
        user.key,
        payout,
    );

    invoke_signed(
        &transfer_ix,
        &[
            vault_account.clone(),
            user.clone(),
            system_program.clone(),
        ],
        &[&[b"vault", global_state_account.key.as_ref(), &[bump][..]]],
    )?;

    // Update global state
    global_state.circulating_tokens -= amount;

    // Save updated global state
    let mut account_data = global_state_account.try_borrow_mut_data()?;
    global_state.serialize(&mut &mut account_data[..])
        .map_err(|_| ProgramError::InvalidAccountData)?;

    Ok(())
}

fn process_play_game(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    bet_amount: u64,
    multiplier: u64,
    rng_seed: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let user = next_account_info(account_info_iter)?;
    let vault_account = next_account_info(account_info_iter)?;
    let global_state_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    // Verify user is a signer
    if !user.is_signer {
        return Err(CasinoError::InvalidInstruction.into());
    }

    // Verify global state account is owned by the program
    if global_state_account.owner != program_id {
        return Err(CasinoError::InvalidGlobalState.into());
    }

    // Verify system program
    if system_program.key != &solana_program::system_program::ID {
        return Err(CasinoError::InvalidInstruction.into());
    }

    // Load global state
    let global_state: GlobalState = load_account_data(global_state_account)?;

    // Verify vault account is the expected PDA
    let (expected_vault, _) = Pubkey::find_program_address(
        &[b"vault", global_state_account.key.as_ref()],
        program_id,
    );
    if vault_account.key != &expected_vault {
        return Err(CasinoError::InvalidVaultAccount.into());
    }

    // Calculate potential winnings (not including bet)
    let potential_winnings = bet_amount.checked_mul(multiplier.checked_sub(1)
        .ok_or(CasinoError::Overflow)?)
        .ok_or(CasinoError::Overflow)?;

    // Verify vault has enough funds for potential winnings
    if vault_account.lamports() < potential_winnings {
        return Err(CasinoError::InsufficientFunds.into());
    }

    // Verify user has enough funds for bet
    if user.lamports() < bet_amount {
        return Err(CasinoError::InsufficientFunds.into());
    }

    // Simple RNG using the provided seed
    // In production, you'd want to use a more secure RNG source
    let rng_value = rng_seed % multiplier;
    let is_win = rng_value == 0;

    // Get the vault PDA seeds
    let seeds = &[b"vault", global_state_account.key.as_ref()];
    let (_, bump) = Pubkey::find_program_address(seeds, program_id);

    if is_win {
        // User wins: transfer winnings from vault to user
        // User keeps their bet and receives winnings
        let transfer_ix = system_instruction::transfer(
            vault_account.key,
            user.key,
            potential_winnings,
        );

        invoke_signed(
            &transfer_ix,
            &[
                vault_account.clone(),
                user.clone(),
                system_program.clone(),
            ],
            &[&[b"vault", global_state_account.key.as_ref(), &[bump][..]]],
        )?;
    } else {
        // User loses: transfer bet from user to vault
        let transfer_ix = system_instruction::transfer(
            user.key,
            vault_account.key,
            bet_amount,
        );

        invoke(
            &transfer_ix,
            &[
                user.clone(),
                vault_account.clone(),
                system_program.clone(),
            ],
        )?;
    }

    Ok(())
}

#[cfg(test)]
mod test {
    use super::*;
    use solana_program_test::*;
    use solana_sdk::{
        account::{Account, AccountSharedData},
        instruction::{AccountMeta, Instruction},
        signature::{Keypair, Signer},
        system_program,
        transaction::Transaction,
        rent::Rent,
    };
    use spl_token::{
        instruction as token_instruction,
        state::{Account as TokenAccount, Mint},
    };

    #[tokio::test]
    async fn test_casino_program() {
        let program_id = Pubkey::new_unique();
        let (mut banks_client, payer, recent_blockhash) = ProgramTest::new(
            "casino_program",
            program_id,
            processor!(process_instruction),
        )
        .start()
        .await;

        // Create keypairs for accounts
        let admin = Keypair::new();
        let user = Keypair::new();
        let global_state = Keypair::new();
        let token_mint = Keypair::new();
        let reserve_token_account = Keypair::new();
        let user_token_account = Keypair::new();
        
        // Derive vault PDA
        let (vault_pda, _) = Pubkey::find_program_address(
            &[b"vault", global_state.pubkey().as_ref()],
            &program_id,
        );

        // Fund the admin account
        let rent = Rent::default();
        let space = GlobalState::LEN;
        let lamports = rent.minimum_balance(space);

        let mut transaction = Transaction::new_with_payer(
            &[system_instruction::transfer(
                &payer.pubkey(),
                &admin.pubkey(),
                lamports + 1000000, // Extra lamports for fees
            )],
            Some(&payer.pubkey()),
        );
        transaction.sign(&[&payer], recent_blockhash);
        banks_client.process_transaction(transaction).await.unwrap();

        // Fund the user account
        let mut transaction = Transaction::new_with_payer(
            &[system_instruction::transfer(
                &payer.pubkey(),
                &user.pubkey(),
                1000000, // Enough for deposits and fees
            )],
            Some(&payer.pubkey()),
        );
        transaction.sign(&[&payer], recent_blockhash);
        banks_client.process_transaction(transaction).await.unwrap();

        // Fund the vault account
        let vault_rent = rent.minimum_balance(TokenAccount::LEN);
        let mut transaction = Transaction::new_with_payer(
            &[system_instruction::transfer(
                &payer.pubkey(),
                &vault_pda,
                vault_rent, // Ensure rent-exempt balance
            )],
            Some(&payer.pubkey()),
        );
        transaction.sign(&[&payer], recent_blockhash);
        banks_client.process_transaction(transaction).await.unwrap();

        // Create and initialize token mint
        let mint_rent = rent.minimum_balance(Mint::LEN);
        let mut transaction = Transaction::new_with_payer(
            &[
                system_instruction::create_account(
                    &payer.pubkey(),
                    &token_mint.pubkey(),
                    mint_rent,
                    Mint::LEN as u64,
                    &spl_token::id(),
                ),
                token_instruction::initialize_mint(
                    &spl_token::id(),
                    &token_mint.pubkey(),
                    &admin.pubkey(),
                    Some(&admin.pubkey()),
                    9,
                ).unwrap(),
            ],
            Some(&payer.pubkey()),
        );
        transaction.sign(&[&payer, &token_mint], recent_blockhash);
        banks_client.process_transaction(transaction).await.unwrap();

        // Create reserve token account
        let account_rent = rent.minimum_balance(TokenAccount::LEN);
        let mut transaction = Transaction::new_with_payer(
            &[
                system_instruction::create_account(
                    &payer.pubkey(),
                    &reserve_token_account.pubkey(),
                    account_rent,
                    TokenAccount::LEN as u64,
                    &spl_token::id(),
                ),
                token_instruction::initialize_account(
                    &spl_token::id(),
                    &reserve_token_account.pubkey(),
                    &token_mint.pubkey(),
                    &admin.pubkey(),
                ).unwrap(),
            ],
            Some(&payer.pubkey()),
        );
        transaction.sign(&[&payer, &reserve_token_account], recent_blockhash);
        banks_client.process_transaction(transaction).await.unwrap();

        // Create user token account
        let mut transaction = Transaction::new_with_payer(
            &[
                system_instruction::create_account(
                    &payer.pubkey(),
                    &user_token_account.pubkey(),
                    account_rent,
                    TokenAccount::LEN as u64,
                    &spl_token::id(),
                ),
                token_instruction::initialize_account(
                    &spl_token::id(),
                    &user_token_account.pubkey(),
                    &token_mint.pubkey(),
                    &user.pubkey(),
                ).unwrap(),
            ],
            Some(&payer.pubkey()),
        );
        transaction.sign(&[&payer, &user_token_account], recent_blockhash);
        banks_client.process_transaction(transaction).await.unwrap();

        // Mint tokens to reserve account
        let total_token_supply = 1_000_000;
        let mut transaction = Transaction::new_with_payer(
            &[token_instruction::mint_to(
                &spl_token::id(),
                &token_mint.pubkey(),
                &reserve_token_account.pubkey(),
                &admin.pubkey(),
                &[],
                total_token_supply,
            ).unwrap()],
            Some(&payer.pubkey()),
        );
        transaction.sign(&[&payer, &admin], recent_blockhash);
        banks_client.process_transaction(transaction).await.unwrap();

        // Create global state account
        let mut transaction = Transaction::new_with_payer(
            &[system_instruction::create_account(
                &payer.pubkey(),
                &global_state.pubkey(),
                lamports,
                space as u64,
                &program_id,
            )],
            Some(&payer.pubkey()),
        );
        transaction.sign(&[&payer, &global_state], recent_blockhash);
        banks_client.process_transaction(transaction).await.unwrap();

        // Initialize global state
        println!("Testing casino initialization...");

        let initialize_instruction = CasinoInstruction::Initialize { total_token_supply };
        
        let mut transaction = Transaction::new_with_payer(
            &[Instruction::new_with_bytes(
                program_id,
                &initialize_instruction.pack(),
                vec![
                    AccountMeta::new(admin.pubkey(), true),
                    AccountMeta::new(global_state.pubkey(), false),
                    AccountMeta::new_readonly(token_mint.pubkey(), false),
                    AccountMeta::new(reserve_token_account.pubkey(), false),
                    AccountMeta::new(vault_pda, false),
                    AccountMeta::new_readonly(system_program::id(), false),
                    AccountMeta::new_readonly(spl_token::id(), false),
                ],
            )],
            Some(&payer.pubkey()),
        );

        // Only sign with payer and admin since they are the only signers in the instruction
        transaction.sign(&[&payer, &admin], recent_blockhash);
        banks_client.process_transaction(transaction).await.unwrap();

        // Verify global state
        let account = banks_client
            .get_account(global_state.pubkey())
            .await
            .expect("Failed to get global state account");

        if let Some(account_data) = account {
            let global_state: GlobalState = GlobalState::try_from_slice(&account_data.data)
                .expect("Failed to deserialize global state");
            assert_eq!(global_state.admin, admin.pubkey());
            assert_eq!(global_state.token_mint, token_mint.pubkey());
            assert_eq!(global_state.reserve_token_account, reserve_token_account.pubkey());
            assert_eq!(global_state.vault_account, vault_pda);
            assert_eq!(global_state.total_deposits, 0);
            assert_eq!(global_state.circulating_tokens, 0);
            assert_eq!(global_state.total_token_supply, total_token_supply);
            println!("✅ Casino initialized successfully");
        }

        // Verify reserve token account authority is set to PDA
        let reserve_account = banks_client
            .get_account(reserve_token_account.pubkey())
            .await
            .expect("Failed to get reserve token account");

        if let Some(account_data) = reserve_account {
            let token_account: TokenAccount = TokenAccount::unpack(&account_data.data)
                .expect("Failed to deserialize token account");
            let (reserve_authority, _) = Pubkey::find_program_address(
                &[b"reserve_authority"],
                &program_id,
            );
            assert_eq!(token_account.owner, reserve_authority);
            println!("✅ Reserve token account authority set to PDA");
        }

        // Test deposit
        println!("Testing deposit...");
        let deposit_amount = 1000;
        let deposit_instruction = CasinoInstruction::Deposit { amount: deposit_amount };

        // Get initial balances
        let initial_user_sol = banks_client
            .get_account(user.pubkey())
            .await
            .expect("Failed to get user account")
            .map(|acc| acc.lamports)
            .unwrap_or(0);
        let initial_vault_sol = banks_client
            .get_account(vault_pda)
            .await
            .expect("Failed to get vault account")
            .map(|acc| acc.lamports)
            .unwrap_or(0);
        let initial_user_tokens = banks_client
            .get_account(user_token_account.pubkey())
            .await
            .expect("Failed to get user token account")
            .map(|acc| TokenAccount::unpack(&acc.data).unwrap().amount)
            .unwrap_or(0);

        // Create PDA for reserve authority
        let (reserve_authority, _) = Pubkey::find_program_address(
            &[b"reserve_authority"],
            &program_id,
        );

        let mut transaction = Transaction::new_with_payer(
            &[Instruction::new_with_bytes(
                program_id,
                &deposit_instruction.pack(),
                vec![
                    AccountMeta::new(user.pubkey(), true),
                    AccountMeta::new(user_token_account.pubkey(), false),
                    AccountMeta::new(reserve_token_account.pubkey(), false),
                    AccountMeta::new(vault_pda, false),
                    AccountMeta::new(global_state.pubkey(), false),
                    AccountMeta::new_readonly(spl_token::id(), false),
                    AccountMeta::new_readonly(system_program::id(), false),
                    AccountMeta::new_readonly(reserve_authority, false),
                    AccountMeta::new_readonly(token_mint.pubkey(), false),
                ],
            )],
            Some(&payer.pubkey()),
        );

        // Only sign with payer and user since we're using PDA for token transfers
        transaction.sign(&[&payer, &user], recent_blockhash);
        banks_client.process_transaction(transaction).await.unwrap();

        // Verify deposit
        let account = banks_client
            .get_account(global_state.pubkey())
            .await
            .expect("Failed to get global state account");

        if let Some(account_data) = account {
            let global_state: GlobalState = GlobalState::try_from_slice(&account_data.data)
                .expect("Failed to deserialize global state");
            assert_eq!(global_state.total_deposits, deposit_amount);
            assert_eq!(global_state.circulating_tokens, deposit_amount);
            println!("✅ Deposit successful");
        }

        // Verify balances after deposit
        let user_sol = banks_client
            .get_account(user.pubkey())
            .await
            .expect("Failed to get user account")
            .map(|acc| acc.lamports)
            .unwrap_or(0);
        let vault_sol = banks_client
            .get_account(vault_pda)
            .await
            .expect("Failed to get vault account")
            .map(|acc| acc.lamports)
            .unwrap_or(0);
        let user_tokens = banks_client
            .get_account(user_token_account.pubkey())
            .await
            .expect("Failed to get user token account")
            .map(|acc| TokenAccount::unpack(&acc.data).unwrap().amount)
            .unwrap_or(0);

        assert_eq!(user_sol, initial_user_sol - deposit_amount, "User SOL should be reduced by deposit amount");
        assert_eq!(vault_sol, initial_vault_sol + deposit_amount, "Vault SOL should be increased by deposit amount");
        assert_eq!(user_tokens, initial_user_tokens + deposit_amount, "User tokens should be increased by deposit amount");
        println!("✅ Deposit balances verified");

        // Test play game
        println!("Testing play game...");
        let bet_amount = 100;
        let multiplier = 2;
        let rng_seed = 0; // This will result in a win
        let play_game_instruction = CasinoInstruction::PlayGame { bet_amount, multiplier, rng_seed };

        // Get initial balances before play game
        let initial_user_sol = banks_client
            .get_account(user.pubkey())
            .await
            .expect("Failed to get user account")
            .map(|acc| acc.lamports)
            .unwrap_or(0);
        let initial_vault_sol = banks_client
            .get_account(vault_pda)
            .await
            .expect("Failed to get vault account")
            .map(|acc| acc.lamports)
            .unwrap_or(0);

        let mut transaction = Transaction::new_with_payer(
            &[Instruction::new_with_bytes(
                program_id,
                &play_game_instruction.pack(),
                vec![
                    AccountMeta::new(user.pubkey(), true),
                    AccountMeta::new(vault_pda, false),
                    AccountMeta::new(global_state.pubkey(), false),
                    AccountMeta::new_readonly(system_program::id(), false),
                ],
            )],
            Some(&payer.pubkey()),
        );

        // Only sign with payer and user since they are the only signers in the instruction
        transaction.sign(&[&payer, &user], recent_blockhash);
        banks_client.process_transaction(transaction).await.unwrap();

        // Verify balances after play game (win)
        let user_sol = banks_client
            .get_account(user.pubkey())
            .await
            .expect("Failed to get user account")
            .map(|acc| acc.lamports)
            .unwrap_or(0);
        let vault_sol = banks_client
            .get_account(vault_pda)
            .await
            .expect("Failed to get vault account")
            .map(|acc| acc.lamports)
            .unwrap_or(0);

        let potential_winnings = bet_amount * (multiplier - 1);
        assert_eq!(user_sol, initial_user_sol + potential_winnings, "User should receive winnings");
        assert_eq!(vault_sol, initial_vault_sol - potential_winnings, "Vault should be reduced by winnings");
        println!("✅ Play game balances verified");

        // Test play game with loss
        println!("Testing play game with loss...");
        let bet_amount = 200;
        let multiplier = 2;
        let rng_seed = 1; // This will result in a loss
        let play_game_instruction = CasinoInstruction::PlayGame { bet_amount, multiplier, rng_seed };

        // Get initial balances before play game
        let initial_user_sol = banks_client
            .get_account(user.pubkey())
            .await
            .expect("Failed to get user account")
            .map(|acc| acc.lamports)
            .unwrap_or(0);
        let initial_vault_sol = banks_client
            .get_account(vault_pda)
            .await
            .expect("Failed to get vault account")
            .map(|acc| acc.lamports)
            .unwrap_or(0);

        let mut transaction = Transaction::new_with_payer(
            &[Instruction::new_with_bytes(
                program_id,
                &play_game_instruction.pack(),
                vec![
                    AccountMeta::new(user.pubkey(), true),
                    AccountMeta::new(vault_pda, false),
                    AccountMeta::new(global_state.pubkey(), false),
                    AccountMeta::new_readonly(system_program::id(), false),
                ],
            )],
            Some(&payer.pubkey()),
        );

        // Only sign with payer and user since they are the only signers in the instruction
        transaction.sign(&[&payer, &user], recent_blockhash);
        banks_client.process_transaction(transaction).await.unwrap();

        // Verify balances after play game (loss)
        let user_sol = banks_client
            .get_account(user.pubkey())
            .await
            .expect("Failed to get user account")
            .map(|acc| acc.lamports)
            .unwrap_or(0);
        let vault_sol = banks_client
            .get_account(vault_pda)
            .await
            .expect("Failed to get vault account")
            .map(|acc| acc.lamports)
            .unwrap_or(0);

        assert_eq!(user_sol, initial_user_sol - bet_amount, "User should lose bet amount");
        assert_eq!(vault_sol, initial_vault_sol + bet_amount, "Vault should receive bet amount");
        println!("✅ Play game with loss balances verified");

        // Test play game with multiplier of 3
        println!("Testing play game with multiplier of 3...");
        let bet_amount = 300;
        let multiplier = 3;
        let rng_seed = 0; // This will result in a win
        let play_game_instruction = CasinoInstruction::PlayGame { bet_amount, multiplier, rng_seed };

        // Get initial balances before play game
        let initial_user_sol = banks_client
            .get_account(user.pubkey())
            .await
            .expect("Failed to get user account")
            .map(|acc| acc.lamports)
            .unwrap_or(0);
        let initial_vault_sol = banks_client
            .get_account(vault_pda)
            .await
            .expect("Failed to get vault account")
            .map(|acc| acc.lamports)
            .unwrap_or(0);

        let mut transaction = Transaction::new_with_payer(
            &[Instruction::new_with_bytes(
                program_id,
                &play_game_instruction.pack(),
                vec![
                    AccountMeta::new(user.pubkey(), true),
                    AccountMeta::new(vault_pda, false),
                    AccountMeta::new(global_state.pubkey(), false),
                    AccountMeta::new_readonly(system_program::id(), false),
                ],
            )],
            Some(&payer.pubkey()),
        );

        // Only sign with payer and user since they are the only signers in the instruction
        transaction.sign(&[&payer, &user], recent_blockhash);
        banks_client.process_transaction(transaction).await.unwrap();

        // Verify balances after play game (win with multiplier 3)
        let user_sol = banks_client
            .get_account(user.pubkey())
            .await
            .expect("Failed to get user account")
            .map(|acc| acc.lamports)
            .unwrap_or(0);
        let vault_sol = banks_client
            .get_account(vault_pda)
            .await
            .expect("Failed to get vault account")
            .map(|acc| acc.lamports)
            .unwrap_or(0);

        let potential_winnings = bet_amount * (multiplier - 1);
        assert_eq!(user_sol, initial_user_sol + potential_winnings, "User should receive winnings with multiplier 3");
        assert_eq!(vault_sol, initial_vault_sol - potential_winnings, "Vault should be reduced by winnings with multiplier 3");
        println!("✅ Play game with multiplier 3 balances verified");

        // Test burn and withdraw
        println!("Testing burn and withdraw...");
        let withdraw_amount = 500; // Withdraw half of the tokens
        let burn_and_withdraw_instruction = CasinoInstruction::BurnAndWithdraw { amount: withdraw_amount };

        // Get initial balances before burn and withdraw
        let initial_user_sol = banks_client
            .get_account(user.pubkey())
            .await
            .expect("Failed to get user account")
            .map(|acc| acc.lamports)
            .unwrap_or(0);
        let initial_vault_sol = banks_client
            .get_account(vault_pda)
            .await
            .expect("Failed to get vault account")
            .map(|acc| acc.lamports)
            .unwrap_or(0);
        let initial_user_tokens = banks_client
            .get_account(user_token_account.pubkey())
            .await
            .expect("Failed to get user token account")
            .map(|acc| TokenAccount::unpack(&acc.data).unwrap().amount)
            .unwrap_or(0);

        // Get circulating tokens before burn and withdraw
        let initial_circulating_tokens = banks_client
            .get_account(global_state.pubkey())
            .await
            .expect("Failed to get global state account")
            .map(|acc| GlobalState::try_from_slice(&acc.data).expect("Failed to deserialize global state"))
            .unwrap()
            .circulating_tokens;

        let mut transaction = Transaction::new_with_payer(
            &[Instruction::new_with_bytes(
                program_id,
                &burn_and_withdraw_instruction.pack(),
                vec![
                    AccountMeta::new(user.pubkey(), true),
                    AccountMeta::new(user_token_account.pubkey(), false),
                    AccountMeta::new(token_mint.pubkey(), false),
                    AccountMeta::new(vault_pda, false),
                    AccountMeta::new(global_state.pubkey(), false),
                    AccountMeta::new_readonly(spl_token::id(), false),
                    AccountMeta::new_readonly(system_program::id(), false),
                ],
            )],
            Some(&payer.pubkey()),
        );

        // Only sign with payer and user since they are the only signers in the instruction
        transaction.sign(&[&payer, &user], recent_blockhash);
        banks_client.process_transaction(transaction).await.unwrap();

        // Verify burn and withdraw
        let account = banks_client
            .get_account(global_state.pubkey())
            .await
            .expect("Failed to get global state account");

        if let Some(account_data) = account {
            let global_state: GlobalState = GlobalState::try_from_slice(&account_data.data)
                .expect("Failed to deserialize global state");
            assert_eq!(global_state.circulating_tokens, deposit_amount - withdraw_amount);
            println!("✅ Burn and withdraw successful");
        }

        // Verify balances after burn and withdraw
        let user_sol = banks_client
            .get_account(user.pubkey())
            .await
            .expect("Failed to get user account")
            .map(|acc| acc.lamports)
            .unwrap_or(0);
        let vault_sol = banks_client
            .get_account(vault_pda)
            .await
            .expect("Failed to get vault account")
            .map(|acc| acc.lamports)
            .unwrap_or(0);
        let user_tokens = banks_client
            .get_account(user_token_account.pubkey())
            .await
            .expect("Failed to get user token account")
            .map(|acc| TokenAccount::unpack(&acc.data).unwrap().amount)
            .unwrap_or(0);

        // Calculate expected payout based on share of vault
        // The share should be calculated based on the total circulating tokens before withdrawal
        let share = withdraw_amount as f64 / initial_circulating_tokens as f64;
        let expected_payout = (initial_vault_sol as f64 * share) as u64;

        assert_eq!(user_tokens, initial_user_tokens - withdraw_amount, "User tokens should be reduced by burn amount");
        assert_eq!(user_sol, initial_user_sol + expected_payout, "User should receive payout");
        assert_eq!(vault_sol, initial_vault_sol - expected_payout, "Vault should be reduced by payout");
        println!("✅ Burn and withdraw balances verified");
    }
}
