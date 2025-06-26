'use client';

import { useState } from 'react';
import { useCasino } from '@/contexts/CasinoContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  action: 'deposit' | 'withdraw';
}

export default function LiquidityModal({ isOpen, onClose, action }: Props) {
  const { casinoClient } = useCasino();
  const [amount, setAmount] = useState(1);
  const [loading, setLoading] = useState(false);
  const title = action === 'deposit' ? 'Add Liquidity' : 'Withdraw Liquidity';

  if (!isOpen) return null;

  const handle = async () => {
    if (!casinoClient) return;
    setLoading(true);
    try {
      action === 'deposit'
        ? await casinoClient.deposit(amount)
        : await casinoClient.withdraw(amount);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50">
      <div className="bg-gray-900 rounded-xl w-80 p-6">
        <h3 className="text-xl font-semibold mb-4 text-white">{title}</h3>
        <input
          type="number"
          min="0.1"
          step="0.1"
          value={amount}
          onChange={(e) => setAmount(+e.target.value)}
          className="w-full p-3 bg-gray-800 text-white rounded mb-4"
        />
        <button
          onClick={handle}
          disabled={loading}
          className="w-full py-3 bg-blue-600 rounded text-white"
        >
          {loading ? 'Processing…' : title}
        </button>
        <button
          onClick={onClose}
          className="w-full mt-3 py-2 text-sm text-gray-400 hover:text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
