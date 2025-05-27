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

  let globalStatePda: PublicKey;
  let reserveAuthorityPda: PublicKey;
  let vaultAccountPda: PublicKey;
  let userBalancePda: PublicKey;
  let reserveTokenVaultPda: PublicKey;
  let userLiquidityPda: PublicKey;
  before(async () => {
    // Airdrop SOL to admin and user
    const adminAirdrop = await provider.connection.requestAirdrop(
      admin.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(adminAirdrop);

    const userAirdrop = await provider.connection.requestAirdrop(
      user.publicKey,
      1010 * LAMPORTS_PER_SOL
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

    const index = 0;
    const indexBuf = new anchor.BN(index).toArrayLike(Buffer, "le", 8); // 8-byte LE
    [userLiquidityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_liquidity"), user.publicKey.toBuffer(), indexBuf],
      program.programId
    );

    const vaultAirdrop = await provider.connection.requestAirdrop(
      vaultAccountPda,
      0.01 * LAMPORTS_PER_SOL // send some SOL to the vault for rent exemption / initial liquidity
    );
    await provider.connection.confirmTransaction(vaultAirdrop);

    [userBalancePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_balance"), user.publicKey.toBuffer()],
      program.programId
    );

    [reserveTokenVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("reserve_token_vault")],
      program.programId
    );
  });

  it("Initializes the program", async () => {
    const tx = await program.methods
      .initialize()
      .accounts({
        admin: admin.publicKey,
        // @ts-expect-error: anchor types are dumb sometimes
        systemProgram: SystemProgram.programId,
        globalState: globalStatePda,
      })
      .signers([admin])
      .rpc();

    // Fetch the global state account
    const globalState = await program.account.globalState.fetch(globalStatePda);

    // Verify initialization
    assert.ok(globalState.admin.equals(admin.publicKey));
  });

  it("Deposits liquidity", async () => {
    const tx = await program.methods
      .depositLiquidity(
        new anchor.BN(0), // index of the position account
        new anchor.BN(1000 * LAMPORTS_PER_SOL)
      )
      .accounts({
        signer: user.publicKey,
        // @ts-expect-error: anchor types are dumb sometimes
        vaultAccount: vaultAccountPda,
        globalState: globalStatePda,
        userLiquidity: userLiquidityPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    // Fetch the global state account
    const globalState = await program.account.globalState.fetch(globalStatePda);
    assert.strictEqual(
      globalState.deposits.toNumber(),
      1000 * LAMPORTS_PER_SOL
    );
    assert.strictEqual(
      globalState.lastBankroll.toNumber(),
      1000 * LAMPORTS_PER_SOL + 0.01 * LAMPORTS_PER_SOL // initial rent exemption aridrop
    );
    // Fetch the users liquidity account
    const userLiquidity = await program.account.userLiquidity.fetch(
      userLiquidityPda
    );
    assert.strictEqual(
      userLiquidity.shares.toNumber(),
      1000 * LAMPORTS_PER_SOL // 1 : 1 since first LP
    );
    assert.strictEqual(
      userLiquidity.profitEntry.toNumber(),
      0 // 0 profit entry since first LP
    );
  });

  it("Deposits funds", async () => {
    const tx = await program.methods
      .depositFunds(new anchor.BN(2 * LAMPORTS_PER_SOL))
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
    assert.ok(userBalance.balance.eq(new anchor.BN(2 * LAMPORTS_PER_SOL)));
    assert.ok(usersNewBalance <= 8 * LAMPORTS_PER_SOL);
  });

  it("Plays the game", async () => {
    const tx = await program.methods
      .playGame(
        new anchor.BN(2), // chance
        new anchor.BN(5), // random number
        new anchor.BN(LAMPORTS_PER_SOL) // wager
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
    assert.ok(userBalance.balance.eq(new anchor.BN(LAMPORTS_PER_SOL)));
    assert.ok(globalState.userFunds.eq(new anchor.BN(LAMPORTS_PER_SOL)));
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
          new anchor.BN(2 * LAMPORTS_PER_SOL) // wager
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
        .withdrawFunds(new anchor.BN(2 * LAMPORTS_PER_SOL))
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
    const userBalanceAfter = await provider.connection.getBalance(
      user.publicKey
    );
    // At this point the user has deposited 1000 sol for liquidity and 2 sol for play funds
    // then they lost 1 sol playing, withdrawing that should leave them with ~1009 sol
    assert.ok(userBalanceAfter > 8 * LAMPORTS_PER_SOL);
    // Fetch the global state account, make sure we subtracted from the user funds state
    const globalState = await program.account.globalState.fetch(globalStatePda);
    assert.strictEqual(globalState.userFunds.toNumber(), 0);
  });

  it("Can withdraw liquidity", async () => {
    /****************************************************************
     * 0. helper for the 8-byte little-endian index buffer
     ****************************************************************/
    const leU64 = (n: number | anchor.BN) =>
      new anchor.BN(n).toArrayLike(Buffer, "le", 8);

    /****************************************************************
     * 1.  create a second user and make her first LP deposit
     ****************************************************************/
    const secondUser = Keypair.generate();
    const airdrop = await provider.connection.requestAirdrop(
      secondUser.publicKey,
      1_010 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdrop);

    // the second user’s very first Position — index = 0
    const [secondUserLiquidityPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_liquidity"),
        secondUser.publicKey.toBuffer(),
        leU64(0),
      ],
      program.programId
    );

    await program.methods
      .depositLiquidity(
        new anchor.BN(0), // index
        new anchor.BN(1_000 * LAMPORTS_PER_SOL)
      )
      .accounts({
        signer: secondUser.publicKey,
        // @ts-expect-error: anchor types are dumb sometimes
        vaultAccount: vaultAccountPda,
        globalState: globalStatePda,
        userLiquidity: secondUserLiquidityPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([secondUser])
      .rpc();

    /****************************************************************
     * 2.  first user withdraws his position #0
     ****************************************************************/
    const [userLiquidityPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_liquidity"),
        user.publicKey.toBuffer(),
        leU64(0), // first user’s index == 0
      ],
      program.programId
    );

    await program.methods
      .withdrawLiquidity(new anchor.BN(0)) // index of the position to burn
      .accounts({
        signer: user.publicKey,
        // @ts-expect-error: anchor types are dumb sometimes
        vaultAccount: vaultAccountPda,
        globalState: globalStatePda,
        userLiquidity: userLiquidityPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    /****************************************************************
     * 3.  assertions
     ****************************************************************/
    const vaultAfterWithdraw = await provider.connection.getBalance(
      vaultAccountPda
    );
    const userAfterBalance = await provider.connection.getBalance(
      user.publicKey
    );

    // user should have withdrawn ~1001 SOL, 1000 from principal (liquidity), then 1 SOL of his entitled profits (which he lost)
    assert.ok(userAfterBalance > 1009.99 * LAMPORTS_PER_SOL);

    // vault should now hold roughly the 1 000 SOL from secondUser
    // plus rent-exempt buffer (~0.003 SOL)
    assert.ok(
      1_000 * LAMPORTS_PER_SOL < vaultAfterWithdraw &&
        vaultAfterWithdraw < 1_001 * LAMPORTS_PER_SOL
    );
  });
});
