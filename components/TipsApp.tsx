'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { HealthTip, UserKey } from '@/lib/types';

type LoginUser = { name: string; key: UserKey };
type NavKey = 'shared' | 'robert' | 'erika' | 'tips';

type TipCategory = HealthTip['category'];

const USERS = [
  { name: 'Robert', key: 'robert', password: 'robert26' },
  { name: 'Robert', key: 'robert', password: 'robert 26' },
  { name: 'Erika', key: 'erika', password: 'erika26' },
] as const;

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
  const [loginName, setLoginName] = useState<UserKey>('robert');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [tips, setTips] = useState<HealthTip[]>([]);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let ignore = false;
    void Promise.resolve().then(() => {
      if (ignore) return;
      const saved = window.localStorage.getItem('health-user');
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved) as LoginUser;
        if (parsed?.key === 'robert' || parsed?.key === 'erika') setCurrentUser(parsed);
      } catch {
        window.localStorage.removeItem('health-user');
      }
    });
    return () => {
      ignore = true;
    };
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

  function login() {
    const found = USERS.find((user) => user.key === loginName && user.password === password.trim());
    if (!found) {
      setLoginError('Fel namn eller kod. Testa igen.');
      return;
    }
    const user = { name: found.name, key: found.key } satisfies LoginUser;
    window.localStorage.setItem('health-user', JSON.stringify(user));
    setCurrentUser(user);
    setLoginError('');
  }

  function logout() {
    window.localStorage.removeItem('health-user');
    setCurrentUser(null);
  }

  async function loadTips() {
    const response = await fetch('/api/tips');
    const data = await response.json();
    setTips(data.tips || []);
  }

  async function addTip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') || '').trim();
    const category = String(form.get('category') || 'other') as TipCategory;
    const body = String(form.get('body') || '').trim();
    if (!title || !body) return;

    const response = await fetch('/api/tips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, category, body, createdBy: currentUser.key }),
    });
    if (response.ok) {
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
    return <LoginScreen loginName={loginName} setLoginName={setLoginName} password={password} setPassword={setPassword} login={login} loginError={loginError} />;
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
                <article key={tip._id || `${tip.title}-${index}`} className="overflow-hidden rounded-[2rem] border border-zinc-950/10 bg-white shadow-[0_16px_45px_rgba(24,24,27,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(24,24,27,0.10)]">
                  <div className="flex items-center justify-between bg-zinc-950 p-4 text-white">
                    <span className="rounded-full bg-[#99c75b] px-3 py-1 text-xs font-black uppercase text-zinc-950">{categoryLabels[tip.category]}</span>
                    <span className="text-3xl font-black leading-none tracking-[-0.08em] text-[#f5d77d]">{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <div className="p-5">
                    <h3 className="text-3xl font-black uppercase leading-[0.92] tracking-[-0.07em]">{tip.title}</h3>
                    <p className="mt-4 whitespace-pre-line text-sm font-semibold leading-7 text-zinc-600">{tip.body}</p>
                    <div className="mt-6 flex items-center justify-between gap-3 border-t border-zinc-950/10 pt-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">Av {tip.createdBy}</p>
                      <button onClick={() => deleteTip(tip._id)} className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-black text-zinc-400 hover:bg-red-50 hover:text-red-700">Ta bort</button>
                    </div>
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

function LoginScreen({ loginName, setLoginName, password, setPassword, login, loginError }: {
  loginName: UserKey;
  setLoginName: (value: UserKey) => void;
  password: string;
  setPassword: (value: string) => void;
  login: () => void;
  loginError: string;
}) {
  return (
    <main className="min-h-screen bg-[#f3f0e8] text-zinc-950">
      <Background />
      <section className="relative z-10 mx-auto grid min-h-screen max-w-7xl place-items-center px-4 py-8">
        <div className="grid w-full overflow-hidden rounded-[2.5rem] border border-zinc-950/10 bg-white/65 shadow-[0_30px_100px_rgba(24,24,27,0.12)] backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative min-h-[560px] overflow-hidden bg-zinc-950 p-7 text-white md:p-12">
            <div className="absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-[#99c75b] blur-3xl" />
            <p className="text-xs font-black uppercase tracking-[0.42em] text-[#99c75b]">Robert & Erika</p>
            <h1 className="mt-8 max-w-2xl text-6xl font-black uppercase leading-[0.82] tracking-[-0.08em] md:text-8xl">Health<br />tips<br />2026</h1>
            <p className="mt-8 max-w-xl text-lg font-semibold leading-8 text-white/58">Logga in och spara gemensamma tips för mat, träning och hälsa.</p>
          </div>
          <div className="p-5 md:p-9">
            <div className="flex h-full flex-col justify-between rounded-[2rem] bg-[#f5d77d] p-6 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.10)] md:p-8">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.36em] text-zinc-950/45">Login</p>
                <h2 className="mt-4 text-5xl font-black uppercase leading-[0.86] tracking-[-0.07em] md:text-6xl">Open app</h2>
                <div className="mt-8 space-y-4">
                  <select value={loginName} onChange={(event) => setLoginName(event.target.value as UserKey)} className="w-full rounded-2xl border border-zinc-950/10 bg-white px-4 py-4 font-black outline-none focus:ring-4 focus:ring-zinc-950/10">
                    <option value="robert">Robert</option>
                    <option value="erika">Erika</option>
                  </select>
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && login()} className="w-full rounded-2xl border border-zinc-950/10 bg-white px-4 py-4 font-black outline-none placeholder:text-zinc-400 focus:ring-4 focus:ring-zinc-950/10" placeholder="Kod" />
                  {loginError && <p className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white">{loginError}</p>}
                  <button onClick={login} className={`${blackButton} w-full py-4`}>Logga in</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function SideNav({ currentUser, active, logout }: { currentUser: LoginUser; active: NavKey; logout: () => void }) {
  const links = [
    { href: '/', label: 'Gemensam', key: 'shared' as NavKey },
    { href: '/robert', label: 'Robert', key: 'robert' as NavKey },
    { href: '/erika', label: 'Erika', key: 'erika' as NavKey },
    { href: '/tips', label: 'Hälsotips', key: 'tips' as NavKey },
  ];

  return (
    <aside className="xl:sticky xl:top-5 xl:h-[calc(100vh-2.5rem)]">
      <div className={`${softCard} flex h-full flex-col p-4`}>
        <Link href="/" className="overflow-hidden rounded-[1.8rem] bg-zinc-950 p-5 text-white">
          <p className="text-xs font-black uppercase tracking-[0.32em] text-[#99c75b]">health</p>
          <p className="mt-3 text-4xl font-black uppercase leading-[0.82] tracking-[-0.07em]">Food<br />flow</p>
        </Link>
        <div className="mt-4 rounded-[1.5rem] bg-[#f5d77d] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-950/45">Inloggad</p>
          <p className="mt-1 text-2xl font-black tracking-[-0.05em]">{currentUser.name}</p>
        </div>
        <nav className="mt-4 grid gap-2">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={`flex items-center justify-between rounded-2xl px-4 py-4 text-sm font-black transition ${active === link.key ? 'bg-zinc-950 text-white shadow-[0_12px_28px_rgba(24,24,27,0.18)]' : 'bg-white/60 text-zinc-500 hover:bg-white hover:text-zinc-950'}`}>
              <span>{link.label}</span>
              <span className={`h-2 w-2 rounded-full ${active === link.key ? 'bg-[#99c75b]' : 'bg-zinc-950/15'}`} />
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-4">
          <button onClick={logout} className="w-full rounded-2xl bg-white/60 px-4 py-4 text-sm font-black text-zinc-500 transition hover:bg-white hover:text-zinc-950">Logga ut</button>
        </div>
      </div>
    </aside>
  );
}
