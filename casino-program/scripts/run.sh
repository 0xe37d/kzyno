#!/bin/bash

# Set the directory to the script's location
cd "$(dirname "$0")"

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI is not installed. Please install it first."
    exit 1
fi

# Check wallet balance on devnet
echo "🔍 Checking wallet balance on devnet..."
solana balance --url devnet

# Run the initialize script
echo "🚀 Initializing casino program..."
cargo run --bin initialize

# Check if initialization was successful
if [ $? -eq 0 ]; then
    echo "✅ Casino program initialized successfully!"
    echo "📋 Check target/init_output.json for account addresses"
else
    echo "❌ Failed to initialize casino program"
    exit 1
fi 