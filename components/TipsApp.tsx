'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { AppUser, HealthTip } from '@/lib/types';

type LoginUser = AppUser & { id: string };
type TipCategory = HealthTip['category'];
const categoryLabels: Record<TipCategory, string> = {
  meal: 'Maträtt',
  smoothie: 'Smoothie',
  supplement: 'Supplement',
  routine: 'Rutin',
  training: 'Träning',
  other: 'Annat',
};

const softCard = 'rounded-[2rem] border border-zinc-950/10 bg-white/80 shadow-[0_22px_70px_rgba(18,18,18,0.08)] backdrop-blur-xl';
const darkCard = 'rounded-[2rem] border border-white/10 bg-zinc-950 text-white shadow-[0_28px_90px_rgba(0,0,0,0.22)]';
const input = 'w-full rounded-2xl border border-zinc-950/10 bg-white px-4 py-3 text-sm font-semibold text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#99c75b] focus:ring-4 focus:ring-[#99c75b]/20';
const button = 'rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-[-0.01em] transition active:scale-[0.98]';
const greenButton = `${button} bg-[#99c75b] text-zinc-950 shadow-[0_14px_35px_rgba(153,199,91,0.28)] hover:-translate-y-0.5 hover:bg-[#aad86e]`;
const blackButton = `${button} bg-zinc-950 text-white shadow-[0_14px_35px_rgba(0,0,0,0.18)] hover:-translate-y-0.5`;

function Background() {
  return (
    <div aria-hidden="true" className="fixed inset-0 overflow-hidden">
      <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[#cfe8a9] opacity-70 blur-3xl" />
      <div className="absolute right-[-12rem] top-20 h-[32rem] w-[32rem] rounded-full bg-[#f5d77d] opacity-60 blur-3xl" />
      <div className="absolute bottom-[-15rem] left-1/2 h-[30rem] w-[30rem] rounded-full bg-[#a7d8d0] opacity-50 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(24,24,27,0.10)_1px,transparent_0)] [background-size:24px_24px] opacity-35" />
    </div>
  );
}

export default function TipsApp() {
  const [currentUser, setCurrentUser] = useState<LoginUser | null>(null);
  const [tips, setTips] = useState<HealthTip[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let ignore = false;
    void fetch('/api/auth/me')
      .then((response) => response.json())
      .then((data) => {
        if (!ignore && data.user) setCurrentUser(data.user);
      });
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    let ignore = false;
    void Promise.resolve().then(async () => {
      setIsBusy(true);
      const response = await fetch('/api/tips');
      const data = await response.json();
      if (!ignore) setTips(data.tips || []);
      if (!ignore) setIsBusy(false);
    });
    return () => {
      ignore = true;
    };
  }, [currentUser]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setCurrentUser(null);
  }

  async function loadTips() {
    const response = await fetch('/api/tips');
    const data = await response.json();
    setTips(data.tips || []);
  }

  function flash(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 2600);
  }

  async function addTip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') || '').trim();
    const category = String(form.get('category') || 'other') as TipCategory;
    const body = String(form.get('body') || '').trim();
    if (!title || !body) return;

    const formElement = event.currentTarget;
    const response = await fetch('/api/tips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, category, body, createdBy: currentUser.key }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      flash(data?.message || 'Kunde inte spara tipset. Kolla MongoDB/Vercel env.');
      return;
    }
    formElement.reset();
    await loadTips();
    flash('Hälsotipset är sparat.');
  }

  async function updateTip(tip: HealthTip, patch: Partial<HealthTip>) {
    if (!tip._id) return;
    const response = await fetch(`/api/tips/${tip._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!response.ok) {
      flash('Kunde inte uppdatera tipset.');
      return;
    }
    await loadTips();
  }

  async function deleteTip(id?: string) {
    if (!id) return;
    const response = await fetch(`/api/tips/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      flash('Kunde inte ta bort tipset.');
      return;
    }
    await loadTips();
    flash('Hälsotipset är borttaget.');
  }

  if (!currentUser) {
    return <main className="min-h-screen bg-zinc-950 px-4 py-10 text-white"><div className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.08] p-8 text-center"><h1 className="text-4xl font-black tracking-[-0.06em]">Logga in först</h1><p className="mt-3 text-white/60">Skapa konto eller logga in på startsidan för att dela hälso-tips.</p><Link href="/" className="mt-6 inline-flex rounded-2xl bg-[#99c75b] px-5 py-3 text-sm font-black text-zinc-950">Till login</Link></div></main>;
  }

  return (
    <main className="min-h-screen bg-[#f3f0e8] text-zinc-950">
      <Background />
      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1680px] gap-5 p-3 md:p-5 xl:grid-cols-[290px_minmax(0,1fr)]">
        <SideNav currentUser={currentUser} active="tips" logout={logout} />
        <section className="min-w-0 space-y-5">
          <header className={`${darkCard} overflow-hidden`}>
            <div className="grid lg:grid-cols-[1fr_280px]">
              <div className="relative overflow-hidden p-5 md:p-8">
                <div className="absolute right-[-4rem] top-[-4rem] h-64 w-64 rounded-full bg-[#99c75b] opacity-70 blur-3xl" />
                <p className="relative text-xs font-black uppercase tracking-[0.4em] text-[#99c75b]">Gemensam kunskap</p>
                <h1 className="relative mt-6 max-w-3xl text-5xl font-black uppercase leading-[0.85] tracking-[-0.08em] md:text-7xl xl:text-8xl">Health tips</h1>
                <p className="relative mt-5 max-w-2xl text-base font-semibold leading-7 text-white/56 md:text-lg">Spara maträtter, smoothies, supplement, rutiner och små idéer som ni vill kunna hitta igen.</p>
              </div>
              <div className="bg-[#99c75b] p-6 text-zinc-950">
                <p className="text-sm font-black uppercase tracking-[0.35em] text-zinc-950/55">Library</p>
                <p className="mt-5 text-8xl font-black leading-none tracking-[-0.09em]">{tips.length}</p>
                <p className="text-3xl font-black uppercase leading-none tracking-[-0.06em]">tips</p>
                <div className="mt-8 rounded-[1.5rem] bg-zinc-950 p-4 text-white">
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-white/35">Shared</p>
                  <p className="mt-2 text-2xl font-black tracking-[-0.05em]">For both of you</p>
                </div>
              </div>
            </div>
          </header>

          {isBusy && <div className="rounded-3xl border border-zinc-950/10 bg-white/70 px-5 py-4 text-sm font-black text-zinc-500 shadow-sm">Laddar hälsotips...</div>}
          {message && <div className="rounded-3xl border border-zinc-950/10 bg-zinc-950 px-5 py-4 text-sm font-black text-white shadow-xl">{message}</div>}

          <section className="grid gap-5 lg:grid-cols-[420px_minmax(0,1fr)]">
            <form onSubmit={addTip} className={`${softCard} p-5 md:p-6`}>
              <p className="text-xs font-black uppercase tracking-[0.34em] text-[#7ea83e]">Add idea</p>
              <h2 className="mt-2 text-4xl font-black uppercase leading-[0.9] tracking-[-0.07em]">Nytt tips</h2>
              <div className="mt-6 space-y-4 rounded-[1.7rem] bg-[#f3f0e8] p-3">
                <input name="title" className={input} placeholder="T.ex. Grön smoothie, ägg-vecka..." />
                <select name="category" className={input}>
                  <option value="meal">Maträtt</option>
                  <option value="smoothie">Smoothie</option>
                  <option value="supplement">Supplement</option>
                  <option value="routine">Rutin</option>
                  <option value="training">Träning</option>
                  <option value="other">Annat</option>
                </select>
                <textarea name="body" rows={9} className={input} placeholder="Skriv tipset här..." />
                <button className={`${greenButton} w-full`}>Spara tips</button>
              </div>
            </form>

            <div className="grid content-start gap-4 md:grid-cols-2">
              {tips.length === 0 && (
                <div className={`${softCard} p-8 md:col-span-2`}>
                  <p className="text-4xl font-black uppercase tracking-[-0.07em]">Inga tips än</p>
                  <p className="mt-3 max-w-xl font-semibold leading-7 text-zinc-500">Lägg in första smoothie-idén, matplanen, supplement-noteringen eller träningsrutinen.</p>
                </div>
              )}
              {tips.map((tip, index) => (
                <HealthTipCard key={tip._id || `${tip.title}-${index}`} tip={tip} index={index} onUpdate={(patch) => updateTip(tip, patch)} onDelete={() => deleteTip(tip._id)} />
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}



function SideNav({ currentUser, active, logout }: { currentUser: LoginUser; active: 'tips'; logout: () => void }) {
  return (
    <aside className="xl:sticky xl:top-5">
      <div className="rounded-[2rem] border border-zinc-950/10 bg-white/80 p-4 shadow-[0_22px_70px_rgba(18,18,18,0.08)] backdrop-blur-xl">
        <div className="rounded-[1.5rem] bg-zinc-950 p-5 text-white">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-white/40">DinHälsa</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.07em]">Health tips</h2>
          <p className="mt-3 text-sm font-semibold text-white/50">Inloggad som {currentUser.name}</p>
        </div>
        <nav className="mt-3 space-y-2">
          <Link href="/" className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-black text-zinc-500 transition hover:bg-zinc-950 hover:text-white">◈ Dashboard</Link>
          <Link href="/tips" className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-black transition ${active === 'tips' ? 'bg-zinc-950 text-white' : 'text-zinc-500 hover:bg-zinc-950 hover:text-white'}`}>✦ Hälsotips</Link>
        </nav>
        <button onClick={logout} className="mt-3 w-full rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-black text-zinc-500 transition hover:bg-zinc-950 hover:text-white">Logga ut</button>
      </div>
    </aside>
  );
}

function HealthTipCard({ tip, index, onUpdate, onDelete }: { tip: HealthTip; index: number; onUpdate: (patch: Partial<HealthTip>) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: tip.title, category: tip.category, body: tip.body });

  useEffect(() => {
    setDraft({ title: tip.title, category: tip.category, body: tip.body });
  }, [tip.title, tip.category, tip.body]);

  function save() {
    if (!draft.title.trim() || !draft.body.trim()) return;
    onUpdate({ title: draft.title, category: draft.category, body: draft.body });
    setEditing(false);
  }

  return (
    <article className="overflow-hidden rounded-[2rem] border border-zinc-950/10 bg-white shadow-[0_16px_45px_rgba(24,24,27,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(24,24,27,0.10)]">
      <div className="flex items-center justify-between bg-zinc-950 p-4 text-white">
        <span className="rounded-full bg-[#99c75b] px-3 py-1 text-xs font-black uppercase text-zinc-950">{categoryLabels[tip.category]}</span>
        <span className="text-3xl font-black leading-none tracking-[-0.08em] text-[#f5d77d]">{String(index + 1).padStart(2, '0')}</span>
      </div>
      <div className="p-5">
        {editing ? (
          <div className="space-y-3">
            <input className={input} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
            <select className={input} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as TipCategory })}>
              <option value="meal">Maträtt</option>
              <option value="smoothie">Smoothie</option>
              <option value="supplement">Supplement</option>
              <option value="routine">Rutin</option>
              <option value="training">Träning</option>
              <option value="other">Annat</option>
            </select>
            <textarea rows={7} className={input} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} />
          </div>
        ) : (
          <>
            <h3 className="text-3xl font-black uppercase leading-[0.92] tracking-[-0.07em]">{tip.title}</h3>
            <p className="mt-4 whitespace-pre-line text-sm font-semibold leading-7 text-zinc-600">{tip.body}</p>
          </>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-950/10 pt-4">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">Av {tip.createdBy}</p>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-black text-zinc-500 hover:bg-zinc-200">Avbryt</button>
                <button onClick={save} className="rounded-xl bg-zinc-950 px-3 py-2 text-xs font-black text-white hover:bg-[#99c75b] hover:text-zinc-950">Spara</button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-black text-zinc-500 hover:bg-zinc-200">Ändra</button>
            )}
            <button onClick={onDelete} className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-black text-zinc-400 hover:bg-red-50 hover:text-red-700">Ta bort</button>
          </div>
        </div>
      </div>
    </article>
  );
}

