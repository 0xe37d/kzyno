'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useCasino } from '@/contexts/CasinoContext';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import TradeModal from '@/components/casino/TradeModal';
import { KOINS_PER_SOL } from '@/lib/constants';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((m) => m.WalletMultiButton),
  { ssr: false }
);

export default function Dashboard() {
  const { connected } = useWallet();
  const { casinoClient } = useCasino();

  const [panel, setPanel] = useState<'lp' | 'koins'>('lp');
  const [balances, setBalances] = useState({ sol: 0, token: 0, casino: 0 });
  const [status,   setStatus]   = useState({
    total_liquidity:0, vault_balance:0, profit:0, profit_share:0,
  });
  const [koins, setKoins] = useState(0);
  const [modal,   setModal]   = useState<{kind:'lp'|'koins'; action:'deposit'|'withdraw'}|null>(null);
  const [loading, setLoading] = useState(false);

  // single fetch – runs on mount / when wallet or client changes
  useEffect(() => {
      if (!casinoClient || !connected) return;
      refreshData();
  }, [casinoClient, connected]);
  const refreshData = async () => {
    if (!casinoClient) return;
    setLoading(true);
  
    try {
      /* authenticate (shows Phantom once if needed) */
      await casinoClient.authenticate();
  
      /* FIRST call – get_balance
            this one sets the auth_token cookie */
      const bal = await casinoClient.get_balance();
  
      /* SECOND + THIRD can now run in parallel */
      const [stat, k] = await Promise.all([
        casinoClient.get_status(),
        casinoClient.get_koins(),
      ]);
  
      /* update state */
      setBalances(bal);
      setStatus(stat);
      setKoins(k);
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      setLoading(false);
    }
  };
  

  if (!connected) {
    return (
      <div className="flex flex-col items-center pt-20 gap-6 min-h-screen bg-[#0d1b2a] text-white pb-20">
        <h1 className="text-3xl font-bold text-white">KZYNO Dashbaord</h1>
        <h2 className="text-3xl text-white">Connect your wallet to get started!</h2>
        <WalletMultiButton className="!bg-yellow-500 !text-black" />
      </div>
    );
  }

  /* derived numbers */
  const sharePriceSOL =
    status.total_liquidity ? status.vault_balance / status.total_liquidity : 0;
  const lpValueSOL = balances.token * sharePriceSOL / 1e9;
  const koinsToSol = balances.casino / 1e9;
  const koinsPretty = koins.toLocaleString();

  return (
    <main className="min-h-screen bg-[#0d1b2a] text-white pb-20">

      <div className="max-w-4xl mx-auto pt-10 space-y-10">


        {/* ─── slider pill with sliding background ─────────────────────────── */}
        <div className="relative flex bg-gray-800 rounded-full w-fit mx-auto p-1">
        {/* sliding highlight */}
        <div
            className={`
            absolute inset-y-0 w-1/2 rounded-full
            bg-gradient-to-r from-pink-500 to-fuchsia-600
            transition-transform duration-300
            ${panel === 'koins' ? 'translate-x-full' : 'translate-x-0'}
            `}
        />
        {(['lp', 'koins'] as const).map((p) => (
            <button
            key={p}
            onClick={() => setPanel(p)}
            className={`
                relative z-10 px-6 py-2 rounded-full text-sm font-medium
                transition-colors duration-300
                ${panel === p ? 'text-white' : 'text-gray-400'}
            `}
            >
            {p === 'lp' ? 'LP Shares' : 'Get Koins'}
            </button>
            
        ))}
        
        </div>
        <button
          onClick={refreshData}
          className="px-4 py-2 text-sm rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40"
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>


        {/* Big horizontal card */}
        {panel === 'lp' ? (
          <BigCard
            title="Your LP Position"
            main={`${lpValueSOL.toFixed(4)} SOL`}
            sub={`${balances.token} shares • ${sharePriceSOL.toFixed(6)} SOL/share`}
            onDeposit={()=>setModal({kind:'lp',action:'deposit'})}
            onWithdraw={()=>setModal({kind:'lp',action:'withdraw'})}
          />
        ) : (
          <BigCard
            title="Koins Balance"
            main={koinsPretty + ' Koins'}
            sub={`${koinsToSol.toFixed(4)} SOL ≈ ${(koinsToSol*KOINS_PER_SOL).toFixed(0)} Koins`}
            onDeposit={()=>setModal({kind:'koins',action:'deposit'})}
            onWithdraw={()=>setModal({kind:'koins',action:'withdraw'})}
          />
        )}

        {/* Small stats grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <Stat label="Wallet SOL" value={(balances.sol/1e9).toFixed(4)} />
          <Stat label="Vault Balance" value={status.vault_balance.toFixed(4)} />
          <Stat label="House Profit" value={status.profit.toFixed(4)} />
          <Stat label="Your Profit Share" value={status.profit_share.toFixed(4)} />
        </section>
      </div>

      {/* modal layer */}
      {modal && (
        <TradeModal
          open
          kind={modal.kind}
          action={modal.action}
          onClose={()=>setModal(null)}
        />
      )}
    </main>
  );
}

/* helpers */
function BigCard({title,main,sub,onDeposit,onWithdraw}:{title:string;main:string;sub:string;onDeposit:()=>void;onWithdraw:()=>void}) {
  return (
    <section className="bg-gray-900 rounded-3xl p-8 flex justify-between items-center shadow-lg">
      <div>
        <p className="text-gray-400 text-xs">{title}</p>
        <p className="text-4xl font-bold">{main}</p>
        <p className="text-xs text-gray-500 mt-1">{sub}</p>
      </div>
      <div className="flex gap-4">
        <button onClick={onDeposit} className="px-6 py-3 rounded-full bg-green-600">
          Deposit
        </button>
        <button onClick={onWithdraw} className="px-6 py-3 rounded-full bg-red-600">
          Withdraw
        </button>
      </div>
    </section>
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
