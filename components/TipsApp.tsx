'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { HealthTip, UserKey } from '@/lib/types';

type LoginUser = { name: string; key: UserKey };
const USERS = [
  { name: 'Robert', key: 'robert', password: 'robert26' },
  { name: 'Robert', key: 'robert', password: 'robert 26' },
  { name: 'Erika', key: 'erika', password: 'erika26' },
] as const;

const categoryLabels: Record<HealthTip['category'], string> = {
  meal: 'Maträtt',
  smoothie: 'Smoothie',
  supplement: 'Supplement',
  routine: 'Rutin',
  training: 'Träning',
  other: 'Annat',
};

export default function TipsApp() {
  const [currentUser, setCurrentUser] = useState<LoginUser | null>(null);
  const [loginName, setLoginName] = useState<UserKey>('robert');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [tips, setTips] = useState<HealthTip[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('health-user');
    if (saved) setCurrentUser(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (currentUser) loadTips();
  }, [currentUser]);

  function login() {
    const found = USERS.find((user) => user.key === loginName && user.password === password.trim());
    if (!found) {
      setLoginError('Fel namn eller kod. Testa igen.');
      return;
    }
    const user = { name: found.name, key: found.key } satisfies LoginUser;
    localStorage.setItem('health-user', JSON.stringify(user));
    setCurrentUser(user);
  }

  function logout() {
    localStorage.removeItem('health-user');
    setCurrentUser(null);
  }

  async function loadTips() {
    const res = await fetch('/api/tips');
    const data = await res.json();
    setTips(data.tips || []);
  }

  async function addTip(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') || '').trim();
    const category = String(form.get('category') || 'other') as HealthTip['category'];
    const body = String(form.get('body') || '').trim();
    if (!title || !body) return;

    const res = await fetch('/api/tips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, category, body, createdBy: currentUser.key }),
    });
    if (res.ok) {
      event.currentTarget.reset();
      await loadTips();
    }
  }

  async function deleteTip(id?: string) {
    if (!id) return;
    await fetch(`/api/tips/${id}`, { method: 'DELETE' });
    await loadTips();
  }

  if (!currentUser) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#121212] px-4 py-10 text-white">
        <section className="w-full max-w-md rounded-[2rem] bg-[#242424] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.45)] ring-1 ring-white/5 md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-300">Health 2026</p>
          <h1 className="mt-3 text-4xl font-black">Logga in</h1>
          <div className="mt-6 space-y-4">
            <select value={loginName} onChange={(event) => setLoginName(event.target.value as UserKey)} className="w-full rounded-2xl bg-[#181818] px-4 py-4 font-bold text-white ring-1 ring-white/10"><option value="robert">Robert</option><option value="erika">Erika</option></select>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl bg-[#181818] px-4 py-4 font-bold text-white ring-1 ring-white/10" placeholder="Kod" />
            {loginError && <p className="rounded-2xl bg-rose-500/15 px-4 py-3 font-bold text-rose-100">{loginError}</p>}
            <button onClick={login} className="w-full rounded-2xl bg-amber-300 px-5 py-4 font-black text-zinc-950">Öppna</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#121212] text-white">
      <div className="grid min-h-screen xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="sticky top-0 z-20 border-b border-white/5 bg-[#242424] p-4 xl:h-screen xl:border-b-0 xl:p-6">
          <div className="flex items-center justify-between gap-4 xl:block">
            <Link href="/" className="flex items-center gap-3 text-2xl font-black tracking-tight"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-300 text-zinc-950">⚡</span>Healthodo</Link>
            <button onClick={logout} className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white/80 xl:hidden">Ut</button>
          </div>
          <div className="mt-6 hidden rounded-[1.5rem] bg-[#181818] p-4 ring-1 ring-white/5 xl:block"><p className="text-xs font-black uppercase tracking-[0.25em] text-white/35">Inloggad</p><p className="mt-2 text-2xl font-black">{currentUser.name}</p></div>
          <nav className="mt-5 grid grid-cols-4 gap-2 xl:grid-cols-1">
            <Link href="/" className="rounded-[1.2rem] px-3 py-3 text-center text-sm font-black text-white/65 hover:bg-white/10 xl:text-left">Gemensam</Link>
            <Link href="/robert" className="rounded-[1.2rem] px-3 py-3 text-center text-sm font-black text-white/65 hover:bg-white/10 xl:text-left">Robert</Link>
            <Link href="/erika" className="rounded-[1.2rem] px-3 py-3 text-center text-sm font-black text-white/65 hover:bg-white/10 xl:text-left">Erika</Link>
            <Link href="/tips" className="rounded-[1.2rem] bg-amber-300 px-3 py-3 text-center text-sm font-black text-zinc-950 xl:text-left">Hälsotips</Link>
          </nav>
          <button onClick={logout} className="mt-6 hidden w-full rounded-[1.2rem] bg-white/10 px-4 py-3 font-black text-white/70 xl:block">Logga ut</button>
        </aside>

        <section className="px-4 py-5 md:px-8 md:py-8 xl:px-12">
          <header className="rounded-[2rem] bg-[#202020] p-6 ring-1 ring-white/5 md:p-8">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-amber-300">Gemensam kunskap</p>
            <h1 className="mt-4 text-5xl font-black tracking-tight md:text-7xl">Hälsotips</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-white/50">Maträtter, smoothies, supplement, rutiner, träning och idéer som ni vill spara tillsammans.</p>
          </header>

          <section className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
            <form onSubmit={addTip} className="rounded-[2rem] bg-[#202020] p-5 ring-1 ring-white/5 md:p-7">
              <h2 className="text-3xl font-black">Lägg till tips</h2>
              <div className="mt-6 space-y-4">
                <input name="title" className="w-full rounded-2xl bg-[#181818] px-5 py-4 font-black text-white outline-none ring-1 ring-white/5 focus:ring-4 focus:ring-amber-300/20" placeholder="T.ex. Ägg-vecka, grön smoothie..." />
                <select name="category" className="w-full rounded-2xl bg-[#181818] px-5 py-4 font-black text-white outline-none ring-1 ring-white/5 focus:ring-4 focus:ring-amber-300/20">
                  <option value="meal">Maträtt</option><option value="smoothie">Smoothie</option><option value="supplement">Supplement</option><option value="routine">Rutin</option><option value="training">Träning</option><option value="other">Annat</option>
                </select>
                <textarea name="body" rows={9} className="w-full rounded-2xl bg-[#181818] px-5 py-4 font-semibold text-white outline-none ring-1 ring-white/5 focus:ring-4 focus:ring-amber-300/20" placeholder="Skriv tipset här..." />
                <button className="w-full rounded-2xl bg-amber-300 px-5 py-4 font-black text-zinc-950 hover:bg-amber-200">Spara tips</button>
              </div>
            </form>

            <div className="grid gap-4 md:grid-cols-2">
              {tips.map((tip) => (
                <article key={tip._id} className="rounded-[2rem] bg-[#202020] p-5 ring-1 ring-white/5">
                  <span className="inline-flex rounded-full bg-amber-300 px-3 py-1 text-xs font-black uppercase tracking-wider text-zinc-950">{categoryLabels[tip.category]}</span>
                  <h3 className="mt-4 text-2xl font-black">{tip.title}</h3>
                  <p className="mt-3 whitespace-pre-line leading-7 text-white/55">{tip.body}</p>
                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/5 pt-4">
                    <p className="text-xs font-black uppercase tracking-wider text-white/30">Skrivet av {tip.createdBy}</p>
                    <button onClick={() => deleteTip(tip._id)} className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-black text-rose-100">Ta bort</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
