/* src/lib/solana/serialization.ts -------------------------------------- */

/**
 * Convert a JS number (safe ≤ 2^53-1) or bigint to an 8-byte little-endian
 * Uint8Array (the format Anchor uses for `u64`).
 */
function u64LE(value: number | bigint): Uint8Array {
  let n = BigInt(value)
  const out = new Uint8Array(8)
  for (let i = 0; i < 8; i++) {
    out[i] = Number(n & 0xffn)
    n >>= 8n
  }
  return out
}

/**
 * Anchor instruction data for `play_game(multiplier, rng_seed, bet)`.
 */
export async function buildPlayGameData(
  multiplier: number,
  rngSeed: number,
  bet: number
): Promise<Uint8Array> {
  /* 1 ─ discriminator (= first 8 bytes of sha256("global:play_game")) */
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('global:play_game'))
  const discriminator = new Uint8Array(hash).slice(0, 8) // 8 bytes

  /* 2 ─ payload (24 bytes) */
  const payload = new Uint8Array(24)
  payload.set(u64LE(multiplier), 0)
  payload.set(u64LE(rngSeed), 8)
  payload.set(u64LE(bet), 16)

  /* 3 ─ concatenate */
  const data = new Uint8Array(32)
  data.set(discriminator, 0)
  data.set(payload, 8)
  return data // ← Uint8Array(32)
}
