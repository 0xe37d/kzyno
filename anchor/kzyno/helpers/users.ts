import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";

export async function createUser(
  provider: AnchorProvider,
  sol = 5 * LAMPORTS_PER_SOL
) {
  const kp = Keypair.generate();
  const sig = await provider.connection.requestAirdrop(kp.publicKey, sol);
  await provider.connection.confirmTransaction(sig);
  return kp;
}
