use solana_program::{
    instruction::{AccountMeta, Instruction},
    program_error::ProgramError,
    pubkey::Pubkey,
};

#[derive(Debug)]
pub enum CasinoInstruction {
    /// Initialize the casino program
    /// 
    /// Accounts expected by this instruction:
    /// 0. `[signer]` Admin account
    /// 1. `[writable]` Global state account
    /// 2. `[]` Token mint account
    /// 3. `[writable]` Reserve token account
    /// 4. `[writable]` Vault account
    /// 5. `[]` System program
    /// 6. `[]` Token program
    Initialize {
        total_token_supply: u64,
    },

    /// Deposit funds and receive casino tokens
    /// 
    /// Accounts expected by this instruction:
    /// 0. `[signer]` User account
    /// 1. `[writable]` User token account
    /// 2. `[writable]` Reserve token account
    /// 3. `[writable]` Vault account
    /// 4. `[writable]` Global state account
    /// 5. `[]` Token program
    /// 6. `[]` System program
    /// 7. `[]` Reserve authority PDA
    /// 8. `[]` Token mint account
    Deposit {
        amount: u64,
    },

    /// Burn tokens and withdraw funds
    /// 
    /// Accounts expected by this instruction:
    /// 0. `[signer]` User account
    /// 1. `[writable]` User token account
    /// 2. `[writable]` Token mint account
    /// 3. `[writable]` Vault account
    /// 4. `[writable]` Global state account
    /// 5. `[]` Token program
    /// 6. `[]` System program
    BurnAndWithdraw {
        amount: u64,
    },

    /// Play a game round
    /// 
    /// Accounts expected by this instruction:
    /// 0. `[signer]` User account
    /// 1. `[writable]` Vault account
    /// 2. `[writable]` Global state account
    /// 3. `[]` System program
    PlayGame {
        bet_amount: u64,
        multiplier: u64,
        rng_seed: u64,
    },
}

impl CasinoInstruction {
    pub fn pack(&self) -> Vec<u8> {
        let mut buf = Vec::with_capacity(25); // 1 byte for variant + 8 bytes for each u64
        match self {
            CasinoInstruction::Initialize { total_token_supply } => {
                buf.push(0);
                buf.extend_from_slice(&total_token_supply.to_le_bytes());
            }
            CasinoInstruction::Deposit { amount } => {
                buf.push(1);
                buf.extend_from_slice(&amount.to_le_bytes());
            }
            CasinoInstruction::BurnAndWithdraw { amount } => {
                buf.push(2);
                buf.extend_from_slice(&amount.to_le_bytes());
            }
            CasinoInstruction::PlayGame { bet_amount, multiplier, rng_seed } => {
                buf.push(3);
                buf.extend_from_slice(&bet_amount.to_le_bytes());
                buf.extend_from_slice(&multiplier.to_le_bytes());
                buf.extend_from_slice(&rng_seed.to_le_bytes());
            }
        }
        buf
    }

    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        let (&variant, rest) = input.split_first().ok_or(ProgramError::InvalidInstructionData)?;
        match variant {
            0 => {
                let total_token_supply = rest.get(..8).ok_or(ProgramError::InvalidInstructionData)?;
                let total_token_supply = u64::from_le_bytes(total_token_supply.try_into().unwrap());
                Ok(CasinoInstruction::Initialize { total_token_supply })
            }
            1 => {
                let amount = rest.get(..8).ok_or(ProgramError::InvalidInstructionData)?;
                let amount = u64::from_le_bytes(amount.try_into().unwrap());
                Ok(CasinoInstruction::Deposit { amount })
            }
            2 => {
                let amount = rest.get(..8).ok_or(ProgramError::InvalidInstructionData)?;
                let amount = u64::from_le_bytes(amount.try_into().unwrap());
                Ok(CasinoInstruction::BurnAndWithdraw { amount })
            }
            3 => {
                let bet_amount = rest.get(..8).ok_or(ProgramError::InvalidInstructionData)?;
                let bet_amount = u64::from_le_bytes(bet_amount.try_into().unwrap());
                let multiplier = rest.get(8..16).ok_or(ProgramError::InvalidInstructionData)?;
                let multiplier = u64::from_le_bytes(multiplier.try_into().unwrap());
                let rng_seed = rest.get(16..24).ok_or(ProgramError::InvalidInstructionData)?;
                let rng_seed = u64::from_le_bytes(rng_seed.try_into().unwrap());
                Ok(CasinoInstruction::PlayGame { bet_amount, multiplier, rng_seed })
            }
            _ => Err(ProgramError::InvalidInstructionData),
        }
    }
}

pub fn initialize(
    program_id: &Pubkey,
    admin: &Pubkey,
    global_state: &Pubkey,
    token_mint: &Pubkey,
    reserve_token_account: &Pubkey,
    vault_account: &Pubkey,
    total_token_supply: u64,
) -> Instruction {
    let accounts = vec![
        AccountMeta::new(*admin, true),
        AccountMeta::new(*global_state, false),
        AccountMeta::new_readonly(*token_mint, false),
        AccountMeta::new(*reserve_token_account, false),
        AccountMeta::new(*vault_account, false),
    ];

    let instruction = CasinoInstruction::Initialize { total_token_supply };
    Instruction {
        program_id: *program_id,
        accounts,
        data: instruction.pack(),
    }
}

pub fn deposit(
    program_id: &Pubkey,
    user: &Pubkey,
    user_token_account: &Pubkey,
    reserve_token_account: &Pubkey,
    vault_account: &Pubkey,
    global_state: &Pubkey,
    token_program: &Pubkey,
    amount: u64,
) -> Instruction {
    let accounts = vec![
        AccountMeta::new(*user, true),
        AccountMeta::new(*user_token_account, false),
        AccountMeta::new(*reserve_token_account, false),
        AccountMeta::new(*vault_account, false),
        AccountMeta::new(*global_state, false),
        AccountMeta::new_readonly(*token_program, false),
    ];

    let instruction = CasinoInstruction::Deposit { amount };
    Instruction {
        program_id: *program_id,
        accounts,
        data: instruction.pack(),
    }
}

pub fn burn_and_withdraw(
    program_id: &Pubkey,
    user: &Pubkey,
    user_token_account: &Pubkey,
    token_mint: &Pubkey,
    vault_account: &Pubkey,
    global_state: &Pubkey,
    token_program: &Pubkey,
    amount: u64,
) -> Instruction {
    let accounts = vec![
        AccountMeta::new(*user, true),
        AccountMeta::new(*user_token_account, false),
        AccountMeta::new(*token_mint, false),
        AccountMeta::new(*vault_account, false),
        AccountMeta::new(*global_state, false),
        AccountMeta::new_readonly(*token_program, false),
    ];

    let instruction = CasinoInstruction::BurnAndWithdraw { amount };
    Instruction {
        program_id: *program_id,
        accounts,
        data: instruction.pack(),
    }
}

pub fn play_game(
    program_id: &Pubkey,
    user: &Pubkey,
    vault_account: &Pubkey,
    global_state: &Pubkey,
    bet_amount: u64,
    multiplier: u64,
    rng_seed: u64,
) -> Instruction {
    let accounts = vec![
        AccountMeta::new(*user, true),
        AccountMeta::new(*vault_account, false),
        AccountMeta::new(*global_state, false),
    ];

    let instruction = CasinoInstruction::PlayGame { bet_amount, multiplier, rng_seed };
    Instruction {
        program_id: *program_id,
        accounts,
        data: instruction.pack(),
    }
} 