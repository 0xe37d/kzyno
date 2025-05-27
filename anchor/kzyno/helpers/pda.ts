import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

export const leU64 = (n: number | anchor.BN) =>
  new anchor.BN(n).toArrayLike(Buffer, "le", 8);

export function globalState(programId: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("global_state")],
    programId
  )[0];
}

export function vault(programId: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from("vault")], programId)[0];
}

export function userLiquidity(
  programId: PublicKey,
  owner: PublicKey,
  index: number
) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user_liquidity"), owner.toBuffer(), leU64(index)],
    programId
  )[0];
}

export function userBalance(programId: PublicKey, owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user_balance"), owner.toBuffer()],
    programId
  )[0];
}
