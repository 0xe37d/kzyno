use anyhow::{Result, Error, Context, anyhow};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig, program_pack::Pack, pubkey::Pubkey, signature::{read_keypair_file, Keypair}, signer::Signer, system_instruction, transaction::Transaction
};
use spl_token_2022::{
    instruction as token_instruction,
    state::{Account as TokenAccount},
};
use std::str::FromStr;
use std::env;
use std::fs;
use borsh::BorshDeserialize;
use serde_json;
use spl_associated_token_account;

use crate::instruction::CasinoInstruction;

#[derive(Debug)]
pub struct PlayResult {
    pub won: bool,
    pub amount_change: i64,
}

pub struct CasinoClient {
    rpc_client: RpcClient,
    payer: Keypair,
    program_id: Pubkey,
    global_state: Pubkey,
    token_mint: Pubkey,
    reserve_token_account: Pubkey,
    vault_pda: Pubkey,
}

impl CasinoClient {
    pub fn new() -> Result<Self> {
        // Load environment variables
        let rpc_url = env::var("RPC_URL").unwrap_or_else(|_| "https://api.devnet.solana.com".to_string());
        
        // Load constants from JSON file
        let constants = fs::read_to_string("scripts/devnet_constants.json")
            .map_err(|e| anyhow!("Failed to read devnet_constants.json: {}", e))?;
        let constants: serde_json::Value = serde_json::from_str(&constants)
            .map_err(|e| anyhow!("Failed to parse devnet_constants.json: {}", e))?;
        
        // Program ID from initialize.rs
        let program_id = Pubkey::from_str("JbGEnnwtxn5n2rWMbfnAconA2QafwQXV9oavX5bKk6i")?;
        
        // Load other constants from JSON
        let global_state = Pubkey::from_str(constants["global_state"].as_str().ok_or_else(|| anyhow!("Missing global_state in constants"))?)?;
        let token_mint = Pubkey::from_str(constants["token_mint"].as_str().ok_or_else(|| anyhow!("Missing token_mint in constants"))?)?;
        let reserve_token_account = Pubkey::from_str(constants["reserve_token_account"].as_str().ok_or_else(|| anyhow!("Missing reserve_token_account in constants"))?)?;
        let vault_pda = Pubkey::from_str(constants["vault"].as_str().ok_or_else(|| anyhow!("Missing vault in constants"))?)?;

        // Load payer keypair
        let keypair_path = env::var("KEYPAIR_PATH")?;
        let payer = read_keypair_file(&keypair_path)
            .map_err(|e| anyhow!("Failed to read keypair from {}: {}", keypair_path, e))?;

        // Create RPC client
        let rpc_client = RpcClient::new_with_commitment(
            rpc_url,
            CommitmentConfig::confirmed(),
        );

        Ok(Self {
            rpc_client,
            payer,
            program_id,
            global_state,
            token_mint,
            reserve_token_account,
            vault_pda,
        })
    }

    pub async fn deposit(&self, amount: u64) -> Result<()> {
        // Get user's token account
        let user_token_account = self.get_or_create_token_account()?;

        // Find the reserve authority PDA
        let (reserve_authority, _) = Pubkey::find_program_address(
            &[b"reserve_authority"],
            &self.program_id,
        );

        // Create deposit instruction
        let deposit_ix = CasinoInstruction::Deposit { amount }
            .pack();

        // Build transaction
        let mut transaction = Transaction::new_with_payer(
            &[solana_program::instruction::Instruction::new_with_bytes(
                self.program_id,
                &deposit_ix,
                vec![
                    solana_program::instruction::AccountMeta::new(self.payer.pubkey(), true),
                    solana_program::instruction::AccountMeta::new(user_token_account, false),
                    solana_program::instruction::AccountMeta::new(self.reserve_token_account, false),
                    solana_program::instruction::AccountMeta::new(self.vault_pda, false),
                    solana_program::instruction::AccountMeta::new(self.global_state, false),
                    solana_program::instruction::AccountMeta::new_readonly(spl_token_2022::ID, false),
                    solana_program::instruction::AccountMeta::new_readonly(solana_program::system_program::ID, false),
                    solana_program::instruction::AccountMeta::new_readonly(reserve_authority, false),
                    solana_program::instruction::AccountMeta::new_readonly(self.token_mint, false),
                ],
            )],
            Some(&self.payer.pubkey()),
        );

        // Sign and send transaction
        transaction.sign(&[&self.payer], self.rpc_client.get_latest_blockhash()?);
        self.rpc_client.send_and_confirm_transaction(&transaction)?;

        println!("✅ Successfully deposited {} lamports", amount);
        Ok(())
    }

    pub async fn withdraw(&self, amount: u64) -> Result<()> {
        // Get user's token account
        let user_token_account = self.get_or_create_token_account()?;

        // Create withdraw instruction
        let withdraw_ix = CasinoInstruction::BurnAndWithdraw { amount }
            .pack();

        // Build transaction
        let mut transaction = Transaction::new_with_payer(
            &[solana_program::instruction::Instruction::new_with_bytes(
                self.program_id,
                &withdraw_ix,
                vec![
                    solana_program::instruction::AccountMeta::new(self.payer.pubkey(), true),
                    solana_program::instruction::AccountMeta::new(user_token_account, false),
                    solana_program::instruction::AccountMeta::new(self.token_mint, false),
                    solana_program::instruction::AccountMeta::new(self.vault_pda, false),
                    solana_program::instruction::AccountMeta::new(self.global_state, false),
                    solana_program::instruction::AccountMeta::new_readonly(spl_token_2022::ID, false),
                    solana_program::instruction::AccountMeta::new_readonly(solana_program::system_program::ID, false),
                ],
            )],
            Some(&self.payer.pubkey()),
        );

        // Sign and send transaction
        transaction.sign(&[&self.payer], self.rpc_client.get_latest_blockhash()?);
        self.rpc_client.send_and_confirm_transaction(&transaction)?;

        println!("✅ Successfully withdrew {} tokens", amount);
        Ok(())
    }

    pub async fn play(&self, bet: u64, multiplier: u64) -> Result<PlayResult> {
        // Generate random seed
        let rng_seed = rand::random::<u64>();

        // Create play instruction
        let play_ix = CasinoInstruction::PlayGame { bet_amount: bet, multiplier, rng_seed }
            .pack();

        // Build transaction
        let mut transaction = Transaction::new_with_payer(
            &[solana_program::instruction::Instruction::new_with_bytes(
                self.program_id,
                &play_ix,
                vec![
                    solana_program::instruction::AccountMeta::new(self.payer.pubkey(), true),  // user
                    solana_program::instruction::AccountMeta::new(self.vault_pda, false),     // vault_account
                    solana_program::instruction::AccountMeta::new(self.global_state, false),  // global_state_account
                    solana_program::instruction::AccountMeta::new_readonly(solana_program::system_program::ID, false),  // system_program
                ],
            )],
            Some(&self.payer.pubkey()),
        );

        // Sign and send transaction
        transaction.sign(&[&self.payer], self.rpc_client.get_latest_blockhash()?);
        self.rpc_client.send_and_confirm_transaction(&transaction)?;

        // Determine if the player won based on the RNG seed
        // The program uses rng_seed % multiplier == 0 to determine a win
        let won = rng_seed % multiplier == 0;
        let amount_change = if won {
            (bet * (multiplier - 1)) as i64
        } else {
            -(bet as i64)
        };

        // Print result
        if won {
            println!("🎉 You won! Winnings: {} tokens", amount_change);
        } else {
            println!("😢 You lost! Lost bet: {} tokens", -amount_change);
        }

        Ok(PlayResult {
            won,
            amount_change,
        })
    }

    pub async fn get_balance(&self) -> Result<(u64, u64)> {
        // Get SOL balance
        let sol_balance = self.rpc_client.get_balance(&self.payer.pubkey())?;

        // Get token balance
        let user_token_account = self.get_or_create_token_account()?;
        let token_account = self.rpc_client.get_token_account(&user_token_account)?;
        let token_balance = token_account.map(|acc| acc.token_amount.amount.parse::<u64>().unwrap_or(0)).unwrap_or(0);

        Ok((sol_balance, token_balance))
    }

    pub async fn get_status(&self) -> Result<()> {
        // Get global state account
        let global_state_account = self.rpc_client.get_account(&self.global_state)?;
        let global_state = crate::state::GlobalState::try_from_slice(&global_state_account.data)?;

        // Get vault account info
        let vault_balance = match self.rpc_client.get_account(&self.vault_pda) {
            Ok(account) => format!("{} lamports", account.lamports),
            Err(_) => "Not initialized".to_string(),
        };

        println!("Casino Status:");
        println!("Total Deposits: {} lamports", global_state.total_deposits);
        println!("Circulating Tokens: {}", global_state.circulating_tokens);
        println!("Total Token Supply: {}", global_state.total_token_supply);
        println!("Vault Balance: {}", vault_balance);

        Ok(())
    }

    fn get_or_create_token_account(&self) -> Result<Pubkey> {
        // Find the associated token account address
        let (token_account, _) = Pubkey::find_program_address(
            &[
                self.payer.pubkey().as_ref(),
                spl_token_2022::ID.as_ref(),
                self.token_mint.as_ref(),
            ],
            &spl_associated_token_account::ID,
        );

        // Check if the account exists
        match self.rpc_client.get_account(&token_account) {
            Ok(_) => Ok(token_account),
            Err(_) => {
                // Account doesn't exist, create it using the ATA program
                let create_ata_ix = spl_associated_token_account::instruction::create_associated_token_account(
                    &self.payer.pubkey(),
                    &self.payer.pubkey(),
                    &self.token_mint,
                    &spl_token_2022::ID,
                );

                let mut transaction = Transaction::new_with_payer(
                    &[create_ata_ix],
                    Some(&self.payer.pubkey()),
                );

                transaction.sign(&[&self.payer], self.rpc_client.get_latest_blockhash()?);
                self.rpc_client.send_and_confirm_transaction(&transaction)?;

                Ok(token_account)
            }
        }
    }
} 