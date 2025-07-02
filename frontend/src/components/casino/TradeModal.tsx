'use client';

import { useState } from 'react';
import { useCasino } from '@/contexts/CasinoContext';

type Kind = 'lp' | 'koins';          // which asset
type Action = 'deposit' | 'withdraw';

interface Props {
  open: boolean;
  onClose: () => void;
  kind: Kind;
  action: Action;
}

export default function TradeModal({ open, onClose, kind, action }: Props) {
  const { casinoClient } = useCasino();
  const [amount, setAmount] = useState(1);
  const [loading, setLoading] = useState(false);
  if (!open) return null;

  const title = `${action === 'deposit' ? 'Deposit' : 'Withdraw'} ${kind === 'lp' ? 'LP' : 'Koins'}`;

  const handle = async () => {
    if (!casinoClient) return;
    setLoading(true);
    try {
      if (kind === 'lp') {
        action === 'deposit'
          ? await casinoClient.deposit(amount)
          : await casinoClient.withdraw(amount);
      } else {
        action === 'deposit'
          ? await casinoClient.depositFunds(amount)
          : await casinoClient.withdrawFunds(amount);
      }
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="bg-[#0d1b2a] rounded-xl w-80 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(+e.target.value)}
          className="w-full bg-gray-800 text-white p-3 rounded mb-4"
        />
        <button
          onClick={handle}
          disabled={loading}
          className="w-full py-3 rounded bg-green-600 text-white disabled:opacity-60"
        >
          {loading ? 'Processing…' : title}
        </button>
        <button
          onClick={onClose}
          className="w-full mt-3 text-sm text-gray-400 hover:text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
