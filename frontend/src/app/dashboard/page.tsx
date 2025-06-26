'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';
import { useCasino } from '@/contexts/CasinoContext';
import { useSettings } from '@/contexts/SettingsContext';
import { KOINS_PER_SOL } from '@/lib/constants';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((m) => m.WalletMultiButton),
  { ssr: false }
);

export default function Dashboard() {
  const { connected } = useWallet();
  const { casinoClient } = useCasino();
  const { settings } = useSettings();

  const [koins,   setKoins]   = useState(0);   // integer Koins
  const [balances,setBalances]= useState({ sol:0, token:0, casino:0 });
  const [status,  setStatus]  = useState({
    total_liquidity:0, vault_balance:0, profit:0, profit_share:0,
  });

  // local input states for actions
  const [solIn,  setSolIn]  = useState(0.1);
  const [solOut, setSolOut] = useState(0);
  const [lpIn,   setLpIn]   = useState(1);
  const [lpOut,  setLpOut]  = useState(0);

  const solFmt   = (l:number)=> (l/1e9).toFixed(4);
  const koinsFmt = (k:number)=> k.toLocaleString();

  /* ───────────────────────────────── polling existing APIs ───────────────────────────── */
  useEffect(() => {
    if (!casinoClient || !connected) return;

    const refresh = async () => {
      setKoins(await casinoClient.get_koins());          // → /accounts get_koins
      setBalances(await casinoClient.get_balance());     // → /accounts get_balance
      setStatus  (await casinoClient.get_status());      // → /accounts get_status
    };
    refresh();
    const id = setInterval(refresh, 5_000);              // every 5 s
    return () => clearInterval(id);
  }, [casinoClient, connected]);
  /* ───────────────────────────────────────────────────────────────────────────────────── */

  if (!connected) {
    return (
      <section className="flex flex-col items-center gap-4 py-20">
        <h1 className="text-3xl font-bold">KZYNO Dashboard</h1>
        <WalletMultiButton className="!bg-purple-600 !text-white" />
        <p className="text-xs opacity-70">Cluster: {settings.rpcCluster}</p>
      </section>
    );
  }

  return (
    <main className="max-w-3xl mx-auto py-10 space-y-10">
      {/* ─── WALLET & CASINO INFO ─────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-4 text-sm">
        <div className="p-4 bg-black/40 rounded-lg">
          <h2 className="font-semibold mb-2">Wallet</h2>
          <div>SOL: {solFmt(balances.sol)}</div>
          <div>LP Shares: {balances.token}</div>
        </div>
        <div className="p-4 bg-black/40 rounded-lg">
          <h2 className="font-semibold mb-2">Casino</h2>
          <div>Koins: {koinsFmt(koins)}</div>
          <div>Casino Balance (SOL): {solFmt(balances.casino)}</div>
        </div>
      </section>

      {/* ─── PROFIT & LIQUIDITY STATUS ───────────────────────────────── */}
      <section className="p-4 bg-black/50 rounded-lg text-sm">
        <h3 className="font-semibold text-lg mb-2">House Stats</h3>
        <div>Total Liquidity: {status.total_liquidity}</div>
        <div>Vault Balance:  {status.vault_balance.toFixed(4)} SOL</div>
        <div>House Profit (all time): {status.profit.toFixed(4)} SOL</div>
        <div>Your Profit Share: {status.profit_share.toFixed(4)} SOL</div>
      </section>

      {/* ─── PLAY BALANCE ACTIONS ───────────────────────────────────── */}
      <section className="bg-black/50 p-6 rounded-lg space-y-4">
        <h3 className="font-semibold text-lg">Play Balance</h3>

        <label className="block text-xs">Deposit SOL</label>
        <input type="number" min="0.01" step="0.01" value={solIn}
               onChange={e=>setSolIn(+e.target.value)}
               className="w-full rounded bg-white/10 p-2 mb-2"/>
        <button className="w-full bg-green-600 py-2 rounded"
                onClick={()=>casinoClient?.depositFunds(solIn)}>
          Deposit → Koins
        </button>

        <label className="block text-xs mt-4">Withdraw SOL</label>
        <input type="number" min="0" step="0.01" value={solOut}
               onChange={e=>setSolOut(+e.target.value)}
               className="w-full rounded bg-white/10 p-2 mb-2"/>
        <button className="w-full bg-red-600 py-2 rounded"
                onClick={()=>casinoClient?.withdrawFunds(solOut)}>
          Withdraw Koins → SOL
        </button>
      </section>

      {/* ─── LP ACTIONS ──────────────────────────────────────────────── */}
      <section className="bg-black/50 p-6 rounded-lg space-y-4">
        <h3 className="font-semibold text-lg">Liquidity Provider</h3>

        <label className="block text-xs mt-2">Deposit Tokens</label>
        <input type="number" min="0.1" step="0.1" value={lpIn}
               onChange={e=>setLpIn(+e.target.value)}
               className="w-full rounded bg-white/10 p-2 mb-2"/>
        <button className="w-full bg-blue-600 py-2 rounded"
                onClick={()=>casinoClient?.deposit(lpIn)}>
          Provide Liquidity
        </button>

        <label className="block text-xs mt-4">Withdraw Tokens</label>
        <input type="number" min="0" step="0.1" value={lpOut}
               onChange={e=>setLpOut(+e.target.value)}
               className="w-full rounded bg-white/10 p-2 mb-2"/>
        <button className="w-full bg-yellow-600 py-2 rounded"
                onClick={()=>casinoClient?.withdraw(lpOut)}>
          Withdraw Liquidity
        </button>
      </section>
    </main>
  );
}
