import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Kzyno } from "../target/types/kzyno";
import { createUser } from "../helpers/users";
import * as Act from "../helpers/actions";
import * as As from "../helpers/asserts";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import fs from "fs";

(async () => {
  const provider = anchor.AnchorProvider.env(); // uses cluster + wallet from Anchor.toml
  anchor.setProvider(provider);

  const program = anchor.workspace.kzyno as Program<Kzyno>;

  const adminSecretKeyString = fs.readFileSync(
    "../../wallets/kzy2HnRf46r9zNvAuxhwoJcZrYVTQtTToZ7RNsHwsA4.json",
    {
      encoding: "utf8",
    }
  );
  const adminKey = Uint8Array.from(JSON.parse(adminSecretKeyString));

  const admin = Keypair.fromSecretKey(adminKey);

  await Act.init(program, admin);
})();
