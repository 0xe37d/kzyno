import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Kzyno } from "../target/types/kzyno";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createUser } from "../helpers/users";
import * as PDA from "../helpers/pda";
import * as Act from "../helpers/actions";
import { assert } from "chai";

describe("LP profit-share flow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.kzyno as Program<Kzyno>;

  let admin: Keypair, alice: Keypair, bob: Keypair, player: Keypair;

  before(async () => {
    admin = await createUser(provider); // house signer
    alice = await createUser(provider, 1_100 * LAMPORTS_PER_SOL); // first LP
    bob = await createUser(provider, 1_100 * LAMPORTS_PER_SOL); // second LP
    player = await createUser(provider, 200 * LAMPORTS_PER_SOL); // gambler

    await Act.init(program, admin);
  });

  it("runs deposit / play / withdraw sequence", async () => {
    /* -------------------------------------------------------------------
       1)  Alice deposits 1 000 SOL liquidity
    ------------------------------------------------------------------- */
    await Act.depositLiquidity({
      program,
      signer: alice,
      index: 0,
      lamports: 1_000 * LAMPORTS_PER_SOL,
    });

    /* -------------------------------------------------------------------
       2)  Player deposits 50 SOL play-funds, then loses 10 SOL
    ------------------------------------------------------------------- */
    await Act.depositFunds({
      program,
      signer: player,
      lamports: 50 * LAMPORTS_PER_SOL,
    });

    await Act.playGame({
      program,
      signer: admin,
      user: player,
      lamports: 10 * LAMPORTS_PER_SOL, // wager lost
      chance: 2,
      randomNumber: 5,
    });

    /*  profit so far  = 10 SOL
        totalShares    = 1 000
    */

    /* -------------------------------------------------------------------
       3)  Bob deposits 1 000 SOL liquidity
    ------------------------------------------------------------------- */
    await Act.depositLiquidity({
      program,
      signer: bob,
      index: 0,
      lamports: 1_000 * LAMPORTS_PER_SOL,
    });

    /* -------------------------------------------------------------------
       4)  Player loses another 20 SOL
    ------------------------------------------------------------------- */
    await Act.playGame({
      program,
      signer: admin,
      user: player,
      lamports: 20 * LAMPORTS_PER_SOL,
      chance: 2,
      randomNumber: 9,
    });

    /* profit while Bob staked = 20 SOL
       Alice share = 1 000 / 2 000 = 0.5  → 10 SOL
       Bob   share = 0.5                 → 10 SOL
    */

    /* -------------------------------------------------------------------
       5)  Bob withdraws his liquidity
    ------------------------------------------------------------------- */

    const bobLiqPda = PDA.userLiquidity(program.programId, bob.publicKey, 0);
    const liqBefore = await program.account.userLiquidity.fetch(bobLiqPda);

    await Act.withdrawLiquidity({ program, signer: bob, index: 0 });

    const gsBefore = await program.account.globalState.fetch(
      PDA.globalState(program.programId)
    );

    const expectedBobPayout = 10 * LAMPORTS_PER_SOL;

    const bobAfter = await provider.connection.getBalance(bob.publicKey);
    const bobGain = bobAfter - 1_100 * LAMPORTS_PER_SOL; // initial SOL

    assert.ok(
      Math.abs(bobGain - expectedBobPayout) <= 20_000, // within 0.00002 SOL fees
      `Bob gain ${bobGain} ≠ expected ${expectedBobPayout}`
    );

    /* -------------------------------------------------------------------
       6)  Player loses another 10 SOL
    ------------------------------------------------------------------- */
    await Act.playGame({
      program,
      signer: admin,
      user: player,
      lamports: 10 * LAMPORTS_PER_SOL,
      chance: 2,
      randomNumber: 11,
    });

    /* -------------------------------------------------------------------
       7)  Alice withdraws her liquidity
    ------------------------------------------------------------------- */
    await Act.withdrawLiquidity({ program, signer: alice, index: 0 });

    const gs = await program.account.globalState.fetch(
      PDA.globalState(program.programId)
    );

    const expectedAlice = 30 * LAMPORTS_PER_SOL;

    const aliceAfter = await provider.connection.getBalance(alice.publicKey);
    const aliceGain = aliceAfter - 1_100 * LAMPORTS_PER_SOL;

    assert.ok(
      Math.abs(aliceGain - expectedAlice) <= 30_000,
      `Alice gain ${aliceGain} ≠ expected ${expectedAlice}`
    );

    /* -------------------------------------------------------------------
       8)  Sanity: vault now holds only rent + unclaimed profits
    ------------------------------------------------------------------- */
    const vaultLamports = await provider.connection.getBalance(
      PDA.vault(program.programId)
    );

    assert.ok(
      vaultLamports <= 10 * LAMPORTS_PER_SOL + 2, // 1-lamport dust tolerance
      "Vault holds unexpected lamports"
    );
  });
});
