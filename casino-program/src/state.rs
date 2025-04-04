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
    pub is_initialized: bool,
}

impl GlobalState {
    pub const LEN: usize = 32 + // admin: Pubkey
        32 + // token_mint: Pubkey
        32 + // reserve_token_account: Pubkey
        32 + // vault_account: Pubkey
        8 +  // total_deposits: u64
        8 +  // circulating_tokens: u64
        8 +  // total_token_supply: u64
        1;   // is_initialized: bool
} 

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct PlayerState {
    pub owner: Pubkey,
    pub balance: u64,
    pub next_round_id: u64,
    pub vrf_account: Pubkey,
}

impl PlayerState {
    pub const LEN: usize = 32 + // owner: Pubkey
        8 +  // balance: u64
        8 +  // next_round_id: u64
        32; // vrf_account: Pubkey
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct GameRound {
    pub round_id: u64,           // incremented per player
    pub user: Pubkey,
    pub bet_amount: u64,
    pub multiplier: u64,
    pub resolved: bool,
    pub result: Option<bool>,
    pub randomness: Option<[u8; 32]>,
}

impl GameRound {
    pub const LEN: usize = 8 + // round_id: u64
        32 + // user: Pubkey
        8 +  // bet_amount: u64
        8 +  // multiplier: u64
        1 +  // resolved: bool
        1 +  // result: Option<bool>
        32; // randomness: Option<[u8; 32]>
}
