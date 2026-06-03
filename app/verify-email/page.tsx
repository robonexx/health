'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const [message, setMessage] = useState('Bekräftar din email...');
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setMessage('Saknar confirmation token.');
      return;
    }
    void fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Kunde inte bekräfta email.');
        setOk(true);
        setMessage('Din email är bekräftad. Välkommen till DinHälsa.');
      })
      .catch((error) => setMessage(error.message));
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-[#07080c] px-4 text-white">
      <section className="max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.08] p-8 text-center shadow-2xl backdrop-blur-2xl">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-200">DinHälsa</p>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.06em]">{ok ? 'Email bekräftad' : 'Confirmation'}</h1>
        <p className="mt-4 text-white/60">{message}</p>
        <Link href="/" className="mt-6 inline-flex rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-black text-slate-950">Öppna appen</Link>
      </section>
    </main>
  );
}
