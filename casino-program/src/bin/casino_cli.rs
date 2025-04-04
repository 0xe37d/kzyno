use clap::{Parser, Subcommand};
use std::str::FromStr;
use anyhow::Result;
use dotenv::dotenv;
use std::env;

use casino_program::casino_client::CasinoClient;

#[derive(Parser)]
#[command(name = "Casino CLI")]
#[command(about = "Interact with the on-chain casino", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Deposit SOL and receive tokens
    Deposit {
        #[arg(short, long)]
        amount: u64,
    },
    /// Burn tokens and withdraw SOL
    Withdraw {
        #[arg(short, long)]
        amount: u64,
    },
    /// Play a game round
    Play {
        #[arg(short, long)]
        bet: u64,
        #[arg(short, long)]
        multiplier: u64,
    },
    /// Show current balances
    Balance,
    /// Show casino status
    Status,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Load environment variables
    dotenv().ok();
    
    let cli = Cli::parse();
    let client = CasinoClient::new()?;

    match cli.command {
        Commands::Deposit { amount } => {
            println!("Depositing {} lamports...", amount);
            client.deposit(amount).await?;
        }
        Commands::Withdraw { amount } => {
            println!("Withdrawing {} tokens...", amount);
            client.withdraw(amount).await?;
        }
        Commands::Play { bet, multiplier } => {
            println!("Playing with bet {} and multiplier {}...", bet, multiplier);
            let result = client.play(bet, multiplier).await?;
            // The result is already printed in the play method, but we can use the result
            // for additional logic if needed
            if result.won {
                println!("Game completed successfully!");
            }
        }
        Commands::Balance => {
            println!("Fetching balances...");
            let (sol_balance, token_balance) = client.get_balance().await?;
            println!("SOL Balance: {} lamports", sol_balance);
            println!("Token Balance: {}", token_balance);
        }
        Commands::Status => {
            println!("Fetching casino status...");
            client.get_status().await?;
        }
    }

    Ok(())
} 