import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Kzyno } from "../target/types/kzyno";
import {
  PublicKey,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAssociatedTokenAddress,
  createAssociatedTokenAccount,
} from "@solana/spl-token";
import { assert } from "chai";
import { getAccount } from "@solana/spl-token";

describe("kzyno", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.kzyno as Program<Kzyno>;

  // Test accounts
  const admin = Keypair.generate();
  const user = Keypair.generate();
  const tokenMint = Keypair.fromSeed(
    Buffer.from("tttttttttttttttttttttttttttttttt")
  );
  const totalTokenSupply = new anchor.BN(1000000000); // 1 billion tokens

  let globalStatePda: PublicKey;
  let reserveAuthorityPda: PublicKey;
  let vaultAccountPda: PublicKey;
  let userBalancePda: PublicKey;
  let reserveTokenVaultPda: PublicKey;
  let userTokenAccount: PublicKey;
  before(async () => {
    // Airdrop SOL to admin and user
    const adminAirdrop = await provider.connection.requestAirdrop(
      admin.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(adminAirdrop);

    const userAirdrop = await provider.connection.requestAirdrop(
      user.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(userAirdrop);

    // Find PDAs
    [globalStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("global_state")],
      program.programId
    );

    [reserveAuthorityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("reserve_authority")],
      program.programId
    );

    [vaultAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      program.programId
    );

    const vaultAirdrop = await provider.connection.requestAirdrop(
      vaultAccountPda,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(userAirdrop);

    [userBalancePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_balance"), user.publicKey.toBuffer()],
      program.programId
    );

    // Create token mint
    await createMint(
      provider.connection,
      admin,
      admin.publicKey,
      null,
      9,
      tokenMint
    );

    // Create user's token account
    const userTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      user,
      tokenMint.publicKey,
      user.publicKey
    );
    userTokenAccount = userTokenAccountInfo.address;
  });

  // How do you retest initialize?
  it("Initializes the program", async () => {
    const tx = await program.methods
      .initialize(totalTokenSupply)
      .accounts({
        admin: admin.publicKey,
        reserveTokenVault: reserveTokenVaultPda,
        reserveAuthority: reserveAuthorityPda,
        tokenMint: tokenMint.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        globalState: globalStatePda,
      })
      .signers([admin])
      .rpc();

    // Fetch the global state account
    const globalState = await program.account.globalState.fetch(globalStatePda);

    // Verify initialization
    assert.ok(globalState.admin.equals(admin.publicKey));
    assert.ok(globalState.tokenMint.equals(tokenMint.publicKey));
    assert.ok(globalState.totalDeposits.eq(new anchor.BN(0)));
    assert.ok(globalState.circulatingTokens.eq(new anchor.BN(0)));
    assert.ok(globalState.totalTokenSupply.eq(totalTokenSupply));
  });

  it("Deposits liquidity", async () => {
    const [reserveTokenVaultPda, reserveTokenVaultBump] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("reserve_token_vault")],
        program.programId
      );

    // Mint initial tokens to reserve account
    await mintTo(
      provider.connection,
      admin,
      tokenMint.publicKey,
      reserveTokenVaultPda,
      admin,
      totalTokenSupply.toNumber()
    );
    const tx = await program.methods
      .depositLiquidity(new anchor.BN(10))
      .accounts({
        signer: user.publicKey,
        vaultAccount: vaultAccountPda,
        globalState: globalStatePda,
        tokenMint: tokenMint.publicKey,
        reserveTokenVault: reserveTokenVaultPda,
        reserveAuthority: reserveAuthorityPda,
        userTokenAccount: userTokenAccount,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    // Fetch the global state account
    const globalState = await program.account.globalState.fetch(globalStatePda);

    // Verify the deposit
    assert.ok(globalState.totalDeposits.eq(new anchor.BN(10)));
    assert.ok(globalState.circulatingTokens.eq(new anchor.BN(10)));
  });

  it("Deposits funds", async () => {
    const tx = await program.methods
      .depositFunds(new anchor.BN(10))
      .accounts({
        signer: user.publicKey,
        userBalance: userBalancePda,
        vaultAccount: vaultAccountPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    // Fetch the global state account
    const userBalance = await program.account.userBalance.fetch(userBalancePda);

    // Verify the deposit
    assert.ok(userBalance.balance.eq(new anchor.BN(10)));
  });
});
