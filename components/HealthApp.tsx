'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { Activity, Meal, MealPlan, PlanLength, PlanOwner, SavedMealPlan, UserKey } from '@/lib/types';

type LoginUser = { name: string; key: UserKey };

const USERS = [
  { name: 'Robert', key: 'robert', password: 'robert26' },
  { name: 'Robert', key: 'robert', password: 'robert 26' },
  { name: 'Erika', key: 'erika', password: 'erika26' },
] as const;

const ownerLabel: Record<PlanOwner, string> = {
  shared: 'Gemensam plan',
  robert: 'Roberts plan',
  erika: 'Erikas plan',
};

const ownerIntro: Record<PlanOwner, string> = {
  shared: 'Ert gemensamma upplägg för dagen, veckan eller en plan som fortsätter tills ni ändrar den.',
  robert: 'Din egen mat och träning, men Erika kan fortfarande se planen.',
  erika: 'Din egen mat och träning, men Robert kan fortfarande se planen.',
};

const lengthLabel: Record<PlanLength, string> = {
  day: '1 dag',
  week: '1 vecka',
  ongoing: 'Pågående',
};

const defaultMeals = ['Frukost', 'Lunch', 'Mellis', 'Middag'];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function uid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseItems(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function mealText(items: string[]) {
  return items.join(', ');
}

function emptyPlan(owner: PlanOwner, date: string): MealPlan {
  return {
    owner,
    title: owner === 'shared' ? 'Vår gemensamma matplan' : owner === 'robert' ? 'Roberts matplan' : 'Erikas matplan',
    date,
    length: 'day',
    meals: defaultMeals.map((title) => ({ id: uid(), title, items: [], completedBy: {} })),
  };
}

function cloneMeals(meals: Meal[]) {
  return meals.map((meal) => ({ ...meal, id: uid(), completedBy: {} }));
}

function countFoodItems(plan: MealPlan) {
  return plan.meals.reduce((sum, meal) => sum + meal.items.length, 0);
}

function completionPercent(plan: MealPlan, user: UserKey) {
  const filledMeals = plan.meals.filter((meal) => meal.items.length > 0);
  if (!filledMeals.length) return 0;
  const completed = filledMeals.filter((meal) => meal.completedBy[user]).length;
  return Math.round((completed / filledMeals.length) * 100);
}

export default function HealthApp({ owner }: { owner: PlanOwner }) {
  const [currentUser, setCurrentUser] = useState<LoginUser | null>(null);
  const [loginName, setLoginName] = useState<UserKey>('robert');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [selectedDate, setSelectedDate] = useState(today());
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [templates, setTemplates] = useState<SavedMealPlan[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityTitle, setActivityTitle] = useState('');
  const [activityTime, setActivityTime] = useState('');
  const [activityComment, setActivityComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('health-user');
    if (saved) setCurrentUser(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    loadPlans(selectedDate);
    loadTemplates();
    loadActivities(selectedDate);
  }, [currentUser, selectedDate]);

  const plan = useMemo(() => plans.find((item) => item.owner === owner) || emptyPlan(owner, selectedDate), [plans, owner, selectedDate]);
  const ownerActivities = activities.filter((activity) => activity.owner === owner);

  const allPlans = useMemo(() => {
    const map = new Map<PlanOwner, MealPlan>();
    (['shared', 'robert', 'erika'] as PlanOwner[]).forEach((key) => {
      map.set(key, plans.find((item) => item.owner === key) || emptyPlan(key, selectedDate));
    });
    return map;
  }, [plans, selectedDate]);

  const canEdit = owner === 'shared' || owner === currentUser?.key;

  async function loadPlans(date: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/plans?date=${date}`);
      const data = await res.json();
      setPlans(data.plans || []);
    } finally {
      setLoading(false);
    }
  }

  async function loadTemplates() {
    const res = await fetch('/api/templates');
    const data = await res.json();
    setTemplates(data.templates || []);
  }

  async function loadActivities(date: string) {
    const res = await fetch(`/api/activities?date=${date}`);
    const data = await res.json();
    setActivities(data.activities || []);
  }

  function login() {
    const found = USERS.find((user) => user.key === loginName && user.password === password.trim());
    if (!found) {
      setLoginError('Fel namn eller kod. Testa igen.');
      return;
    }

    const user = { name: found.name, key: found.key } satisfies LoginUser;
    localStorage.setItem('health-user', JSON.stringify(user));
    setCurrentUser(user);
    setLoginError('');
  }

  function logout() {
    localStorage.removeItem('health-user');
    setCurrentUser(null);
    setPassword('');
  }

  function updateInMemory(updater: (mealPlan: MealPlan) => MealPlan) {
    const updated = updater(plan);
    setPlans((current) => [...current.filter((item) => item.owner !== owner), updated]);
  }

  function updateMeal(mealId: string, patch: Partial<Meal>) {
    updateInMemory((mealPlan) => ({
      ...mealPlan,
      meals: mealPlan.meals.map((meal) => (meal.id === mealId ? { ...meal, ...patch } : meal)),
    }));
  }

  function addMeal() {
    updateInMemory((mealPlan) => ({
      ...mealPlan,
      meals: [...mealPlan.meals, { id: uid(), title: 'Ny måltid', items: [], completedBy: {} }],
    }));
  }

  function removeMeal(mealId: string) {
    updateInMemory((mealPlan) => ({ ...mealPlan, meals: mealPlan.meals.filter((meal) => meal.id !== mealId) }));
  }

  function toggleComplete(mealId: string, user: UserKey) {
    updateInMemory((mealPlan) => ({
      ...mealPlan,
      meals: mealPlan.meals.map((meal) =>
        meal.id === mealId ? { ...meal, completedBy: { ...meal.completedBy, [user]: !meal.completedBy[user] } } : meal
      ),
    }));
  }

  async function savePlan(nextPlan = plan) {
    const payload = { ...nextPlan, date: selectedDate };
    const res = await fetch(nextPlan._id ? `/api/plans/${nextPlan._id}` : '/api/plans', {
      method: nextPlan._id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      flash('Kunde inte spara matplanen.');
      return;
    }

    await loadPlans(selectedDate);
    flash('Matplanen är sparad.');
  }

  async function deletePlan() {
    if (!plan._id) return;
    await fetch(`/api/plans/${plan._id}`, { method: 'DELETE' });
    await loadPlans(selectedDate);
    flash('Dagens plan är rensad.');
  }

  async function saveAsTemplate() {
    if (!currentUser) return;
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner: plan.owner, title: plan.title, length: plan.length, meals: plan.meals, createdBy: currentUser.key }),
    });

    if (!res.ok) {
      flash('Kunde inte spara matplanen.');
      return;
    }

    await loadTemplates();
    flash('Sparad som återanvändbar matplan.');
  }

  async function useTemplate(template: SavedMealPlan) {
    const nextPlan: MealPlan = {
      ...plan,
      title: template.title,
      length: template.length,
      meals: cloneMeals(template.meals),
      date: selectedDate,
    };
    setPlans((current) => [...current.filter((item) => item.owner !== owner), nextPlan]);
    await savePlan(nextPlan);
  }

  async function deleteTemplate(id?: string) {
    if (!id) return;
    await fetch(`/api/templates/${id}`, { method: 'DELETE' });
    await loadTemplates();
  }

  async function addActivity() {
    if (!currentUser || !activityTitle.trim()) return;
    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner,
        date: selectedDate,
        title: activityTitle,
        time: activityTime,
        comment: activityComment,
        completedBy: {},
        createdBy: currentUser.key,
      }),
    });

    if (res.ok) {
      setActivityTitle('');
      setActivityTime('');
      setActivityComment('');
      await loadActivities(selectedDate);
      flash('Aktiviteten är tillagd.');
    }
  }

  async function toggleActivity(activity: Activity, user: UserKey) {
    if (!activity._id) return;
    await fetch(`/api/activities/${activity._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completedBy: { ...activity.completedBy, [user]: !activity.completedBy[user] } }),
    });
    await loadActivities(selectedDate);
  }

  async function deleteActivity(id?: string) {
    if (!id) return;
    await fetch(`/api/activities/${id}`, { method: 'DELETE' });
    await loadActivities(selectedDate);
  }

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(''), 2600);
  }

  if (!currentUser) {
    return <LoginScreen loginName={loginName} setLoginName={setLoginName} password={password} setPassword={setPassword} login={login} loginError={loginError} />;
  }

  const ownerTemplates = templates.filter((template) => template.owner === owner);

  return (
    <main className="min-h-screen bg-[#121212] text-white">
      <div className="grid min-h-screen xl:grid-cols-[280px_minmax(0,1fr)_390px]">
        <SideNav currentUser={currentUser} owner={owner} logout={logout} />

        <section className="border-x border-white/5 px-4 py-5 md:px-8 md:py-8 xl:px-12">
          <TopBar selectedDate={selectedDate} setSelectedDate={setSelectedDate} owner={owner} />
          {message && <div className="mt-5 rounded-[1.4rem] bg-amber-300 px-5 py-4 font-black text-zinc-950 shadow-[0_16px_50px_rgba(251,191,36,0.25)]">{message}</div>}
          {loading && <div className="mt-5 rounded-[1.4rem] bg-white/10 px-5 py-4 font-bold text-white/60">Laddar...</div>}

          <HeroPanel owner={owner} plan={plan} selectedDate={selectedDate} currentUser={currentUser} />

          <FoodPlanner
            plan={plan}
            canEdit={canEdit}
            currentUser={currentUser.key}
            onTitle={(title) => updateInMemory((mealPlan) => ({ ...mealPlan, title }))}
            onLength={(length) => updateInMemory((mealPlan) => ({ ...mealPlan, length }))}
            onUpdateMeal={updateMeal}
            onAddMeal={addMeal}
            onRemoveMeal={removeMeal}
            onToggleComplete={toggleComplete}
            onSave={() => savePlan()}
            onDelete={deletePlan}
            onSaveAsTemplate={saveAsTemplate}
          />
        </section>

        <aside className="space-y-5 px-4 py-5 md:px-8 md:py-8 xl:px-7">
          <ProgressPanel plan={plan} activities={ownerActivities} />
          <TrainingPanel
            owner={owner}
            currentUser={currentUser.key}
            activities={ownerActivities}
            title={activityTitle}
            time={activityTime}
            comment={activityComment}
            setTitle={setActivityTitle}
            setTime={setActivityTime}
            setComment={setActivityComment}
            addActivity={addActivity}
            toggleActivity={toggleActivity}
            deleteActivity={deleteActivity}
          />
          <SavedPlansPanel templates={ownerTemplates} onUse={useTemplate} onDelete={deleteTemplate} />
          {owner === 'shared' && <BothPlansPanel plans={allPlans} />}
        </aside>
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
    <main className="grid min-h-screen place-items-center bg-[#121212] px-4 py-10 text-white">
      <section className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] bg-[#202020] shadow-[0_40px_120px_rgba(0,0,0,0.45)] lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative p-8 md:p-12">
          <div className="absolute right-8 top-8 hidden h-32 w-32 rounded-full bg-amber-300 blur-3xl md:block" />
          <p className="text-sm font-black uppercase tracking-[0.35em] text-amber-300">Health 2026</p>
          <h1 className="mt-8 max-w-2xl text-5xl font-black leading-[0.9] tracking-tight md:text-7xl">Nu tar vi hälsan till nästa nivå.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/55">Matplaner, träning, checkmarks och sparade upplägg för Robert & Erika.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {['Matplan', 'Träning', 'Hälsotips'].map((item) => (
              <div key={item} className="rounded-[1.5rem] bg-[#2b2b2b] p-5 ring-1 ring-white/5">
                <p className="text-3xl">✓</p>
                <p className="mt-5 font-black">{item}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#272727] p-6 md:p-10">
          <div className="rounded-[1.8rem] bg-[#181818] p-6 ring-1 ring-white/10 md:p-8">
            <h2 className="text-3xl font-black">Logga in</h2>
            <div className="mt-6 space-y-4">
              <select value={loginName} onChange={(event) => setLoginName(event.target.value as UserKey)} className="w-full rounded-2xl border-0 bg-[#2f2f2f] px-4 py-4 font-bold text-white outline-none ring-1 ring-white/10 focus:ring-4 focus:ring-amber-300/30">
                <option value="robert">Robert</option>
                <option value="erika">Erika</option>
              </select>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && login()} className="w-full rounded-2xl border-0 bg-[#2f2f2f] px-4 py-4 font-bold text-white outline-none ring-1 ring-white/10 focus:ring-4 focus:ring-amber-300/30" placeholder="Kod" />
              {loginError && <p className="rounded-2xl bg-rose-500/15 px-4 py-3 font-bold text-rose-100">{loginError}</p>}
              <button onClick={login} className="w-full rounded-2xl bg-amber-300 px-5 py-4 font-black text-zinc-950 transition hover:-translate-y-0.5 hover:bg-amber-200">Öppna appen</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function SideNav({ currentUser, owner, logout }: { currentUser: LoginUser; owner: PlanOwner; logout: () => void }) {
  const links = [
    { href: '/', label: 'Gemensam', key: 'shared' },
    { href: '/robert', label: 'Robert', key: 'robert' },
    { href: '/erika', label: 'Erika', key: 'erika' },
    { href: '/tips', label: 'Hälsotips', key: 'tips' },
  ];

  return (
    <aside className="sticky top-0 z-20 border-b border-white/5 bg-[#242424] p-4 xl:h-screen xl:border-b-0 xl:p-6">
      <div className="flex items-center justify-between gap-4 xl:block">
        <Link href="/" className="flex items-center gap-3 text-2xl font-black tracking-tight">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-300 text-zinc-950">⚡</span>
          Healthodo
        </Link>
        <button onClick={logout} className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white/80 xl:hidden">Ut</button>
      </div>

      <div className="mt-6 hidden rounded-[1.5rem] bg-[#181818] p-4 ring-1 ring-white/5 xl:block">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-white/35">Inloggad</p>
        <p className="mt-2 text-2xl font-black">{currentUser.name}</p>
      </div>

      <nav className="mt-5 grid grid-cols-4 gap-2 xl:grid-cols-1">
        {links.map((link) => {
          const active = link.key === owner || (link.key === 'tips' && false);
          return (
            <Link key={link.href} href={link.href} className={`rounded-[1.2rem] px-3 py-3 text-center text-sm font-black transition xl:text-left ${active ? 'bg-amber-300 text-zinc-950' : 'bg-transparent text-white/65 hover:bg-white/10 hover:text-white'}`}>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <button onClick={logout} className="mt-6 hidden w-full rounded-[1.2rem] bg-white/10 px-4 py-3 font-black text-white/70 transition hover:bg-white/15 xl:block">Logga ut</button>
    </aside>
  );
}

function TopBar({ selectedDate, setSelectedDate, owner }: { selectedDate: string; setSelectedDate: (value: string) => void; owner: PlanOwner }) {
  const date = new Date(`${selectedDate}T12:00:00`);
  const month = date.toLocaleDateString('sv-SE', { month: 'short' });
  const day = date.getDate();

  return (
    <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="flex items-center gap-5">
        <div className="text-center font-black leading-none">
          <p className="text-3xl capitalize text-amber-300">{month}</p>
          <p className="text-5xl">{day}</p>
        </div>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-white/35">{ownerLabel[owner]}</p>
          <h1 className="mt-1 text-4xl font-black tracking-tight md:text-6xl">Plan för idag</h1>
        </div>
      </div>
      <label className="rounded-[1.3rem] bg-[#242424] p-2 ring-1 ring-white/5">
        <span className="px-2 text-[11px] font-black uppercase tracking-widest text-white/35">Datum</span>
        <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="block rounded-xl bg-[#181818] px-3 py-2 font-black text-white outline-none" />
      </label>
    </header>
  );
}

function HeroPanel({ owner, plan, selectedDate, currentUser }: { owner: PlanOwner; plan: MealPlan; selectedDate: string; currentUser: LoginUser }) {
  return (
    <section className="mt-8 overflow-hidden rounded-[2rem] bg-[#202020] shadow-[0_30px_90px_rgba(0,0,0,0.25)] ring-1 ring-white/5">
      <div className="grid lg:grid-cols-[1fr_260px]">
        <div className="p-6 md:p-8">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-amber-300">{lengthLabel[plan.length]} · {selectedDate}</p>
          <h2 className="mt-4 max-w-3xl text-4xl font-black leading-[0.95] tracking-tight md:text-6xl">{plan.title}</h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/50">{ownerIntro[owner]}</p>
        </div>
        <div className="grid place-items-stretch bg-[#2b2b2b] p-5">
          <div className="rounded-[1.6rem] bg-[#181818] p-5 ring-1 ring-white/5">
            <p className="text-sm font-black text-white/40">Dagens energi</p>
            <p className="mt-4 text-5xl font-black text-amber-300">{countFoodItems(plan)}</p>
            <p className="mt-2 text-sm font-bold text-white/45">matpunkter i planen</p>
            <p className="mt-6 rounded-2xl bg-white/5 px-4 py-3 font-black text-white/70">{currentUser.name} är inne</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FoodPlanner({ plan, canEdit, currentUser, onTitle, onLength, onUpdateMeal, onAddMeal, onRemoveMeal, onToggleComplete, onSave, onDelete, onSaveAsTemplate }: {
  plan: MealPlan;
  canEdit: boolean;
  currentUser: UserKey;
  onTitle: (title: string) => void;
  onLength: (length: PlanLength) => void;
  onUpdateMeal: (mealId: string, patch: Partial<Meal>) => void;
  onAddMeal: () => void;
  onRemoveMeal: (mealId: string) => void;
  onToggleComplete: (mealId: string, user: UserKey) => void;
  onSave: () => void;
  onDelete: () => void;
  onSaveAsTemplate: () => void;
}) {
  return (
    <section className="mt-6 rounded-[2rem] bg-[#202020] p-4 ring-1 ring-white/5 md:p-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_190px]">
        <label>
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.24em] text-white/35">Namn på matplan</span>
          <input disabled={!canEdit} value={plan.title} onChange={(event) => onTitle(event.target.value)} className="w-full rounded-[1.3rem] border-0 bg-[#2b2b2b] px-5 py-4 text-xl font-black text-white outline-none ring-1 ring-white/5 focus:ring-4 focus:ring-amber-300/20 disabled:text-white/35" placeholder="T.ex. Roberts ägg-vecka" />
        </label>
        <label>
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.24em] text-white/35">Typ</span>
          <select disabled={!canEdit} value={plan.length} onChange={(event) => onLength(event.target.value as PlanLength)} className="w-full rounded-[1.3rem] border-0 bg-[#2b2b2b] px-5 py-4 font-black text-white outline-none ring-1 ring-white/5 focus:ring-4 focus:ring-amber-300/20 disabled:text-white/35">
            <option value="day">1 dag</option>
            <option value="week">1 vecka</option>
            <option value="ongoing">Pågående</option>
          </select>
        </label>
      </div>

      <div className="mt-5 space-y-4">
        {plan.meals.map((meal) => (
          <article key={meal.id} className="group rounded-[1.6rem] bg-[#282828] p-4 ring-1 ring-white/5 transition hover:bg-[#303030] md:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <input disabled={!canEdit} value={meal.title} onChange={(event) => onUpdateMeal(meal.id, { title: event.target.value })} className="w-full rounded-2xl border-0 bg-[#1b1b1b] px-4 py-3 text-lg font-black text-white outline-none ring-1 ring-white/5 focus:ring-4 focus:ring-amber-300/20 disabled:text-white/35" />
                  {canEdit && <button onClick={() => onRemoveMeal(meal.id)} className="rounded-2xl bg-rose-500/10 px-3 py-3 text-sm font-black text-rose-200 ring-1 ring-rose-500/20">×</button>}
                </div>
                <textarea disabled={!canEdit} value={mealText(meal.items)} onChange={(event) => onUpdateMeal(meal.id, { items: parseItems(event.target.value) })} className="mt-3 min-h-24 w-full resize-y rounded-2xl border-0 bg-[#1b1b1b] px-4 py-3 font-semibold leading-7 text-white/80 outline-none ring-1 ring-white/5 focus:ring-4 focus:ring-amber-300/20 disabled:text-white/35" placeholder="Skriv med komma: 3 ägg, kaffe, grapefruit" />
                {meal.items.length > 0 && (
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {meal.items.map((item, index) => (
                      <li key={`${item}-${index}`} className="rounded-2xl bg-[#1b1b1b] px-4 py-3 font-bold text-white/75 ring-1 ring-white/5">{item}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:w-32 lg:grid-cols-1">
                {(['robert', 'erika'] as UserKey[]).map((user) => (
                  <button key={user} onClick={() => onToggleComplete(meal.id, user)} disabled={!canEdit && currentUser !== user} className={`rounded-2xl px-4 py-3 text-sm font-black transition ${meal.completedBy[user] ? 'bg-amber-300 text-zinc-950' : 'bg-[#1b1b1b] text-white/50 ring-1 ring-white/5 hover:text-white'}`}>
                    {meal.completedBy[user] ? '✓ ' : ''}{user}
                  </button>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {canEdit && <button onClick={onAddMeal} className="rounded-[1.2rem] bg-white/10 px-5 py-4 font-black text-white hover:bg-white/15">+ Måltid</button>}
        {canEdit && <button onClick={onSave} className="rounded-[1.2rem] bg-amber-300 px-5 py-4 font-black text-zinc-950 hover:bg-amber-200">Spara plan</button>}
        {canEdit && <button onClick={onSaveAsTemplate} className="rounded-[1.2rem] bg-emerald-400 px-5 py-4 font-black text-zinc-950 hover:bg-emerald-300">Spara mall</button>}
        {canEdit && plan._id && <button onClick={onDelete} className="rounded-[1.2rem] bg-rose-500/15 px-5 py-4 font-black text-rose-100 ring-1 ring-rose-500/20">Rensa</button>}
      </div>
    </section>
  );
}

function ProgressPanel({ plan, activities }: { plan: MealPlan; activities: Activity[] }) {
  const robert = completionPercent(plan, 'robert');
  const erika = completionPercent(plan, 'erika');
  const doneActivities = activities.filter((activity) => activity.completedBy.robert || activity.completedBy.erika).length;

  return (
    <section className="rounded-[2rem] bg-[#242424] p-5 ring-1 ring-white/5">
      <h3 className="text-2xl font-black">Status</h3>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat label="Robert mat" value={`${robert}%`} />
        <Stat label="Erika mat" value={`${erika}%`} />
        <Stat label="Matpunkter" value={String(countFoodItems(plan))} />
        <Stat label="Träning" value={`${doneActivities}/${activities.length}`} />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.3rem] bg-[#181818] p-4 ring-1 ring-white/5">
      <p className="text-xs font-black uppercase tracking-wider text-white/35">{label}</p>
      <p className="mt-2 text-3xl font-black text-amber-300">{value}</p>
    </div>
  );
}

function TrainingPanel({ owner, currentUser, activities, title, time, comment, setTitle, setTime, setComment, addActivity, toggleActivity, deleteActivity }: {
  owner: PlanOwner;
  currentUser: UserKey;
  activities: Activity[];
  title: string;
  time: string;
  comment: string;
  setTitle: (value: string) => void;
  setTime: (value: string) => void;
  setComment: (value: string) => void;
  addActivity: () => void;
  toggleActivity: (activity: Activity, user: UserKey) => void;
  deleteActivity: (id?: string) => void;
}) {
  return (
    <section className="rounded-[2rem] bg-[#242424] p-5 ring-1 ring-white/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-300">Training</p>
          <h3 className="mt-1 text-2xl font-black">Aktivitet</h3>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/45">{ownerLabel[owner]}</span>
      </div>

      <div className="mt-5 space-y-3">
        <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-2xl border-0 bg-[#181818] px-4 py-3 font-bold text-white outline-none ring-1 ring-white/5 focus:ring-4 focus:ring-amber-300/20" placeholder="Running, dancing, gym..." />
        <input value={time} onChange={(event) => setTime(event.target.value)} className="w-full rounded-2xl border-0 bg-[#181818] px-4 py-3 font-bold text-white outline-none ring-1 ring-white/5 focus:ring-4 focus:ring-amber-300/20" placeholder="Tid: 30 min / 18:00" />
        <textarea value={comment} onChange={(event) => setComment(event.target.value)} className="min-h-20 w-full rounded-2xl border-0 bg-[#181818] px-4 py-3 font-semibold text-white outline-none ring-1 ring-white/5 focus:ring-4 focus:ring-amber-300/20" placeholder="Kommentar: lätt pass, stretch, känsla..." />
        <button onClick={addActivity} className="w-full rounded-2xl bg-amber-300 px-4 py-3 font-black text-zinc-950 hover:bg-amber-200">+ Lägg till aktivitet</button>
      </div>

      <div className="mt-5 space-y-3">
        {activities.length ? activities.map((activity) => (
          <article key={activity._id} className="rounded-[1.4rem] bg-[#181818] p-4 ring-1 ring-white/5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-black">{activity.title}</h4>
                {activity.time && <p className="mt-1 text-sm font-bold text-amber-300">{activity.time}</p>}
                {activity.comment && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-white/45">{activity.comment}</p>}
              </div>
              <button onClick={() => deleteActivity(activity._id)} className="rounded-xl bg-white/5 px-3 py-2 text-xs font-black text-white/40 hover:text-rose-200">×</button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(['robert', 'erika'] as UserKey[]).map((user) => (
                <button key={user} onClick={() => toggleActivity(activity, user)} className={`rounded-xl px-3 py-2 text-xs font-black ${activity.completedBy[user] ? 'bg-amber-300 text-zinc-950' : 'bg-white/5 text-white/45'}`}>
                  {activity.completedBy[user] ? '✓ ' : ''}{user}
                </button>
              ))}
            </div>
          </article>
        )) : <p className="rounded-2xl bg-[#181818] px-4 py-4 font-bold text-white/35">Inga aktiviteter än. Lägg in dans, löpning eller något eget.</p>}
      </div>
    </section>
  );
}

function SavedPlansPanel({ templates, onUse, onDelete }: { templates: SavedMealPlan[]; onUse: (template: SavedMealPlan) => void; onDelete: (id?: string) => void }) {
  return (
    <section className="rounded-[2rem] bg-[#242424] p-5 ring-1 ring-white/5">
      <h3 className="text-2xl font-black">Sparade matplaner</h3>
      <p className="mt-2 text-sm leading-6 text-white/40">Spara ägg-vecka, smoothie-dag eller andra upplägg och använd igen.</p>
      <div className="mt-5 space-y-3">
        {templates.length ? templates.map((template) => (
          <article key={template._id} className="rounded-[1.4rem] bg-[#181818] p-4 ring-1 ring-white/5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-amber-300">{lengthLabel[template.length]}</p>
                <h4 className="mt-1 font-black">{template.title}</h4>
                <p className="mt-1 text-sm text-white/35">{template.meals.reduce((sum, meal) => sum + meal.items.length, 0)} matpunkter</p>
              </div>
              <button onClick={() => onDelete(template._id)} className="rounded-xl bg-white/5 px-3 py-2 text-xs font-black text-white/40 hover:text-rose-200">×</button>
            </div>
            <button onClick={() => onUse(template)} className="mt-3 w-full rounded-2xl bg-white/10 px-4 py-3 font-black text-white hover:bg-amber-300 hover:text-zinc-950">Använd igen</button>
          </article>
        )) : <p className="rounded-2xl bg-[#181818] px-4 py-4 font-bold text-white/35">Inga sparade matplaner än.</p>}
      </div>
    </section>
  );
}

function BothPlansPanel({ plans }: { plans: Map<PlanOwner, MealPlan> }) {
  return (
    <section className="rounded-[2rem] bg-[#242424] p-5 ring-1 ring-white/5">
      <h3 className="text-2xl font-black">Egna planer</h3>
      <div className="mt-4 space-y-3">
        {(['robert', 'erika'] as PlanOwner[]).map((key) => {
          const plan = plans.get(key);
          return (
            <div key={key} className="rounded-[1.4rem] bg-[#181818] p-4 ring-1 ring-white/5">
              <p className="font-black">{ownerLabel[key]}</p>
              <p className="mt-1 text-sm text-white/40">{plan?.title}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
