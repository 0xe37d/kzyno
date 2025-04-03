use solana_program::{
    account_info::AccountInfo,
    program_error::ProgramError,
    pubkey::Pubkey,
};
use borsh::{BorshSerialize, BorshDeserialize};

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct GlobalState {
    pub admin: Pubkey,
    pub token_mint: Pubkey,
    pub reserve_token_account: Pubkey,
    pub vault_account: Pubkey,
    pub total_deposits: u64,
    pub circulating_tokens: u64,
    pub total_token_supply: u64,
}

impl GlobalState {
    pub const LEN: usize = 32 + // admin: Pubkey
        32 + // token_mint: Pubkey
        32 + // reserve_token_account: Pubkey
        32 + // vault_account: Pubkey
        8 +  // total_deposits: u64
        8 +  // circulating_tokens: u64
        8;   // total_token_supply: u64
} 