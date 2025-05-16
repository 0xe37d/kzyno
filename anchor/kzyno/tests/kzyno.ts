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
  createMint,
  mintTo,
  getAccount,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { assert } from "chai";
import fs from "fs";

const tokenSecretKeyString = fs.readFileSync(
  "../../wallets/e37NMn6EQLSnaz2NZFmBckryxzDYFGfQSqZayeTB6pm.json",
  {
    encoding: "utf8",
  }
);
const adminSecretKeyString = fs.readFileSync(
  "../../wallets/kzy2HnRf46r9zNvAuxhwoJcZrYVTQtTToZ7RNsHwsA4.json",
  {
    encoding: "utf8",
  }
);
const tokenKey = Uint8Array.from(JSON.parse(tokenSecretKeyString));
const adminKey = Uint8Array.from(JSON.parse(adminSecretKeyString));

describe("kzyno", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.kzyno as Program<Kzyno>;

  // Test accounts
  const admin = Keypair.fromSecretKey(adminKey);
  const user = Keypair.generate();
  const tokenMint = Keypair.fromSecretKey(tokenKey);
  const totalTokenSupply = new anchor.BN(10 * LAMPORTS_PER_SOL); // 10 tokens

  let globalStatePda: PublicKey;
  let reserveAuthorityPda: PublicKey;
  let vaultAccountPda: PublicKey;
  let userBalancePda: PublicKey;
  let reserveTokenVaultPda: PublicKey;
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
      await provider.connection.getMinimumBalanceForRentExemption(0)
    );
    await provider.connection.confirmTransaction(userAirdrop);

    [userBalancePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_balance"), user.publicKey.toBuffer()],
      program.programId
    );

    [reserveTokenVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("reserve_token_vault")],
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
  });

  it("Initializes the program", async () => {
    const tx = await program.methods
      .initialize()
      .accounts({
        admin: admin.publicKey,
        // @ts-expect-error: anchor types are dumb sometimes
        reserveTokenVault: reserveTokenVaultPda,
        reserveAuthority: reserveAuthorityPda,
        tokenMint: tokenMint.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        globalState: globalStatePda,
      })
      .signers([admin])
      .rpc();

    // Mint initial tokens to reserve account
    await mintTo(
      provider.connection,
      admin,
      tokenMint.publicKey,
      reserveTokenVaultPda,
      admin,
      totalTokenSupply.toNumber()
    );

    // Fetch the global state account
    const globalState = await program.account.globalState.fetch(globalStatePda);

    // Verify initialization
    assert.ok(globalState.admin.equals(admin.publicKey));
    assert.ok(globalState.tokenMint.equals(tokenMint.publicKey));
    assert.ok(globalState.circulatingTokens.eq(new anchor.BN(0)));
  });

  it("Deposits liquidity", async () => {
    // Get users token account address
    const userTokenAccountAddress = await getAssociatedTokenAddress(
      tokenMint.publicKey,
      user.publicKey
    );

    const tx = await program.methods
      .depositLiquidity(new anchor.BN(LAMPORTS_PER_SOL))
      .accounts({
        signer: user.publicKey,
        // @ts-expect-error: anchor types are dumb sometimes
        vaultAccount: vaultAccountPda,
        globalState: globalStatePda,
        tokenMint: tokenMint.publicKey,
        reserveTokenVault: reserveTokenVaultPda,
        reserveAuthority: reserveAuthorityPda,
        userTokenAccount: userTokenAccountAddress,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    // Fetch the global state account
    const globalState = await program.account.globalState.fetch(globalStatePda);
    // Fetch users token account info again
    const userTokenAccountInfo = await getAccount(
      provider.connection,
      userTokenAccountAddress
    );
    // Fetch users balance
    const usersNewBalance = await provider.connection.getBalance(
      user.publicKey
    );
    // Fetch token reserve balance
    const tokenReserveAccount = await getAccount(
      provider.connection,
      reserveTokenVaultPda
    );

    // Verify the deposit
    assert.ok(
      globalState.circulatingTokens.eq(new anchor.BN(LAMPORTS_PER_SOL))
    );
    assert.ok(userTokenAccountInfo.amount == BigInt(LAMPORTS_PER_SOL));
    assert.ok(
      tokenReserveAccount.amount ==
        BigInt(totalTokenSupply.toNumber() - LAMPORTS_PER_SOL)
    );
    assert.ok(usersNewBalance <= 9 * LAMPORTS_PER_SOL);
  });

  it("Deposits funds", async () => {
    const tx = await program.methods
      .depositFunds(new anchor.BN(LAMPORTS_PER_SOL))
      .accounts({
        signer: user.publicKey,
        // @ts-expect-error: anchor types are dumb sometimes
        userBalance: userBalancePda,
        vaultAccount: vaultAccountPda,
        globalState: globalStatePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    // Fetch the user balance account
    const userBalance = await program.account.userBalance.fetch(userBalancePda);
    // Fetch users balance
    const usersNewBalance = await provider.connection.getBalance(
      user.publicKey
    );

    // Verify the deposit
    assert.ok(userBalance.balance.eq(new anchor.BN(LAMPORTS_PER_SOL)));
    assert.ok(usersNewBalance <= 8 * LAMPORTS_PER_SOL);
  });

  it("Plays the game", async () => {
    const tx = await program.methods
      .playGame(
        new anchor.BN(2), // chance
        new anchor.BN(5), // random number
        new anchor.BN(LAMPORTS_PER_SOL / 2) // wager
      )
      .accounts({
        signer: admin.publicKey,
        // @ts-expect-error: anchor types are dumb sometimes
        userBalance: userBalancePda,
        globalState: globalStatePda,
        vaultAccount: vaultAccountPda,
        user: user.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    // Fetch the user balance account
    const userBalance = await program.account.userBalance.fetch(userBalancePda);
    const globalState = await program.account.globalState.fetch(globalStatePda);

    // Verify the losses
    assert.ok(userBalance.balance.eq(new anchor.BN(LAMPORTS_PER_SOL / 2)));
    assert.ok(globalState.userFunds.eq(new anchor.BN(LAMPORTS_PER_SOL / 2)));
  });

  it("Does not let non-admin play game", async () => {
    try {
      const tx = await program.methods
        .playGame(
          new anchor.BN(2), // chance
          new anchor.BN(123456), // random number
          new anchor.BN(10) // wager
        )
        .accounts({
          signer: user.publicKey,
          // @ts-expect-error: anchor types are dumb sometimes
          userBalance: userBalancePda,
          globalState: globalStatePda,
          user: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      assert.ok(false);
    } catch (_err) {
      assert.isTrue(_err instanceof anchor.AnchorError);
      const err: anchor.AnchorError = _err;

      assert.strictEqual(err.error.errorCode.code, "Unauthorized");
    }
  });

  it("Does not allow wager > user balance", async () => {
    try {
      const tx = await program.methods
        .playGame(
          new anchor.BN(2), // chance
          new anchor.BN(123456), // random number
          new anchor.BN(LAMPORTS_PER_SOL) // wager
        )
        .accounts({
          signer: admin.publicKey,
          // @ts-expect-error: anchor types are dumb sometimes
          userBalance: userBalancePda,
          globalState: globalStatePda,
          user: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
      assert.ok(false);
    } catch (_err) {
      assert.isTrue(_err instanceof anchor.AnchorError);
      const err: anchor.AnchorError = _err;

      assert.strictEqual(err.error.errorCode.code, "NotEnoughFundsToPlay");
    }
  });

  it("Does not allow out of bounds chances", async () => {
    try {
      const tx = await program.methods
        .playGame(
          new anchor.BN(1), // chance
          new anchor.BN(123456), // random number
          new anchor.BN(10) // wager
        )
        .accounts({
          signer: admin.publicKey,
          // @ts-expect-error: anchor types are dumb sometimes
          userBalance: userBalancePda,
          globalState: globalStatePda,
          user: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
      assert.ok(false);
    } catch (_err) {
      assert.isTrue(_err instanceof anchor.AnchorError);
      const err: anchor.AnchorError = _err;

      assert.strictEqual(err.error.errorCode.code, "InvalidChance");
    }
  });

  it("Can not withdraw more funds than in balance", async () => {
    try {
      const tx = await program.methods
        .withdrawFunds(new anchor.BN(LAMPORTS_PER_SOL))
        .accounts({
          user: user.publicKey,
          // @ts-expect-error: anchor types are dumb sometimes
          userBalance: userBalancePda,
          vaultAccount: vaultAccountPda,
          globalState: globalStatePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      assert.ok(false);
    } catch (_err) {
      assert.isTrue(_err instanceof anchor.AnchorError);
      const err: anchor.AnchorError = _err;

      assert.strictEqual(err.error.errorCode.code, "NotEnoughFunds");
    }
  });

  it("Can not withdraw someone elses funds", async () => {
    try {
      const tx = await program.methods
        .withdrawFunds(new anchor.BN(30))
        .accounts({
          user: admin.publicKey,
          // @ts-expect-error: anchor types are dumb sometimes
          userBalance: userBalancePda,
          vaultAccount: vaultAccountPda,
          globalState: globalStatePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
      assert.ok(false);
    } catch (_err) {
      assert.isTrue(_err instanceof anchor.AnchorError);
      const err: anchor.AnchorError = _err;

      assert.strictEqual(err.error.errorCode.code, "ConstraintSeeds");
    }
  });

  it("Can withdraw funds", async () => {
    const tx = await program.methods
      .withdrawFunds(new anchor.BN(LAMPORTS_PER_SOL / 4))
      .accounts({
        user: user.publicKey,
        // @ts-expect-error: anchor types are dumb sometimes
        userBalance: userBalancePda,
        vaultAccount: vaultAccountPda,
        globalState: globalStatePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();
    const userBalanceAfter = await provider.connection.getBalance(
      user.publicKey
    );
    // At this point the user has deposited 1 sol for liquidity and 1 sol for play funds
    // then they lost 0.5 sol playing, withdrawing 1/4 should leave them with ~8.25 sol
    assert.ok(userBalanceAfter > 8 * LAMPORTS_PER_SOL);
    // Fetch the global state account, make sure we subtracted from the user funds state
    const globalState = await program.account.globalState.fetch(globalStatePda);
    assert.strictEqual(globalState.userFunds.toNumber(), LAMPORTS_PER_SOL / 4);
  });

  it("Can withdraw liquidity", async () => {
    // A second user makes a deposit, first user is now only entitled to some part of the vault
    const secondUser = Keypair.generate();
    const secondUserAirdrop = await provider.connection.requestAirdrop(
      secondUser.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(secondUserAirdrop);
    const secondUserTokenAccountAddress = getAssociatedTokenAddress(
      tokenMint.publicKey,
      secondUser.publicKey
    );

    await program.methods
      .depositLiquidity(new anchor.BN(LAMPORTS_PER_SOL))
      .accounts({
        signer: secondUser.publicKey,
        // @ts-expect-error: anchor types are dumb sometimes
        vaultAccount: vaultAccountPda,
        globalState: globalStatePda,
        tokenMint: tokenMint.publicKey,
        reserveTokenVault: reserveTokenVaultPda,
        reserveAuthority: reserveAuthorityPda,
        userTokenAccount: secondUserTokenAccountAddress,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([secondUser])
      .rpc();
    const amountInVault = await provider.connection.getBalance(vaultAccountPda);

    // Then the user withdraws their claim
    const userTokenAccountAddress = getAssociatedTokenAddress(
      tokenMint.publicKey,
      user.publicKey
    );
    const tx = await program.methods
      .withdrawLiquidity(new anchor.BN(LAMPORTS_PER_SOL))
      .accounts({
        signer: user.publicKey,
        // @ts-expect-error: anchor types are dumb sometimes
        vaultAccount: vaultAccountPda,
        globalState: globalStatePda,
        tokenMint: tokenMint.publicKey,
        reserveTokenVault: reserveTokenVaultPda,
        reserveAuthority: reserveAuthorityPda,
        userTokenAccount: userTokenAccountAddress,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    const amountInVaultAfter = await provider.connection.getBalance(
      vaultAccountPda
    );

    const userBalanceAfter = await provider.connection.getBalance(
      user.publicKey
    );

    // Before withdrawal the vault should have 2 sol from liquidity, 0.5 sol from the users loss,
    // and 0.25 sol non-withdrawn users funds. There are 2 circulating tokens, so the user would be
    // entitled to 2.5 / 2 = 1.25 sol.
    assert.ok(userBalanceAfter > 9 * LAMPORTS_PER_SOL);
    // There is an initial deposit to make the vault rent exempt so it will be slightly
    // more than 1.5 left
    assert.ok(
      1.5 * LAMPORTS_PER_SOL < amountInVaultAfter &&
        amountInVaultAfter < 1.6 * LAMPORTS_PER_SOL
    );
  });
});
