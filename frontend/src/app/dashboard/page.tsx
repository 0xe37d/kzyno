'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useCasino } from '@/contexts/CasinoContext';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import LiquidityModal from '@/components/casino/LiquidityModal';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((m) => m.WalletMultiButton),
  { ssr: false }
);

export default function Dashboard2() {
  const { connected } = useWallet();
  const { casinoClient } = useCasino();

  const [balances, setBalances] = useState({ sol: 0, token: 0, casino: 0 });
  const [status,   setStatus]   = useState({
    total_liquidity:0, vault_balance:0, profit:0, profit_share:0,
  });
  const [lpModal,  setLpModal]  = useState<'deposit'|'withdraw'|null>(null);

  // polling
  useEffect(() => {
    if (!casinoClient || !connected) return;
    const refresh = async () => {
      setBalances(await casinoClient.get_balance());
      setStatus(await casinoClient.get_status());
    };
    refresh();
    const id = setInterval(refresh, 5_000);
    return () => clearInterval(id);
  }, [casinoClient, connected]);

  if (!connected) {
    return (
      <div className="flex flex-col items-center gap-6 pt-20">
        <h1 className="text-3xl font-bold">KZYNO Dashboard</h1>
        <WalletMultiButton className="!bg-purple-600 !text-white" />
      </div>
    );
  }

  const sharePriceSOL =
    status.total_liquidity ? status.vault_balance / status.total_liquidity : 0;
  const userShareValueSOL = balances.token * sharePriceSOL / 1e9;

  return (
    <main className="max-w-4xl mx-auto py-10 space-y-10">
      {/* big horizontal card */}
      <section className="bg-gray-900 rounded-2xl p-8 flex justify-between items-center shadow-lg">
        <div>
          <h2 className="text-gray-400 text-sm">Your LP Position</h2>
          <p className="text-4xl font-bold text-white">
            {userShareValueSOL.toFixed(4)} <span className="text-lg">SOL</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {balances.token} shares • {sharePriceSOL.toFixed(6)} SOL / share
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setLpModal('deposit')}
            className="px-6 py-3 rounded-full bg-green-600 text-white"
          >
            Deposit
          </button>
          <button
            onClick={() => setLpModal('withdraw')}
            className="px-6 py-3 rounded-full bg-red-600 text-white"
          >
            Withdraw
          </button>
        </div>
      </section>

      {/* secondary stats grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <Stat label="Wallet SOL" value={(balances.sol/1e9).toFixed(4)} />
        <Stat label="Koins (SOL eq.)" value={(balances.casino/1e9).toFixed(4)} />
        <Stat label="Vault Balance" value={status.vault_balance.toFixed(4)+' SOL'} />
        <Stat label="Total Liquidity" value={status.total_liquidity} />
        <Stat label="House Profit" value={status.profit.toFixed(4)+' SOL'} />
        <Stat label="Your Profit Share" value={status.profit_share.toFixed(4)+' SOL'} />
      </section>

      {lpModal && (
        <LiquidityModal
          isOpen
          action={lpModal}
          onClose={() => setLpModal(null)}
        />
      )}
    </main>
  );
}

function Stat({ label, value }: {label:string; value:string|number}) {
  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <p className="text-gray-400 text-xs">{label}</p>
      <p className="text-white font-semibold mt-1">{value}</p>
    </div>
  );
}
