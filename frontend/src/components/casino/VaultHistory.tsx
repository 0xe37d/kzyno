'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';

type Point = { t:number; v:number };   // unixSec, lamports

export function VaultHistory() {
  const [data, setData] = useState<Point[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch('/api/vault-history');   // ← hits backend API
        if (!res.ok) return;
        setData(await res.json());
      } catch { /* swallow */ }
    };
    load();
    const id = setInterval(load, 60_000);   // refresh every minute
    return () => clearInterval(id);
  }, []);

  if (!data.length) return null;

  return (
    <div className="h-64 w-full bg-black/40 rounded-lg p-4">
      <ResponsiveContainer>
        <LineChart data={data.map(d => ({ ...d, v: d.v/1e9 }))}>
          <XAxis dataKey="t" tickFormatter={t=>new Date(t*1000).toLocaleTimeString()} />
          <YAxis unit=" SOL" />
          <Tooltip formatter={(v:number)=>v.toFixed(2)+' SOL'} />
          <Line type="monotone" dataKey="v" strokeWidth={2} dot={false}/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
