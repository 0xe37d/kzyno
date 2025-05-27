import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Kzyno } from "../target/types/kzyno";
import { createUser } from "../helpers/users";
import * as Act from "../helpers/actions";
import * as As from "../helpers/asserts";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

function randInt(max: number) {
  return Math.floor(Math.random() * max);
}

describe("five-user mixed scenario", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.kzyno as Program<Kzyno>;

  let admin,
    users: anchor.web3.Keypair[] = [];
  let initialLedger = 0;

  before(async () => {
    admin = await createUser(provider);
    for (let i = 0; i < 5; ++i)
      users.push(await createUser(provider, 1_005 * LAMPORTS_PER_SOL));
    initialLedger =
      (await provider.connection.getBalance(admin.publicKey)) +
      (
        await Promise.all(
          users.map((u) => provider.connection.getBalance(u.publicKey))
        )
      ).reduce((a, b) => a + b, 0);
    await Act.init(program, admin);
  });

  it("randomises 30 steps", async () => {
    const indices = Array(5).fill(0); // each user’s next LP index

    for (let step = 0; step < 30; ++step) {
      const u = users[randInt(users.length)];

      switch (randInt(4)) {
        case 0: // deposit liquidity
          await Act.depositLiquidity({
            program,
            signer: u,
            index: indices[users.indexOf(u)]++,
            lamports: 200 * LAMPORTS_PER_SOL,
          });
          break;

        case 1: // deposit play funds
          await Act.depositFunds({
            program,
            signer: u,
            lamports: 20 * LAMPORTS_PER_SOL,
          });
          break;

        case 2: // play game (admin signed)
          try {
            await Act.playGame({
              program,
              signer: admin,
              user: u,
              lamports: 5 * LAMPORTS_PER_SOL,
              chance: 2,
              randomNumber: randInt(1000),
            });
          } catch (_) {
            /* ignore play errors */
          }
          break;

        case 3: // withdraw play funds (if any)
          try {
            await Act.withdrawFunds({
              program,
              signer: u,
              lamports: 5 * LAMPORTS_PER_SOL,
            });
          } catch (_) {
            /*ignore not-enough-fund errors*/
          }
          break;
      }
    }

    /* withdraw every remaining LP position */
    for (const u of users) {
      for (let idx = 0; idx < indices[users.indexOf(u)]; ++idx) {
        try {
          await Act.withdrawLiquidity({ program, signer: u, index: idx });
        } catch (_) {
          /* handled if already burned */
        }
      }
    }

    /* -------- global invariants -------- */
    await As.expectFullConservation(
      program,
      provider.connection,
      [admin.publicKey, ...users.map((u) => u.publicKey)],
      initialLedger,
      20
    );
  });
});
