use solana_program::{
    instruction::AccountMeta,
    pubkey::Pubkey,
    system_instruction,
    system_program,
    program_pack::Pack,
};
use solana_sdk::{
    signature::{Keypair, read_keypair_file},
    signer::Signer,
    transaction::Transaction,
};
use solana_client::rpc_client::RpcClient;
use solana_client::rpc_request::TokenAccountsFilter;
use spl_token_2022::{
    instruction as token_instruction,
    state::{Account as TokenAccount},
    ID as TOKEN_PROGRAM_ID,
};
use std::str::FromStr;
use std::env;
use std::fs;
use serde_json;

// Import the program's instruction and state types
use casino_program::instruction::CasinoInstruction;
use casino_program::state::GlobalState;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Connect to devnet
    let rpc = RpcClient::new("https://api.devnet.solana.com");
    
    // Load admin keypair
    let admin = read_keypair_file("../../wallets/kzy2HnRf46r9zNvAuxhwoJcZrYVTQtTToZ7RNsHwsA4.json")?;
    
    // Program ID from deployment
    let program_id = Pubkey::from_str("JbGEnnwtxn5n2rWMbfnAconA2QafwQXV9oavX5bKk6i")?;
    
    // Load token mint (you'll need to replace this with your actual token mint)
    let token_mint = Pubkey::from_str("e37NMn6EQLSnaz2NZFmBckryxzDYFGfQSqZayeTB6pm")?;
    let total_token_supply = 1_000_000 * 10u64.pow(9); // Multiply by 10^9 for decimals
    
    // Derive global state PDA
    let (global_state_pda, _) = Pubkey::find_program_address(
        &[b"global_state"],
        &program_id,
    );
    
    // Derive PDAs
    let (vault_pda, _) = Pubkey::find_program_address(
        &[b"vault", global_state_pda.as_ref()],
        &program_id,
    );
    
    let (reserve_authority, _) = Pubkey::find_program_address(
        &[b"reserve_authority"],
        &program_id,
    );
    
    // Get recent blockhash
    let recent_blockhash = rpc.get_latest_blockhash()?;
    
    // Calculate space and rent for global state account
    let space = GlobalState::LEN;
    let rent = rpc.get_minimum_balance_for_rent_exemption(space)?;
    
    // Create global state account using invoke_signed
    let create_global_state_ix = system_instruction::create_account(
        &admin.pubkey(),
        &global_state_pda,
        rent,
        space as u64,
        &program_id,
    );
    
    // Create reserve token account manually
    let reserve_token_account = Keypair::new();
    let token_account_rent = rpc.get_minimum_balance_for_rent_exemption(TokenAccount::get_packed_len())?;
    
    let create_reserve_ix = system_instruction::create_account(
        &admin.pubkey(),
        &reserve_token_account.pubkey(),
        token_account_rent,
        TokenAccount::get_packed_len() as u64,
        &TOKEN_PROGRAM_ID,
    );
    
    let init_reserve_ix = token_instruction::initialize_account(
        &TOKEN_PROGRAM_ID,
        &reserve_token_account.pubkey(),
        &token_mint,
        &reserve_authority,
    )?;
    
    // Fund the vault PDA with some SOL
    let vault_funding_amount = 500_000_000; // 0.5 SOL
    let fund_vault_ix = system_instruction::transfer(
        &admin.pubkey(),
        &vault_pda,
        vault_funding_amount,
    );
    
    // Find admin's token account for the mint
    let admin_token_accounts = rpc.get_token_accounts_by_owner(
        &admin.pubkey(),
        TokenAccountsFilter::Mint(token_mint),
    )?;
    
    let mut instructions = vec![
        create_reserve_ix,
        init_reserve_ix,
        fund_vault_ix,
    ];
    
    let admin_token_account = if admin_token_accounts.is_empty() {
        // Create admin token account manually
        let admin_token_account = Keypair::new();
        let create_admin_ix = system_instruction::create_account(
            &admin.pubkey(),
            &admin_token_account.pubkey(),
            token_account_rent,
            TokenAccount::get_packed_len() as u64,
            &TOKEN_PROGRAM_ID,
        );
        
        let init_admin_ix = token_instruction::initialize_account(
            &TOKEN_PROGRAM_ID,
            &admin_token_account.pubkey(),
            &token_mint,
            &admin.pubkey(),
        )?;
        
        // Add these instructions to the transaction
        instructions.insert(0, create_admin_ix);
        instructions.insert(1, init_admin_ix);
        
        admin_token_account.pubkey()
    } else {
        // Use the first token account found
        Pubkey::from_str(&admin_token_accounts[0].pubkey)?
    };
    
    // Transfer tokens from admin to reserve account
    let transfer_tokens_ix = token_instruction::transfer(
        &TOKEN_PROGRAM_ID,
        &admin_token_account,
        &reserve_token_account.pubkey(),
        &admin.pubkey(),
        &[],
        total_token_supply,
    )?;
    
    instructions.push(transfer_tokens_ix);
    
    // Construct Initialize instruction
    let init_data = CasinoInstruction::Initialize { total_token_supply }
        .pack();
    
    let init_ix = solana_program::instruction::Instruction::new_with_bytes(
        program_id,
        &init_data,
        vec![
            AccountMeta::new(admin.pubkey(), true),
            AccountMeta::new(global_state_pda, false),
            AccountMeta::new_readonly(token_mint, false),
            AccountMeta::new(reserve_token_account.pubkey(), false),
            AccountMeta::new(vault_pda, false),
            AccountMeta::new_readonly(system_program::ID, false),
            AccountMeta::new_readonly(TOKEN_PROGRAM_ID, false),
        ],
    );
    
    instructions.push(init_ix);
    
    // Build and send transaction
    let mut transaction = Transaction::new_with_payer(
        &instructions,
        Some(&admin.pubkey()),
    );
    
    // Debug: Print all instruction program IDs
    for (i, ix) in instructions.iter().enumerate() {
        println!("Instruction {} program ID: {}", i, ix.program_id);
    }
    
    transaction.sign(&[&admin, &reserve_token_account], recent_blockhash);
    
    // Send and confirm transaction
    let signature = rpc.send_and_confirm_transaction(&transaction)?;
    
    println!("✅ Casino initialized successfully!");
    println!("Transaction signature: {}", signature);
    println!("Transaction explorer: https://explorer.solana.com/tx/{}?cluster=devnet", signature);
    println!("Global state PDA: {}", global_state_pda);
    println!("Reserve token account: {}", reserve_token_account.pubkey());
    println!("Vault PDA: {}", vault_pda);
    println!("Reserve authority PDA: {}", reserve_authority);
    
    // Write output to file
    let output = serde_json::json!({
        "global_state": global_state_pda.to_string(),
        "reserve_token_account": reserve_token_account.pubkey().to_string(),
        "vault": vault_pda.to_string(),
        "reserve_authority": reserve_authority.to_string(),
        "token_mint": token_mint.to_string(),
        "transaction_signature": signature.to_string(),
    });
    
    // Create target directory if it doesn't exist
    fs::create_dir_all("target")?;
    fs::write("target/init_output.json", output.to_string())?;
    println!("Output written to target/init_output.json");
    
    Ok(())
} 