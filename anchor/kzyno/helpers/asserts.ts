import { assert } from "chai";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { Kzyno } from "../target/types/kzyno";
import * as PDA from "./pda";

/** Vault balance must equal this lamport value ±1 “rent dust” lamport. */
export async function expectVaultWithinOneLamport(
  program: Program<Kzyno>,
  connection,
  principalLamports: number
) {
  const have = await connection.getBalance(PDA.vault(program.programId));
  assert.ok(
    have === principalLamports || have === principalLamports + 1,
    `vault ${have} ≠ ${principalLamports}±1`
  );
}

/** User’s SOL balance must be ≥ lowerBound (fees make upper bound fuzzy). */
export async function expectUserAtLeast(
  connection: Connection,
  user: PublicKey,
  lowerLamports: number
) {
  const bal = await connection.getBalance(user);
  assert.ok(
    bal >= lowerLamports,
    `user balance ${bal} < lower bound ${lowerLamports}`
  );
}

/** Sum of vault + all users must equal initialTotal ± rentReserve. */
export async function expectFullConservation(
  program: Program<Kzyno>,
  connection: Connection,
  users: PublicKey[],
  initialLamports: number,
  numTxns: number,
  maxFee: number = 10_000 // what you accumulated with meta.fee
) {
  const vault = await connection.getBalance(PDA.vault(program.programId));

  const userSum = (
    await Promise.all(users.map((u) => connection.getBalance(u)))
  ).reduce((a, b) => a + b, 0);

  const programAccounts = await connection.getProgramAccounts(
    program.programId,
    { dataSlice: { offset: 0, length: 0 } }
  );
  const rentLocked = programAccounts
    .map((acc) => acc.account.lamports)
    .reduce((a, b) => a + b, 0);

  const diff = Math.abs(initialLamports - (userSum + vault + rentLocked));

  assert.ok(diff <= 1 + maxFee * numTxns, `ledger imbalance ${diff} lamports`);
}
