import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Kzyno } from "../target/types/kzyno";
import { createUser } from "../helpers/users";
import * as Act from "../helpers/actions";
import * as As from "../helpers/asserts";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("two LPs and one game loss", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.kzyno as Program<Kzyno>;

  let admin, alice, bob;
  let initialLedger = 0;

  before(async () => {
    admin = await createUser(provider);
    alice = await createUser(provider, 1_010 * LAMPORTS_PER_SOL);
    bob = await createUser(provider, 1_010 * LAMPORTS_PER_SOL);
    initialLedger =
      (await provider.connection.getBalance(admin.publicKey)) +
      (await provider.connection.getBalance(alice.publicKey)) +
      (await provider.connection.getBalance(bob.publicKey));
    await Act.init(program, admin);
  });

  it("runs the full flow", async () => {
    /* Alice first LP */
    await Act.depositLiquidity({
      program,
      signer: alice,
      index: 0,
      lamports: 1_000 * LAMPORTS_PER_SOL,
    });

    /* Alice deposits & loses */
    await Act.depositFunds({
      program,
      signer: alice,
      lamports: 2 * LAMPORTS_PER_SOL,
    });
    await Act.playGame({
      program,
      signer: admin,
      user: alice,
      lamports: 1 * LAMPORTS_PER_SOL,
      chance: 2,
      randomNumber: 5,
    });
    await Act.withdrawFunds({
      program,
      signer: alice,
      lamports: 1 * LAMPORTS_PER_SOL,
    });

    /* Bob joins as LP */
    await Act.depositLiquidity({
      program,
      signer: bob,
      index: 0,
      lamports: 1_000 * LAMPORTS_PER_SOL,
    });

    /* Alice exits liquidity */
    await Act.withdrawLiquidity({ program, signer: alice, index: 0 });

    /* -------- assertions -------- */
    // Alice should have her 1000 principal + 1 profit back (> 1009 because airdrop fee slack)
    await As.expectUserAtLeast(
      provider.connection,
      alice.publicKey,
      1_009 * LAMPORTS_PER_SOL
    );

    // Vault now only Bob's 1000 + rent reserve.
    await As.expectVaultWithinOneLamport(
      program,
      provider.connection,
      1_000 * LAMPORTS_PER_SOL
    );

    // Conservation check.
    await As.expectFullConservation(
      program,
      provider.connection,
      [admin.publicKey, alice.publicKey, bob.publicKey],
      initialLedger,
      11
    );
  });
});
