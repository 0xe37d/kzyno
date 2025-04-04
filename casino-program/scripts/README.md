# Casino Program Initialization Scripts

This directory contains scripts for initializing the casino program on Solana devnet.

## Prerequisites

1. Solana CLI tools installed
2. A funded devnet wallet (admin)
3. Rust and Cargo installed

## Setup

1. Make sure you have a Solana keypair at `~/.config/solana/id.json`
2. Ensure your wallet has enough SOL on devnet (at least 2 SOL)

## Available Scripts

### 1. Create Token Mint

This script creates a new token mint on devnet that will be used by the casino program.

```bash
cd casino-program/scripts
cargo run --bin create_token_mint
```

The script will output the token mint address. Save this address for the next step.

### 2. Initialize Casino Program

This script initializes the casino program on devnet.

```bash
cd casino-program/scripts
# Edit initialize.rs and replace <your_token_mint> with your actual token mint address
cargo run --bin initialize
```

## What the Initialization Script Does

1. Connects to Solana devnet
2. Loads your admin keypair
3. Creates a global state account
4. Derives PDAs for vault and reserve authority
5. Creates a reserve token account
6. Funds the vault PDA with SOL
7. Mints tokens to the reserve account
8. Sends the Initialize instruction to the program

## Output

The initialization script will output:
- Transaction signature
- Global state account address
- Reserve token account address
- Vault PDA address
- Reserve authority PDA address

Save these addresses for future reference.

## Troubleshooting

If you encounter errors:

1. Make sure your wallet has enough SOL on devnet
2. Check that the token mint address is correct in the initialize.rs script
3. Ensure the program ID is correct in the initialize.rs script 