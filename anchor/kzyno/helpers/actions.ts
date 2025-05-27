import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Kzyno } from "../target/types/kzyno";
import { SystemProgram } from "@solana/web3.js";
import * as PDA from "./pda";

export async function init(
  program: Program<Kzyno>,
  admin: anchor.web3.Keypair
) {
  await program.methods
    .initialize()
    .accounts({
      admin: admin.publicKey,
      // @ts-expect-error
      globalState: PDA.globalState(program.programId),
      systemProgram: SystemProgram.programId,
    })
    .signers([admin])
    .rpc();
}

export async function depositLiquidity(opts: {
  program: Program<Kzyno>;
  signer: anchor.web3.Keypair;
  index: number;
  lamports: number;
}) {
  const { program, signer, index, lamports } = opts;
  await program.methods
    .depositLiquidity(new anchor.BN(index), new anchor.BN(lamports))
    .accounts({
      signer: signer.publicKey,
      // @ts-expect-error
      vaultAccount: PDA.vault(program.programId),
      globalState: PDA.globalState(program.programId),
      userLiquidity: PDA.userLiquidity(
        program.programId,
        signer.publicKey,
        index
      ),
      systemProgram: SystemProgram.programId,
    })
    .signers([signer])
    .rpc();
}

export async function withdrawLiquidity(opts: {
  program: Program<Kzyno>;
  signer: anchor.web3.Keypair;
  index: number;
}) {
  const { program, signer, index } = opts;
  await program.methods
    .withdrawLiquidity(new anchor.BN(index))
    .accounts({
      signer: signer.publicKey,
      // @ts-expect-error
      vaultAccount: PDA.vault(program.programId),
      globalState: PDA.globalState(program.programId),
      userLiquidity: PDA.userLiquidity(
        program.programId,
        signer.publicKey,
        index
      ),
      systemProgram: SystemProgram.programId,
    })
    .signers([signer])
    .rpc();
}

export async function depositFunds(opts: {
  program: Program<Kzyno>;
  signer: anchor.web3.Keypair;
  lamports: number;
}) {
  const { program, signer, lamports } = opts;
  await program.methods
    .depositFunds(new anchor.BN(lamports))
    .accounts({
      signer: signer.publicKey,
      // @ts-expect-error
      userBalance: PDA.userBalance(program.programId, signer.publicKey),
      vaultAccount: PDA.vault(program.programId),
      globalState: PDA.globalState(program.programId),
      systemProgram: SystemProgram.programId,
    })
    .signers([signer])
    .rpc();
}

export async function withdrawFunds(opts: {
  program: Program<Kzyno>;
  signer: anchor.web3.Keypair;
  lamports: number;
}) {
  const { program, signer, lamports } = opts;
  await program.methods
    .withdrawFunds(new anchor.BN(lamports))
    .accounts({
      user: signer.publicKey,
      // @ts-expect-error
      userBalance: PDA.userBalance(program.programId, signer.publicKey),
      vaultAccount: PDA.vault(program.programId),
      globalState: PDA.globalState(program.programId),
      systemProgram: SystemProgram.programId,
    })
    .signers([signer])
    .rpc();
}

export async function playGame(opts: {
  program: Program<Kzyno>;
  signer: anchor.web3.Keypair; // admin / house signer
  user: anchor.web3.Keypair; // player whose balance is debited
  lamports: number;
  chance: number;
  randomNumber: number;
}) {
  const { program, signer, user, lamports, chance, randomNumber } = opts;
  await program.methods
    .playGame(
      new anchor.BN(chance),
      new anchor.BN(randomNumber),
      new anchor.BN(lamports)
    )
    .accounts({
      signer: signer.publicKey,
      // @ts-expect-error
      userBalance: PDA.userBalance(program.programId, user.publicKey),
      globalState: PDA.globalState(program.programId),
      vaultAccount: PDA.vault(program.programId),
      user: user.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([signer])
    .rpc();
}
