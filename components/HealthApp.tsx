'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  Activity,
  DayPlanKind,
  Meal,
  MealPlan,
  PlanLength,
  PlanOwner,
  SavedActivity,
  SavedDayPlan,
  SavedMeal,
  SavedMealPlan,
  SavedWeekPlan,
  UserKey,
  WeekDayTemplate,
} from '@/lib/types';

type LoginUser = { name: string; key: UserKey };
type Toast = { id: number; text: string; type?: 'good' | 'bad' } | null;
type Tab = 'today' | 'calendar' | 'bank' | 'training';
type CalendarDay = { date: string; inMonth: boolean; day: number; hasMeals: boolean; hasActivities: boolean; completedMeals: number; totalMeals: number; completedActivities: number; totalActivities: number };

const USERS = [
  { name: 'Robert', key: 'robert', password: 'robert26' },
  { name: 'Robert', key: 'robert', password: 'robert 26' },
  { name: 'Erika', key: 'erika', password: 'erika26' },
] as const;

const ownerLabel: Record<PlanOwner, string> = { shared: 'Gemensam', robert: 'Robert', erika: 'Erika' };
const lengthLabel: Record<PlanLength, string> = { day: 'Dag', week: 'Vecka', ongoing: 'Pågående' };
const kindLabel: Record<DayPlanKind, string> = { food: 'Mat', training: 'Träning', full: 'Mat + träning' };
const weekdays = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
const defaultMeals = [
  { title: 'Frukost', time: '08:00', items: ['Ägg', 'Kaffe', 'Grapefruit'] },
  { title: 'Lunch', time: '12:00', items: [] },
  { title: 'Mellis', time: '15:00', items: [] },
  { title: 'Middag', time: '18:00', items: [] },
];

const input = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-500';
const darkInput = 'w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/40 focus:ring-4 focus:ring-emerald-300/10 disabled:text-white/35 [color-scheme:dark]';
const button = 'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45';
const primaryButton = `${button} bg-white text-slate-950 shadow-xl shadow-black/20 hover:-translate-y-0.5 hover:bg-emerald-100`;
const greenButton = `${button} bg-emerald-300 text-slate-950 shadow-xl shadow-emerald-950/20 hover:-translate-y-0.5 hover:bg-emerald-200`;
const softButton = `${button} border border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50`;
const softDarkButton = `${button} border border-white/10 bg-white/[0.07] text-white/70 hover:-translate-y-0.5 hover:bg-white/[0.12] hover:text-white`;
const dangerButton = `${button} border border-rose-300/20 bg-rose-400/12 text-rose-100 hover:-translate-y-0.5 hover:bg-rose-400/20`;
const miniButton = 'rounded-xl border px-3 py-2 text-xs font-black transition disabled:opacity-40';
const card = 'rounded-[2rem] border border-white/10 bg-white/[0.08] shadow-[0_28px_100px_rgba(0,0,0,0.28)] backdrop-blur-2xl';

function today() { return new Date().toISOString().slice(0, 10); }
function uid() { return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function toDate(value: string) { return new Date(`${value}T12:00:00`); }
function iso(date: Date) { return date.toISOString().slice(0, 10); }
function parseItems(value: string) { return value.split(/,|\n/).map((item) => item.trim()).filter(Boolean); }
function itemsToText(items: string[]) { return items.join('\n'); }
function formatDate(value: string) { return toDate(value).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' }); }
function monthLabel(value: string) { return toDate(value).toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' }); }
function addDays(value: string, days: number) { const date = toDate(value); date.setDate(date.getDate() + days); return iso(date); }
function monthStart(value: string) { const date = toDate(value); date.setDate(1); return iso(date); }
function prevMonth(value: string) { const date = toDate(value); date.setMonth(date.getMonth() - 1, 1); return iso(date); }
function nextMonth(value: string) { const date = toDate(value); date.setMonth(date.getMonth() + 1, 1); return iso(date); }
function mondayOf(value: string) { const date = toDate(value); const day = date.getDay() || 7; date.setDate(date.getDate() - day + 1); return iso(date); }
function cleanMeal(meal: Meal): Meal { return { ...meal, id: meal.id || uid(), title: meal.title?.trim() || 'Ny måltid', time: meal.time?.trim() || '', items: Array.isArray(meal.items) ? meal.items.map((i) => i.trim()).filter(Boolean) : [], notes: meal.notes?.trim() || '', completedBy: meal.completedBy || {} }; }
function cleanSavedActivity(activity: Partial<SavedActivity>): SavedActivity { return { owner: (activity.owner || 'shared') as PlanOwner, title: activity.title?.trim() || 'Ny aktivitet', time: activity.time?.trim() || '', comment: activity.comment?.trim() || '', createdBy: (activity.createdBy || 'robert') as UserKey }; }
function emptyPlan(owner: PlanOwner, date: string): MealPlan { return { owner, title: owner === 'shared' ? 'Dagens gemensamma plan' : `${ownerLabel[owner]}s dag`, date, length: 'day', meals: defaultMeals.map((m) => ({ id: uid(), title: m.title, time: m.time, items: m.items, notes: '', completedBy: {} })) }; }
function cloneMeals(meals: Meal[]) { return meals.map((meal) => ({ ...cleanMeal(meal), id: uid(), completedBy: {} })); }
function mealTotal(plan: MealPlan) { return plan.meals.filter((meal) => meal.items.length > 0).length; }
function completedMeals(plan: MealPlan, user: UserKey) { return plan.meals.filter((meal) => meal.items.length > 0 && meal.completedBy[user]).length; }
function activityTotal(activities: Activity[]) { return activities.length; }
function completedActivities(activities: Activity[], user: UserKey) { return activities.filter((activity) => activity.completedBy[user]).length; }
function progress(done: number, total: number) { return total ? Math.round((done / total) * 100) : 0; }
function weekDates(value: string) { const monday = mondayOf(value); return Array.from({ length: 7 }, (_, i) => addDays(monday, i)); }
function calendarRange(monthValue: string) {
  const first = toDate(monthStart(monthValue));
  const firstWeekday = first.getDay() || 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - firstWeekday + 1);
  const start = iso(gridStart);
  const endDate = new Date(gridStart);
  endDate.setDate(gridStart.getDate() + 41);
  return { start, end: iso(endDate) };
}

export default function HealthApp({ owner }: { owner: PlanOwner }) {
  const [currentUser, setCurrentUser] = useState<LoginUser | null>(null);
  const [loginName, setLoginName] = useState<UserKey>('robert');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [selectedDate, setSelectedDate] = useState(today());
  const [calendarMonth, setCalendarMonth] = useState(monthStart(today()));
  const [tab, setTab] = useState<Tab>('today');
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [calendarPlans, setCalendarPlans] = useState<MealPlan[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [calendarActivities, setCalendarActivities] = useState<Activity[]>([]);
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [oldDayTemplates, setOldDayTemplates] = useState<SavedMealPlan[]>([]);
  const [savedActivities, setSavedActivities] = useState<SavedActivity[]>([]);
  const [dayPlans, setDayPlans] = useState<SavedDayPlan[]>([]);
  const [weekPlans, setWeekPlans] = useState<SavedWeekPlan[]>([]);
  const [activityDraft, setActivityDraft] = useState({ title: '', time: '', comment: '' });
  const [mealDraft, setMealDraft] = useState({ title: '', time: '', item: '', notes: '' });
  const [mealModalMode, setMealModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('health-user');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as LoginUser;
      if (parsed?.key === 'robert' || parsed?.key === 'erika') setCurrentUser(parsed);
    } catch { window.localStorage.removeItem('health-user'); }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    setIsBusy(true);
    void refreshData().finally(() => setIsBusy(false));
  }, [currentUser, selectedDate, calendarMonth]);

  const plan = useMemo(() => plans.find((item) => item.owner === owner) || emptyPlan(owner, selectedDate), [plans, owner, selectedDate]);
  const ownerActivities = useMemo(() => activities.filter((activity) => activity.owner === owner), [activities, owner]);
  const canEdit = Boolean(currentUser && (owner === 'shared' || owner === currentUser.key));
  const ownerSavedMeals = savedMeals.filter((meal) => meal.owner === owner);
  const ownerSavedActivities = savedActivities.filter((activity) => activity.owner === owner);
  const ownerDayPlans = dayPlans.filter((dayPlan) => dayPlan.owner === owner);
  const ownerWeekPlans = weekPlans.filter((weekPlan) => weekPlan.owner === owner);
  const ownerOldDayTemplates = oldDayTemplates.filter((template) => template.owner === owner);
  const selectedWeek = weekDates(selectedDate);
  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth, calendarPlans.filter((p) => p.owner === owner), calendarActivities.filter((a) => a.owner === owner), currentUser?.key || 'robert'), [calendarMonth, calendarPlans, calendarActivities, owner, currentUser]);

  async function refreshData() {
    const { start, end } = calendarRange(calendarMonth);
    const [plansRes, calendarPlansRes, activitiesRes, calendarActivitiesRes, oldTemplatesRes, mealsRes, savedActivitiesRes, dayPlansRes, weekPlansRes] = await Promise.all([
      fetch(`/api/plans?date=${selectedDate}`),
      fetch(`/api/plans?start=${start}&end=${end}`),
      fetch(`/api/activities?date=${selectedDate}`),
      fetch(`/api/activities?start=${start}&end=${end}`),
      fetch('/api/templates'),
      fetch('/api/meals'),
      fetch('/api/saved-activities'),
      fetch('/api/day-plans'),
      fetch('/api/week-plans'),
    ]);
    const [plansData, calendarPlansData, activitiesData, calendarActivitiesData, oldTemplatesData, mealsData, savedActivitiesData, dayPlansData, weekPlansData] = await Promise.all([
      plansRes.json(), calendarPlansRes.json(), activitiesRes.json(), calendarActivitiesRes.json(), oldTemplatesRes.json(), mealsRes.json(), savedActivitiesRes.json(), dayPlansRes.json(), weekPlansRes.json(),
    ]);
    setPlans(plansData.plans || []);
    setCalendarPlans(calendarPlansData.plans || []);
    setActivities(activitiesData.activities || []);
    setCalendarActivities(calendarActivitiesData.activities || []);
    setOldDayTemplates(oldTemplatesData.templates || []);
    setSavedMeals(mealsData.meals || []);
    setSavedActivities(savedActivitiesData.activities || []);
    setDayPlans(dayPlansData.dayPlans || []);
    setWeekPlans(weekPlansData.weekPlans || []);
  }

  function showToast(text: string, type: 'good' | 'bad' = 'good') {
    const id = Date.now();
    setToast({ id, text, type });
    window.setTimeout(() => setToast((active) => (active?.id === id ? null : active)), 2600);
  }

  function login() {
    const found = USERS.find((user) => user.key === loginName && user.password === password.trim());
    if (!found) return setLoginError('Fel namn eller kod. Testa igen.');
    const user = { name: found.name, key: found.key } satisfies LoginUser;
    window.localStorage.setItem('health-user', JSON.stringify(user));
    setCurrentUser(user);
    setLoginError('');
  }
  function logout() { window.localStorage.removeItem('health-user'); setCurrentUser(null); setPassword(''); }

  function patchPlan(updater: (mealPlan: MealPlan) => MealPlan) {
    const updated = updater(plan);
    setPlans((current) => [...current.filter((item) => item.owner !== owner), updated]);
  }
  function updateMeal(mealId: string, patch: Partial<Meal>) { patchPlan((p) => ({ ...p, meals: p.meals.map((meal) => meal.id === mealId ? cleanMeal({ ...meal, ...patch }) : meal) })); }
  function addMeal(meal?: Partial<Meal>) { patchPlan((p) => ({ ...p, meals: [...p.meals, cleanMeal({ id: uid(), title: meal?.title || 'Ny måltid', time: meal?.time || '', items: meal?.items || [], notes: meal?.notes || '', completedBy: {} })] })); }
  function openCreateMealModal() {
    setMealDraft({ title: '', time: '', item: '', notes: '' });
    setEditingMealId(null);
    setMealModalMode('create');
  }
  function openEditMealModal(mealId: string) {
    setEditingMealId(mealId);
    setMealModalMode('edit');
  }
  function closeMealModal() {
    setMealModalMode(null);
    setEditingMealId(null);
  }
  function createMealFromDraft() {
    if (!mealDraft.title.trim()) return showToast('Skriv ett namn på måltiden först, till exempel Förmiddags mellanmål.', 'bad');
    addMeal({ title: mealDraft.title, time: mealDraft.time, items: parseItems(mealDraft.item), notes: mealDraft.notes });
    setMealDraft({ title: '', time: '', item: '', notes: '' });
    closeMealModal();
    showToast('Måltiden är tillagd i dagens plan.');
  }
  function removeMeal(mealId: string) { patchPlan((p) => ({ ...p, meals: p.meals.filter((meal) => meal.id !== mealId) })); }
  function toggleMeal(mealId: string) { if (!currentUser) return; patchPlan((p) => ({ ...p, meals: p.meals.map((meal) => meal.id === mealId ? { ...meal, completedBy: { ...meal.completedBy, [currentUser.key]: !meal.completedBy[currentUser.key] } } : meal) })); }

  async function savePlan(nextPlan = plan) {
    const payload = { ...nextPlan, date: selectedDate, meals: nextPlan.meals.map(cleanMeal) };
    const response = await fetch(payload._id ? `/api/plans/${payload._id}` : '/api/plans', { method: payload._id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) return showToast('Kunde inte spara planen.', 'bad');
    await refreshData();
    showToast('Dagens matplan är sparad.');
  }
  async function deletePlan() { if (!plan._id) return; const response = await fetch(`/api/plans/${plan._id}`, { method: 'DELETE' }); if (!response.ok) return showToast('Kunde inte rensa planen.', 'bad'); await refreshData(); showToast('Dagens matplan är rensad.'); }
  async function saveMealTemplate(meal: Meal) {
    if (!currentUser) return;
    const cleaned = cleanMeal(meal);
    if (!cleaned.items.length) return showToast('Lägg in innehåll innan du sparar måltiden.', 'bad');
    const response = await fetch('/api/meals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ owner, title: cleaned.title, time: cleaned.time, items: cleaned.items, notes: cleaned.notes, createdBy: currentUser.key }) });
    if (!response.ok) return showToast('Kunde inte spara måltiden.', 'bad');
    await refreshData();
    showToast(`${cleaned.title} sparad i måltidsbanken.`);
  }
  async function updateMealTemplate(meal: SavedMeal, patch: Partial<SavedMeal>) {
    if (!meal._id) return;
    const response = await fetch(`/api/meals/${meal._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    if (!response.ok) return showToast('Kunde inte uppdatera måltiden.', 'bad');
    await refreshData();
    showToast('Måltiden är uppdaterad i banken.');
  }
  async function deleteMealTemplate(id?: string) { if (!id) return; await fetch(`/api/meals/${id}`, { method: 'DELETE' }); await refreshData(); showToast('Måltiden är borttagen.'); }

  async function addActivity(activity?: Partial<SavedActivity>) {
    if (!currentUser) return;
    const source = activity || activityDraft;
    if (!source.title?.trim()) return;
    const response = await fetch('/api/activities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ owner, date: selectedDate, title: source.title, time: source.time, comment: source.comment, completedBy: {}, createdBy: currentUser.key }) });
    if (!response.ok) return showToast('Kunde inte lägga till aktivitet.', 'bad');
    if (!activity) setActivityDraft({ title: '', time: '', comment: '' });
    await refreshData();
    showToast('Aktiviteten är tillagd.');
  }
  async function updateActivity(activity: Activity, patch: Partial<Activity>) { if (!activity._id) return; await fetch(`/api/activities/${activity._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }); await refreshData(); }
  async function deleteActivity(id?: string) { if (!id) return; await fetch(`/api/activities/${id}`, { method: 'DELETE' }); await refreshData(); showToast('Aktiviteten är borttagen.'); }
  async function saveActivityTemplate(activity: Activity) {
    if (!currentUser) return;
    const response = await fetch('/api/saved-activities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ owner, title: activity.title, time: activity.time, comment: activity.comment, createdBy: currentUser.key }) });
    if (!response.ok) return showToast('Kunde inte spara aktiviteten.', 'bad');
    await refreshData();
    showToast(`${activity.title} sparad i aktivitetsbanken.`);
  }
  async function deleteSavedActivity(id?: string) { if (!id) return; await fetch(`/api/saved-activities/${id}`, { method: 'DELETE' }); await refreshData(); showToast('Aktiviteten är borttagen från banken.'); }

  async function saveDayPlan(kind: DayPlanKind) {
    if (!currentUser) return;
    const title = window.prompt('Namn på dagsplanen?', `${plan.title} · ${formatDate(selectedDate)}`)?.trim();
    if (!title) return;
    const response = await fetch('/api/day-plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ owner, title, kind, meals: kind === 'training' ? [] : plan.meals.map(cleanMeal), activities: kind === 'food' ? [] : ownerActivities.map((a) => cleanSavedActivity({ ...a, owner, createdBy: currentUser.key })), createdBy: currentUser.key }) });
    if (!response.ok) return showToast('Kunde inte spara dagsplanen.', 'bad');
    await refreshData();
    showToast('Dagsplanen är sparad.');
  }
  async function useDayPlan(dayPlan: SavedDayPlan) {
    const tasks: Promise<unknown>[] = [];
    if (dayPlan.kind !== 'training') tasks.push(savePlan({ ...plan, title: dayPlan.title, length: 'day', date: selectedDate, meals: cloneMeals(dayPlan.meals) }));
    if (currentUser && dayPlan.kind !== 'food') {
      dayPlan.activities.forEach((activity) => tasks.push(fetch('/api/activities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ owner, date: selectedDate, title: activity.title, time: activity.time, comment: activity.comment, completedBy: {}, createdBy: currentUser.key }) })));
    }
    await Promise.all(tasks);
    await refreshData();
    showToast('Dagsplanen är inlagd på valt datum.');
  }
  async function deleteDayPlan(id?: string) { if (!id) return; await fetch(`/api/day-plans/${id}`, { method: 'DELETE' }); await refreshData(); showToast('Dagsplanen är borttagen.'); }

  async function saveWeekPlan() {
    if (!currentUser) return;
    const title = window.prompt('Namn på veckoplanen?', `Veckoplan från ${formatDate(mondayOf(selectedDate))}`)?.trim();
    if (!title) return;
    const start = mondayOf(selectedDate);
    const end = addDays(start, 6);
    const [plansRes, activitiesRes] = await Promise.all([fetch(`/api/plans?start=${start}&end=${end}&owner=${owner}`), fetch(`/api/activities?start=${start}&end=${end}&owner=${owner}`)]);
    const [plansData, activitiesData] = await Promise.all([plansRes.json(), activitiesRes.json()]);
    const sourcePlans: MealPlan[] = plansData.plans || [];
    const sourceActivities: Activity[] = activitiesData.activities || [];
    const days: WeekDayTemplate[] = weekDates(selectedDate).map((date, index) => {
      const sourcePlan = sourcePlans.find((p) => p.date === date) || emptyPlan(owner, date);
      const dayActivities = sourceActivities.filter((a) => a.date === date).map((a) => cleanSavedActivity({ ...a, owner, createdBy: currentUser.key }));
      return { weekday: index + 1, label: weekdays[index], meals: cloneMeals(sourcePlan.meals), activities: dayActivities };
    });
    const response = await fetch('/api/week-plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ owner, title, description: '', days, createdBy: currentUser.key }) });
    if (!response.ok) return showToast('Kunde inte spara veckoplanen.', 'bad');
    await refreshData();
    showToast('Veckoplanen är sparad.');
  }
  async function applyWeekPlan(weekPlan: SavedWeekPlan) {
    if (!currentUser) return;
    const start = mondayOf(selectedDate);
    for (const day of weekPlan.days) {
      const date = addDays(start, day.weekday - 1);
      const existingRes = await fetch(`/api/plans?date=${date}&owner=${owner}`);
      const existingData = await existingRes.json();
      const existing = (existingData.plans || [])[0] as MealPlan | undefined;
      const payload = { ...(existing || emptyPlan(owner, date)), owner, title: `${weekPlan.title} · ${day.label}`, date, length: 'week' as PlanLength, meals: cloneMeals(day.meals) };
      await fetch(existing?._id ? `/api/plans/${existing._id}` : '/api/plans', { method: existing?._id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      for (const activity of day.activities) {
        await fetch('/api/activities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ owner, date, title: activity.title, time: activity.time, comment: activity.comment, completedBy: {}, createdBy: currentUser.key }) });
      }
    }
    await refreshData();
    showToast('Veckoplanen är utlagd i kalendern.');
  }
  async function deleteWeekPlan(id?: string) { if (!id) return; await fetch(`/api/week-plans/${id}`, { method: 'DELETE' }); await refreshData(); showToast('Veckoplanen är borttagen.'); }

  if (!currentUser) return <LoginScreen loginName={loginName} setLoginName={setLoginName} password={password} setPassword={setPassword} login={login} loginError={loginError} />;

  return (
    <main className="min-h-screen overflow-hidden text-white">
      <Background />
      <div className="relative z-10 mx-auto grid max-w-[1760px] gap-5 p-3 md:p-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Sidebar owner={owner} currentUser={currentUser} logout={logout} />
        <section className="min-w-0 space-y-5">
          <Hero owner={owner} currentUser={currentUser} selectedDate={selectedDate} setSelectedDate={(date) => { setSelectedDate(date); setCalendarMonth(monthStart(date)); }} plan={plan} activities={ownerActivities} />
          <TabBar tab={tab} setTab={setTab} />
          {toast && <ToastCard toast={toast} />}
          {isBusy && <div className="rounded-3xl border border-slate-200 bg-white/80 px-5 py-4 text-sm font-black text-slate-500">Laddar...</div>}

          {tab === 'today' && (
            <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_430px]">
              <section className="space-y-5">
                <WeekStrip dates={selectedWeek} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
                <PlannerHeader plan={plan} canEdit={canEdit} onTitle={(title) => patchPlan((p) => ({ ...p, title }))} onLength={(length) => patchPlan((p) => ({ ...p, length }))} onSave={() => savePlan()} onDelete={deletePlan} onSaveFoodDay={() => saveDayPlan('food')} onSaveFullDay={() => saveDayPlan('full')} onSaveWeek={saveWeekPlan} onAddMeal={openCreateMealModal} />
                <MealOverview meals={plan.meals} canEdit={canEdit} currentUser={currentUser.key} onToggle={toggleMeal} onEdit={openEditMealModal} onRemove={removeMeal} onSaveMeal={(meal) => saveMealTemplate(meal)} />
              </section>
              <aside className="space-y-5 2xl:sticky 2xl:top-5 2xl:self-start">
                <ProgressPanel plan={plan} activities={ownerActivities} currentUser={currentUser.key} />
                <TrainingPanel activities={ownerActivities} canEdit={canEdit} currentUser={currentUser.key} draft={activityDraft} setDraft={setActivityDraft} addActivity={() => addActivity()} updateActivity={updateActivity} deleteActivity={deleteActivity} saveActivity={saveActivityTemplate} saveTrainingDay={() => saveDayPlan('training')} />
              </aside>
            </div>
          )}

          {tab === 'calendar' && <CalendarPanel calendarMonth={calendarMonth} setCalendarMonth={setCalendarMonth} days={calendarDays} selectedDate={selectedDate} selectDate={(date) => { setSelectedDate(date); setTab('today'); }} weekPlans={ownerWeekPlans} applyWeekPlan={applyWeekPlan} deleteWeekPlan={deleteWeekPlan} />}

          {tab === 'bank' && <BankPanel meals={ownerSavedMeals} activities={ownerSavedActivities} dayPlans={ownerDayPlans} weekPlans={ownerWeekPlans} oldDayTemplates={ownerOldDayTemplates} addSavedMeal={(meal) => addMeal({ title: meal.title, time: meal.time, items: meal.items, notes: meal.notes })} updateSavedMeal={updateMealTemplate} addSavedActivity={(activity) => addActivity(activity)} useDayPlan={useDayPlan} applyWeekPlan={applyWeekPlan} deleteMeal={deleteMealTemplate} deleteSavedActivity={deleteSavedActivity} deleteDayPlan={deleteDayPlan} deleteWeekPlan={deleteWeekPlan} />}

          {tab === 'training' && <TrainingPanel activities={ownerActivities} canEdit={canEdit} currentUser={currentUser.key} draft={activityDraft} setDraft={setActivityDraft} addActivity={() => addActivity()} updateActivity={updateActivity} deleteActivity={deleteActivity} saveActivity={saveActivityTemplate} saveTrainingDay={() => saveDayPlan('training')} large />}

          {mealModalMode === 'create' && (
            <MealModal
              title="Skapa måltid"
              draft={mealDraft}
              setDraft={setMealDraft}
              canEdit={canEdit}
              onClose={closeMealModal}
              onSave={createMealFromDraft}
            />
          )}

          {mealModalMode === 'edit' && editingMealId && (() => {
            const editingMeal = plan.meals.find((meal) => meal.id === editingMealId);
            if (!editingMeal) return null;
            return (
              <MealEditModal
                meal={editingMeal}
                canEdit={canEdit}
                currentUser={currentUser.key}
                onClose={closeMealModal}
                onUpdate={(patch) => updateMeal(editingMeal.id, patch)}
                onRemove={() => { removeMeal(editingMeal.id); closeMealModal(); }}
                onToggle={() => toggleMeal(editingMeal.id)}
                onSaveMeal={() => saveMealTemplate(editingMeal)}
              />
            );
          })()}
        </section>
      </div>
    </main>
  );
}

function buildCalendarDays(monthValue: string, plans: MealPlan[], activities: Activity[], user: UserKey): CalendarDay[] {
  const { start } = calendarRange(monthValue);
  const activeMonth = toDate(monthStart(monthValue)).getMonth();
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index);
    const dayPlan = plans.find((plan) => plan.date === date);
    const dayActivities = activities.filter((activity) => activity.date === date);
    return {
      date,
      inMonth: toDate(date).getMonth() === activeMonth,
      day: toDate(date).getDate(),
      hasMeals: Boolean(dayPlan && mealTotal(dayPlan) > 0),
      hasActivities: dayActivities.length > 0,
      completedMeals: dayPlan ? completedMeals(dayPlan, user) : 0,
      totalMeals: dayPlan ? mealTotal(dayPlan) : 0,
      completedActivities: completedActivities(dayActivities, user),
      totalActivities: dayActivities.length,
    };
  });
}


function Background() {
  return (
    <div aria-hidden="true" className="fixed inset-0 overflow-hidden bg-[#07080c]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.22),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(99,102,241,0.22),transparent_30%),radial-gradient(circle_at_60%_90%,rgba(245,158,11,0.16),transparent_32%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)] bg-[size:52px_52px] opacity-25" />
      <div className="absolute left-1/2 top-0 h-px w-[70vw] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
      <div className="absolute bottom-[-22rem] left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
    </div>
  );
}

function LoginScreen({ loginName, setLoginName, password, setPassword, login, loginError }: { loginName: UserKey; setLoginName: (value: UserKey) => void; password: string; setPassword: (value: string) => void; login: () => void; loginError: string }) {
  return (
    <main className="min-h-screen text-white">
      <Background />
      <section className="relative z-10 mx-auto grid min-h-screen max-w-7xl place-items-center px-4 py-8">
        <div className="grid w-full overflow-hidden rounded-[2.75rem] border border-white/10 bg-white/[0.06] shadow-[0_40px_140px_rgba(0,0,0,0.45)] backdrop-blur-2xl lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative min-h-[640px] overflow-hidden p-8 md:p-12">
            <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-emerald-400/30 blur-3xl" />
            <div className="absolute bottom-8 left-8 right-8 rounded-[2rem] border border-white/10 bg-black/25 p-5 backdrop-blur-xl md:left-auto md:w-96">
              <p className="text-xs font-black uppercase tracking-[0.32em] text-white/40">Today flow</p>
              <div className="mt-4 space-y-3">
                <PreviewRow time="08:00" title="Frukost" meta="Ägg, kaffe, grapefruit" done />
                <PreviewRow time="12:00" title="Lunch" meta="Meal prep · protein" />
                <PreviewRow time="18:30" title="Gym" meta="Push session · 55 min" />
              </div>
            </div>
            <div className="relative max-w-3xl">
              <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-emerald-200 backdrop-blur-xl">HealthApp 2026</div>
              <h1 className="mt-8 text-6xl font-black leading-[0.88] tracking-[-0.08em] text-white md:text-8xl">Your week.<br />Planned clean.</h1>
              <p className="mt-8 max-w-xl text-lg font-semibold leading-8 text-white/60">En privat dashboard för måltider, träning, sparade mallar, veckoplaner och dagliga checkar.</p>
            </div>
          </div>
          <div className="flex items-center border-t border-white/10 bg-white/[0.08] p-5 md:p-10 lg:border-l lg:border-t-0">
            <div className="w-full rounded-[2rem] border border-white/10 bg-white/90 p-6 text-slate-950 shadow-2xl md:p-8">
              <p className="text-xs font-black uppercase tracking-[0.32em] text-emerald-600">Logga in</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.07em]">Välj profil</h2>
              <div className="mt-8 grid grid-cols-2 gap-3">
                <button onClick={() => setLoginName('robert')} className={loginName === 'robert' ? primaryButton : softButton}>Robert</button>
                <button onClick={() => setLoginName('erika')} className={loginName === 'erika' ? primaryButton : softButton}>Erika</button>
              </div>
              <input className={`${input} mt-4`} type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && login()} placeholder="Kod" />
              {loginError && <p className="mt-3 text-sm font-black text-rose-600">{loginError}</p>}
              <button onClick={login} className={`${greenButton} mt-5 w-full`}>Öppna dashboard</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Sidebar({ owner, currentUser, logout }: { owner: PlanOwner; currentUser: LoginUser; logout: () => void }) {
  return (
    <aside className="xl:sticky xl:top-5">
      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.08] p-3 text-white shadow-[0_28px_100px_rgba(0,0,0,0.30)] backdrop-blur-2xl">
        <div className="rounded-[1.65rem] bg-white/[0.08] p-5 ring-1 ring-white/10">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400 text-xl font-black text-slate-950">H</div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-white/40">HealthApp</p>
              <h2 className="text-2xl font-black tracking-[-0.07em]">2026</h2>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">Workspace</p>
            <p className="mt-2 text-lg font-black">{ownerLabel[owner]}</p>
            <p className="mt-1 text-sm font-semibold text-white/50">Inloggad som {currentUser.name}</p>
          </div>
        </div>
        <nav className="mt-3 space-y-2 rounded-[1.65rem] bg-black/20 p-3 ring-1 ring-white/10">
          <NavLink href="/" icon="◈" label="Gemensam" active={owner === 'shared'} />
          <NavLink href="/robert" icon="R" label="Robert" active={owner === 'robert'} />
          <NavLink href="/erika" icon="E" label="Erika" active={owner === 'erika'} />
          <NavLink href="/tips" icon="✦" label="Tips" active={false} />
        </nav>
        <button onClick={logout} className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm font-black text-white/70 transition hover:bg-white/[0.12] hover:text-white">Logga ut</button>
      </div>
    </aside>
  );
}

function NavLink({ href, icon, label, active }: { href: string; icon: string; label: string; active: boolean }) {
  return (
    <Link href={href} className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-black transition ${active ? 'bg-white text-slate-950 shadow-xl shadow-black/20' : 'text-white/60 hover:bg-white/[0.08] hover:text-white'}`}>
      <span className={`grid h-9 w-9 place-items-center rounded-xl text-xs ${active ? 'bg-slate-950 text-white' : 'bg-white/10 text-white/60 group-hover:bg-white/15'}`}>{icon}</span>
      {label}
    </Link>
  );
}

function Hero({ owner, currentUser, selectedDate, setSelectedDate, plan, activities }: { owner: PlanOwner; currentUser: LoginUser; selectedDate: string; setSelectedDate: (date: string) => void; plan: MealPlan; activities: Activity[] }) {
  const doneMeals = completedMeals(plan, currentUser.key);
  const totalMeals = mealTotal(plan);
  const doneActivities = completedActivities(activities, currentUser.key);
  const totalActivities = activityTotal(activities);
  return (
    <section className="overflow-hidden rounded-[2.2rem] border border-white/10 bg-white/[0.09] p-4 text-white shadow-[0_28px_100px_rgba(0,0,0,0.28)] backdrop-blur-2xl md:p-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
        <div className="relative overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-emerald-400/[0.14] p-6 ring-1 ring-white/10 md:p-8">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-300/25 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.26em] text-emerald-100">{ownerLabel[owner]} dashboard</span>
              <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white/50">{lengthLabel[plan.length]}</span>
            </div>
            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[0.92] tracking-[-0.08em] md:text-7xl">{plan.title}</h1>
            <p className="mt-5 text-lg font-semibold capitalize text-white/50">{formatDate(selectedDate)} · {currentUser.name}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <input className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white outline-none [color-scheme:dark]" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
              <button onClick={() => setSelectedDate(today())} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white/75 transition hover:bg-white/15 hover:text-white">Idag</button>
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <MetricCard title="Måltider" value={`${doneMeals}/${totalMeals}`} note="ätna idag" tone="green" />
          <MetricCard title="Träning" value={`${doneActivities}/${totalActivities}`} note="aktiviteter klara" tone="blue" />
        </div>
      </div>
    </section>
  );
}

function MetricCard({ title, value, note, tone }: { title: string; value: string; note: string; tone: 'green' | 'blue' }) {
  const glow = tone === 'green' ? 'from-emerald-300/24' : 'from-sky-300/22';
  return (
    <div className={`relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-gradient-to-br ${glow} to-white/[0.06] p-5 shadow-2xl backdrop-blur-xl`}>
      <p className="text-xs font-black uppercase tracking-[0.24em] text-white/40">{title}</p>
      <p className="mt-3 text-5xl font-black tracking-[-0.08em]">{value}</p>
      <p className="mt-2 text-sm font-bold text-white/50">{note}</p>
    </div>
  );
}

function TabBar({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'today', label: 'Dagens plan', icon: '☑' },
    { id: 'calendar', label: 'Kalender', icon: '◷' },
    { id: 'bank', label: 'Bank', icon: '▣' },
    { id: 'training', label: 'Träning', icon: '↗' },
  ];
  return (
    <div className="sticky top-3 z-20 rounded-[1.7rem] border border-white/10 bg-black/30 p-2 shadow-[0_20px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
      <div className="grid gap-2 md:grid-cols-4">
        {tabs.map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)} className={`flex items-center justify-center gap-2 rounded-[1.25rem] px-4 py-3 text-sm font-black transition ${tab === item.id ? 'bg-white text-slate-950 shadow-xl' : 'text-white/50 hover:bg-white/[0.08] hover:text-white'}`}>
            <span>{item.icon}</span>{item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function WeekStrip({ dates, selectedDate, setSelectedDate }: { dates: string[]; selectedDate: string; setSelectedDate: (date: string) => void }) {
  return (
    <section className="grid gap-3 md:grid-cols-7">
      {dates.map((date, index) => {
        const active = date === selectedDate;
        const parsed = toDate(date);
        return (
          <button key={date} onClick={() => setSelectedDate(date)} className={`group overflow-hidden rounded-[1.55rem] border p-4 text-left shadow-xl transition hover:-translate-y-0.5 ${active ? 'border-emerald-300/35 bg-emerald-300 text-slate-950 shadow-emerald-900/20' : 'border-white/10 bg-white/[0.08] text-white backdrop-blur-xl hover:bg-white/[0.12]'}`}>
            <p className={`text-xs font-black uppercase tracking-[0.2em] ${active ? 'text-slate-700' : 'text-white/40'}`}>{weekdays[index]}</p>
            <p className="mt-2 text-3xl font-black tracking-[-0.08em]">{parsed.getDate()}</p>
            <p className={`mt-1 text-xs font-bold capitalize ${active ? 'text-slate-700' : 'text-white/40'}`}>{parsed.toLocaleDateString('sv-SE', { month: 'short' })}</p>
          </button>
        );
      })}
    </section>
  );
}

function PlannerHeader({ plan, canEdit, onTitle, onLength, onSave, onDelete, onSaveFoodDay, onSaveFullDay, onSaveWeek, onAddMeal }: { plan: MealPlan; canEdit: boolean; onTitle: (title: string) => void; onLength: (length: PlanLength) => void; onSave: () => void; onDelete: () => void; onSaveFoodDay: () => void; onSaveFullDay: () => void; onSaveWeek: () => void; onAddMeal: () => void }) {
  return (
    <section className={`${card} p-5 md:p-6`}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <p className="eyebrow">Meal planner</p>
          <input disabled={!canEdit} className="mt-2 w-full border-0 bg-transparent text-4xl font-black tracking-[-0.08em] text-white outline-none placeholder:text-white/20 md:text-5xl" value={plan.title} onChange={(event) => onTitle(event.target.value)} />
          <p className="mt-3 text-sm font-semibold text-white/40">Sätt upp måltider, spara dagen, eller bygg hela veckan som en mall.</p>
        </div>
        <div className="grid gap-3">
          <select disabled={!canEdit} className={darkInput} value={plan.length} onChange={(event) => onLength(event.target.value as PlanLength)}>
            <option value="day">Dag</option>
            <option value="week">Vecka</option>
            <option value="ongoing">Pågående</option>
          </select>
          <button disabled={!canEdit} onClick={onSave} className={greenButton}>Spara dagens plan</button>
        </div>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <button disabled={!canEdit} onClick={onAddMeal} className={softDarkButton}>+ Måltid</button>
        <button disabled={!canEdit} onClick={onSaveFoodDay} className={softDarkButton}>Spara matdag</button>
        <button disabled={!canEdit} onClick={onSaveFullDay} className={softDarkButton}>Spara hel dag</button>
        <button disabled={!canEdit} onClick={onSaveWeek} className={primaryButton}>Spara vecka</button>
        <button disabled={!canEdit || !plan._id} onClick={onDelete} className={dangerButton}>Rensa</button>
      </div>
    </section>
  );
}

function MealOverview({ meals, canEdit, currentUser, onToggle, onEdit, onRemove, onSaveMeal }: { meals: Meal[]; canEdit: boolean; currentUser: UserKey; onToggle: (mealId: string) => void; onEdit: (mealId: string) => void; onRemove: (mealId: string) => void; onSaveMeal: (meal: Meal) => void }) {
  return (
    <section className={`${card} p-5 md:p-6`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Today meals</p>
          <h3 className="mt-2 text-4xl font-black tracking-[-0.08em] text-white">Måltidsöversikt</h3>
          <p className="mt-2 text-sm font-semibold text-white/40">Kompakt vy. Klicka på pennan för att ändra namn, tid, innehåll och notes.</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white/50">{meals.length} måltider</div>
      </div>
      <div className="mt-5 space-y-3">
        <Empty show={meals.length === 0} text="Ingen måltid skapad ännu. Tryck på + Måltid för att lägga in frukost, mellanmål, lunch eller kvällsmål." />
        {meals.map((meal) => {
          const done = Boolean(meal.completedBy[currentUser]);
          return (
            <article key={meal.id} className={`rounded-[1.6rem] border p-4 transition hover:-translate-y-0.5 ${done ? 'border-emerald-300/35 bg-emerald-300/15' : 'border-white/10 bg-white/[0.065]'}`}>
              <div className="flex items-start gap-3">
                <button
                  disabled={!canEdit}
                  onClick={() => onToggle(meal.id)}
                  aria-label={done ? 'Markera som inte ätit' : 'Markera som ätit'}
                  className={`mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-[1rem] border text-lg font-black transition ${done ? 'border-emerald-300 bg-emerald-300 text-slate-950' : 'border-white/15 bg-black/20 text-transparent hover:border-emerald-300/60 hover:text-emerald-200'}`}
                >
                  ✓
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-2xl font-black tracking-[-0.06em] text-white">{meal.title || 'Namnlös måltid'}</h4>
                    {meal.time && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/50">{meal.time}</span>}
                    {done && <span className="rounded-full bg-emerald-300 px-3 py-1 text-xs font-black text-slate-950">Ätit</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {meal.items.length ? meal.items.map((item, index) => (
                      <span key={`${item}-${index}`} className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-bold text-white/65">{item}</span>
                    )) : <span className="rounded-full border border-dashed border-white/15 px-3 py-1.5 text-xs font-bold text-white/30">Ingen mat inlagd</span>}
                  </div>
                  {meal.notes && <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-white/40">{meal.notes}</p>}
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <IconButton disabled={!canEdit} label="Redigera" onClick={() => onEdit(meal.id)}>✎</IconButton>
                  <IconButton disabled={!canEdit || meal.items.length === 0} label="Spara måltid" onClick={() => onSaveMeal(meal)}>▣</IconButton>
                  <IconButton disabled={!canEdit} label="Radera" danger onClick={() => onRemove(meal.id)}>×</IconButton>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function IconButton({ children, label, onClick, disabled, danger }: { children: ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      disabled={disabled}
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`grid h-10 w-10 place-items-center rounded-2xl border text-sm font-black transition hover:-translate-y-0.5 disabled:opacity-35 ${danger ? 'border-rose-300/20 bg-rose-400/10 text-rose-100 hover:bg-rose-400/20' : 'border-white/10 bg-white/[0.07] text-white/60 hover:bg-white/[0.12] hover:text-white'}`}
    >
      {children}
    </button>
  );
}

function MealModal({ title, draft, setDraft, canEdit, onClose, onSave }: { title: string; draft: { title: string; time: string; item: string; notes: string }; setDraft: (draft: { title: string; time: string; item: string; notes: string }) => void; canEdit: boolean; onClose: () => void; onSave: () => void }) {
  return (
    <ModalFrame title={title} subtitle="Lägg in ett eget namn och skriv maten en och en, eller flera med kommatecken." onClose={onClose}>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
        <input disabled={!canEdit} className={darkInput} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Namn, t.ex. Förmiddags mellanmål" />
        <input disabled={!canEdit} className={darkInput} value={draft.time} onChange={(event) => setDraft({ ...draft, time: event.target.value })} placeholder="Tid 10:30" />
      </div>
      <input disabled={!canEdit} className={`${darkInput} mt-3`} value={draft.item} onChange={(event) => setDraft({ ...draft, item: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') onSave(); }} placeholder="Mat: ägg, potatis, biff" />
      <textarea disabled={!canEdit} className="mt-3 min-h-28 w-full resize-y rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold leading-6 text-white/70 outline-none placeholder:text-white/25" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Valfria anteckningar, mängder, macros eller instruktioner..." />
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button onClick={onClose} className={softDarkButton}>Stäng</button>
        <button disabled={!canEdit || !draft.title.trim()} onClick={onSave} className={greenButton}>Lägg till måltid</button>
      </div>
    </ModalFrame>
  );
}

function MealEditModal({ meal, canEdit, currentUser, onClose, onUpdate, onRemove, onToggle, onSaveMeal }: { meal: Meal; canEdit: boolean; currentUser: UserKey; onClose: () => void; onUpdate: (patch: Partial<Meal>) => void; onRemove: () => void; onToggle: () => void; onSaveMeal: () => void }) {
  const [newItem, setNewItem] = useState('');
  const done = Boolean(meal.completedBy[currentUser]);

  function addItem() {
    const items = parseItems(newItem);
    if (!items.length) return;
    onUpdate({ items: [...meal.items, ...items] });
    setNewItem('');
  }

  function updateItem(index: number, value: string) {
    const nextItems = [...meal.items];
    nextItems[index] = value;
    onUpdate({ items: nextItems.map((item) => item.trim()).filter(Boolean) });
  }

  function removeItem(index: number) {
    onUpdate({ items: meal.items.filter((_, itemIndex) => itemIndex !== index) });
  }

  return (
    <ModalFrame title="Redigera måltid" subtitle="Full CRUD på namn, tid, innehåll och anteckningar." onClose={onClose}>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
        <input disabled={!canEdit} className={darkInput} value={meal.title} onChange={(event) => onUpdate({ title: event.target.value })} placeholder="Namn på måltid" />
        <input disabled={!canEdit} className={darkInput} value={meal.time || ''} onChange={(event) => onUpdate({ time: event.target.value })} placeholder="Tid" />
      </div>

      <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-black/20 p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input disabled={!canEdit} className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-emerald-300/40" value={newItem} onChange={(event) => setNewItem(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addItem(); }} placeholder="Lägg till mat: ägg, potatis, biff" />
          <button disabled={!canEdit} onClick={addItem} className={greenButton}>+ Mat</button>
        </div>
        <p className="mt-2 text-xs font-semibold text-white/35">Skriv en i taget eller flera med kommatecken.</p>
      </div>

      <div className="mt-4 space-y-2">
        <Empty show={meal.items.length === 0} text="Ingen mat inlagd ännu." />
        {meal.items.map((item, index) => (
          <div key={`${item}-${index}`} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.07] p-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-300/15 text-xs font-black text-emerald-100">{index + 1}</span>
            <input disabled={!canEdit} className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2 text-sm font-bold text-white/80 outline-none" value={item} onChange={(event) => updateItem(index, event.target.value)} placeholder="Mat" />
            <button disabled={!canEdit} onClick={() => removeItem(index)} className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/10 text-sm font-black text-white/40 hover:bg-rose-400/15 hover:text-rose-200">×</button>
          </div>
        ))}
      </div>

      <textarea disabled={!canEdit} className="mt-4 min-h-24 w-full resize-y rounded-[1.4rem] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold leading-6 text-white/70 outline-none placeholder:text-white/25" value={meal.notes || ''} onChange={(event) => onUpdate({ notes: event.target.value })} placeholder="Anteckningar, mängder, macros, känsla..." />

      <div className="mt-5 grid gap-2 sm:grid-cols-4">
        <button onClick={onToggle} className={done ? greenButton : softDarkButton}>{done ? '✓ Ätit' : 'Bocka av'}</button>
        <button disabled={!canEdit || meal.items.length === 0} onClick={onSaveMeal} className={softDarkButton}>Spara till bank</button>
        <button disabled={!canEdit} onClick={onRemove} className={dangerButton}>Radera</button>
        <button onClick={onClose} className={softDarkButton}>Klar</button>
      </div>
    </ModalFrame>
  );
}

function ModalFrame({ title, subtitle, children, onClose }: { title: string; subtitle: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-3 backdrop-blur-xl" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-[2rem] border border-white/10 bg-slate-950 p-5 shadow-[0_40px_120px_rgba(0,0,0,0.55)] md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Meal editor</p>
            <h3 className="mt-2 text-4xl font-black tracking-[-0.08em] text-white">{title}</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/45">{subtitle}</p>
          </div>
          <button onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.07] text-xl font-black text-white/60 hover:bg-white/[0.12] hover:text-white">×</button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

function TrainingPanel({ activities, canEdit, currentUser, draft, setDraft, addActivity, updateActivity, deleteActivity, saveActivity, saveTrainingDay, large }: { activities: Activity[]; canEdit: boolean; currentUser: UserKey; draft: { title: string; time: string; comment: string }; setDraft: (draft: { title: string; time: string; comment: string }) => void; addActivity: () => void; updateActivity: (activity: Activity, patch: Partial<Activity>) => void; deleteActivity: (id?: string) => void; saveActivity: (activity: Activity) => void; saveTrainingDay: () => void; large?: boolean }) {
  return (
    <section className={`${card} p-5 md:p-6 ${large ? 'max-w-5xl' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Training</p>
          <h3 className="mt-2 text-4xl font-black tracking-[-0.08em] text-white">Aktiviteter</h3>
          <p className="mt-2 text-sm font-semibold text-white/40">Lägg in träning, spara pass som mall och bocka av när det är klart.</p>
        </div>
        <button disabled={!canEdit} onClick={saveTrainingDay} className={softDarkButton}>Spara träningsdag</button>
      </div>
      <div className="mt-5 grid gap-3 rounded-[1.7rem] border border-white/10 bg-black/20 p-4">
        <input disabled={!canEdit} className={darkInput} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Aktivitet, tex Gym / Dans / Promenad" />
        <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
          <input disabled={!canEdit} className={darkInput} value={draft.time} onChange={(event) => setDraft({ ...draft, time: event.target.value })} placeholder="Tid" />
          <input disabled={!canEdit} className={darkInput} value={draft.comment} onChange={(event) => setDraft({ ...draft, comment: event.target.value })} placeholder="Kommentar" />
        </div>
        <button disabled={!canEdit || !draft.title.trim()} onClick={addActivity} className={greenButton}>Lägg till aktivitet</button>
      </div>
      <div className="mt-5 space-y-3">
        <Empty show={activities.length === 0} text="Ingen träning inlagd för denna dag än." />
        {activities.map((activity) => {
          const done = Boolean(activity.completedBy[currentUser]);
          return (
            <article key={activity._id || activity.title} className={`rounded-[1.6rem] border p-4 transition ${done ? 'border-sky-300/35 bg-sky-300/12' : 'border-white/10 bg-white/[0.06]'}`}>
              <div className="flex items-start gap-3">
                <button onClick={() => updateActivity(activity, { completedBy: { ...activity.completedBy, [currentUser]: !done } })} className={`mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-2xl font-black ${done ? 'bg-sky-300 text-slate-950' : 'bg-white/10 text-white/35'}`}>{done ? '✓' : ''}</button>
                <div className="min-w-0 flex-1">
                  <input disabled={!canEdit} className="w-full border-0 bg-transparent text-2xl font-black tracking-[-0.06em] text-white outline-none" value={activity.title} onChange={(event) => updateActivity(activity, { title: event.target.value })} />
                  <div className="mt-2 grid gap-2 md:grid-cols-[120px_minmax(0,1fr)]">
                    <input disabled={!canEdit} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-bold text-white/60 outline-none" value={activity.time || ''} onChange={(event) => updateActivity(activity, { time: event.target.value })} placeholder="Tid" />
                    <input disabled={!canEdit} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-bold text-white/60 outline-none" value={activity.comment || ''} onChange={(event) => updateActivity(activity, { comment: event.target.value })} placeholder="Kommentar" />
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <button onClick={() => updateActivity(activity, { completedBy: { ...activity.completedBy, [currentUser]: !done } })} className={done ? greenButton : softDarkButton}>{done ? 'Klar' : 'Bocka av'}</button>
                <button disabled={!canEdit} onClick={() => saveActivity(activity)} className={softDarkButton}>Spara pass</button>
                <button disabled={!canEdit} onClick={() => deleteActivity(activity._id)} className={dangerButton}>Radera</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CalendarPanel({ calendarMonth, setCalendarMonth, days, selectedDate, selectDate, weekPlans, applyWeekPlan, deleteWeekPlan }: { calendarMonth: string; setCalendarMonth: (date: string) => void; days: CalendarDay[]; selectedDate: string; selectDate: (date: string) => void; weekPlans: SavedWeekPlan[]; applyWeekPlan: (plan: SavedWeekPlan) => void; deleteWeekPlan: (id?: string) => void }) {
  const activeDay = days.find((day) => day.date === selectedDate);
  return (
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_390px]">
      <section className={`${card} p-4 md:p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Calendar</p>
            <h2 className="mt-2 text-4xl font-black capitalize tracking-[-0.08em] text-white md:text-5xl">{monthLabel(calendarMonth)}</h2>
            <p className="mt-2 text-sm font-semibold text-white/40">Desktop: kompakt full view med datumrutor bredvid varandra.</p>
          </div>
          <div className="flex gap-2">
            <button className={softDarkButton} onClick={() => setCalendarMonth(prevMonth(calendarMonth))}>←</button>
            <button className={softDarkButton} onClick={() => setCalendarMonth(monthStart(today()))}>Idag</button>
            <button className={softDarkButton} onClick={() => setCalendarMonth(nextMonth(calendarMonth))}>→</button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-1.5 md:gap-2">
          {weekdays.map((day) => <p key={day} className="px-1 text-center text-[10px] font-black uppercase tracking-[0.16em] text-white/35 md:text-xs">{day}</p>)}
          {days.map((day) => {
            const active = day.date === selectedDate;
            const total = day.totalMeals + day.totalActivities;
            const done = day.completedMeals + day.completedActivities;
            return (
              <button key={day.date} onClick={() => selectDate(day.date)} className={`group min-h-[4.9rem] rounded-[1rem] border p-2 text-left transition hover:-translate-y-0.5 md:min-h-[6.1rem] md:rounded-[1.2rem] ${active ? 'border-emerald-300 bg-emerald-300 text-slate-950 shadow-xl shadow-emerald-950/20' : day.inMonth ? 'border-white/10 bg-white/[0.065] text-white hover:bg-white/[0.11]' : 'border-white/5 bg-white/[0.025] text-white/25'}`}>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-lg font-black tracking-[-0.07em] md:text-2xl">{day.day}</p>
                  {(day.hasMeals || day.hasActivities) && <span className={`h-2 w-2 rounded-full md:h-2.5 md:w-2.5 ${active ? 'bg-slate-950' : 'bg-emerald-300'}`} />}
                </div>
                <div className="mt-2 flex flex-wrap gap-1 md:mt-3">
                  {day.hasMeals && <TinyCalendarPill active={active} label={`M ${day.completedMeals}/${day.totalMeals}`} />}
                  {day.hasActivities && <TinyCalendarPill active={active} label={`T ${day.completedActivities}/${day.totalActivities}`} />}
                </div>
                {total > 0 && <div className={`mt-2 h-1 overflow-hidden rounded-full ${active ? 'bg-slate-950/15' : 'bg-white/10'}`}><span className={`block h-full rounded-full ${active ? 'bg-slate-950' : 'bg-emerald-300'}`} style={{ width: `${Math.max(8, progress(done, total))}%` }} /></div>}
              </button>
            );
          })}
        </div>
      </section>
      <aside className={`${card} h-fit p-5 md:p-6 2xl:sticky 2xl:top-24`}>
        <p className="eyebrow">Selected day</p>
        <h3 className="mt-2 text-4xl font-black tracking-[-0.08em] text-white capitalize">{formatDate(selectedDate)}</h3>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <DarkStat label="Måltider" value={activeDay ? `${activeDay.completedMeals}/${activeDay.totalMeals}` : '0/0'} />
          <DarkStat label="Träning" value={activeDay ? `${activeDay.completedActivities}/${activeDay.totalActivities}` : '0/0'} />
        </div>
        <div className="mt-7 rounded-[1.7rem] border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200/75">Veckoplaner</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/50">Applicera en sparad vecka på veckan där valt datum ligger.</p>
          <div className="mt-4 space-y-3">
            <Empty show={weekPlans.length === 0} text="Spara en vecka från Dagens plan så hamnar den här." />
            {weekPlans.map((plan) => <MiniCard key={plan._id || plan.title} title={plan.title} meta={`${plan.days.length} dagar · mat + träning`} onUse={() => applyWeekPlan(plan)} onDelete={() => deleteWeekPlan(plan._id)} />)}
          </div>
        </div>
      </aside>
    </div>
  );
}

function TinyCalendarPill({ label, active }: { label: string; active: boolean }) {
  return <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black md:px-2 md:py-1 md:text-[10px] ${active ? 'bg-slate-950/10 text-slate-800' : 'bg-white/10 text-white/50'}`}>{label}</span>;
}

function CalendarPill({ label, active }: { label: string; active: boolean }) {
  return <span className={`block rounded-full px-2 py-1 text-[10px] font-black ${active ? 'bg-slate-950/10 text-slate-800' : 'bg-white/10 text-white/50'}`}>{label}</span>;
}

function BankPanel({ meals, activities, dayPlans, weekPlans, oldDayTemplates, addSavedMeal, updateSavedMeal, addSavedActivity, useDayPlan, applyWeekPlan, deleteMeal, deleteSavedActivity, deleteDayPlan, deleteWeekPlan }: { meals: SavedMeal[]; activities: SavedActivity[]; dayPlans: SavedDayPlan[]; weekPlans: SavedWeekPlan[]; oldDayTemplates: SavedMealPlan[]; addSavedMeal: (meal: SavedMeal) => void; updateSavedMeal: (meal: SavedMeal, patch: Partial<SavedMeal>) => void; addSavedActivity: (activity: SavedActivity) => void; useDayPlan: (plan: SavedDayPlan) => void; applyWeekPlan: (plan: SavedWeekPlan) => void; deleteMeal: (id?: string) => void; deleteSavedActivity: (id?: string) => void; deleteDayPlan: (id?: string) => void; deleteWeekPlan: (id?: string) => void }) {
  return (
    <section className={`${card} p-5 md:p-6`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Bank</p>
          <h2 className="mt-2 text-5xl font-black tracking-[-0.08em] text-white">Sparat bibliotek</h2>
          <p className="mt-2 text-sm font-semibold text-white/40">Återanvänd måltider, aktiviteter, dagar och hela veckor.</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white/50">{meals.length + activities.length + dayPlans.length + weekPlans.length} mallar</div>
      </div>
      <div className="mt-7 grid gap-5 xl:grid-cols-2 2xl:grid-cols-4">
        <BankColumn title="Måltider" icon="🍳"><Empty show={meals.length === 0} text="Spara en måltid från ett måltidskort." />{meals.map((meal) => <SavedMealCard key={meal._id || meal.title} meal={meal} onUse={() => addSavedMeal(meal)} onUpdate={(patch) => updateSavedMeal(meal, patch)} onDelete={() => deleteMeal(meal._id)} />)}</BankColumn>
        <BankColumn title="Aktiviteter" icon="⚡"><Empty show={activities.length === 0} text="Spara en aktivitet från träningskortet." />{activities.map((activity) => <MiniCard key={activity._id || activity.title} title={activity.title} meta={activity.time || 'Ingen tid'} onUse={() => addSavedActivity(activity)} onDelete={() => deleteSavedActivity(activity._id)} />)}</BankColumn>
        <BankColumn title="Dagsplaner" icon="☑"><Empty show={dayPlans.length === 0 && oldDayTemplates.length === 0} text="Spara matdag, träningsdag eller full dagsplan." />{dayPlans.map((plan) => <MiniCard key={plan._id || plan.title} title={plan.title} meta={`${kindLabel[plan.kind]} · ${plan.meals.length} måltider · ${plan.activities.length} aktiviteter`} onUse={() => useDayPlan(plan)} onDelete={() => deleteDayPlan(plan._id)} />)}{oldDayTemplates.map((template) => <MiniCard key={template._id || template.title} title={template.title} meta={`Gammal mall · ${template.meals.length} måltider`} onUse={() => useDayPlan({ owner: template.owner, title: template.title, kind: 'food', meals: template.meals, activities: [], createdBy: template.createdBy })} />)}</BankColumn>
        <BankColumn title="Veckoplaner" icon="◷"><Empty show={weekPlans.length === 0} text="Spara hela veckan från Dagens plan." />{weekPlans.map((plan) => <MiniCard key={plan._id || plan.title} title={plan.title} meta={`${plan.days.length} dagar`} onUse={() => applyWeekPlan(plan)} onDelete={() => deleteWeekPlan(plan._id)} />)}</BankColumn>
      </div>
    </section>
  );
}

function BankColumn({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <div className="rounded-[1.8rem] border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 text-lg">{icon}</span>
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/50">{title}</h3>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function SavedMealCard({ meal, onUse, onUpdate, onDelete }: { meal: SavedMeal; onUse: () => void; onUpdate: (patch: Partial<SavedMeal>) => void; onDelete: () => void }) {
  const [newItem, setNewItem] = useState('');

  function addItem() {
    const items = parseItems(newItem);
    if (!items.length) return;
    onUpdate({ items: [...meal.items, ...items] });
    setNewItem('');
  }

  function updateItem(index: number, value: string) {
    const nextItems = [...meal.items];
    nextItems[index] = value;
    onUpdate({ items: nextItems.map((item) => item.trim()).filter(Boolean) });
  }

  function removeItem(index: number) {
    onUpdate({ items: meal.items.filter((_, itemIndex) => itemIndex !== index) });
  }

  return (
    <article className="rounded-[1.4rem] border border-white/10 bg-white/[0.07] p-4 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <input className="w-full border-0 bg-transparent text-base font-black tracking-[-0.04em] text-white outline-none placeholder:text-white/25" value={meal.title} onChange={(event) => onUpdate({ title: event.target.value })} placeholder="Namn på måltid" />
          <input className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-white/60 outline-none" value={meal.time || ''} onChange={(event) => onUpdate({ time: event.target.value })} placeholder="Tid" />
        </div>
        <button onClick={onDelete} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-black text-white/40 hover:bg-rose-400/15 hover:text-rose-200">×</button>
      </div>

      <div className="mt-3 space-y-2">
        {meal.items.map((item, index) => (
          <div key={`${item}-${index}`} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2">
            <input className="min-w-0 flex-1 border-0 bg-transparent text-xs font-bold text-white/70 outline-none" value={item} onChange={(event) => updateItem(index, event.target.value)} />
            <button onClick={() => removeItem(index)} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 text-xs font-black text-white/40 hover:text-rose-200">×</button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-white outline-none placeholder:text-white/25" value={newItem} onChange={(event) => setNewItem(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addItem(); }} placeholder="Lägg till mat" />
        <button onClick={addItem} className={`${miniButton} border-white/10 bg-emerald-300 text-slate-950`}>+</button>
      </div>

      <textarea className="mt-3 min-h-16 w-full resize-y rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-white/60 outline-none placeholder:text-white/25" value={meal.notes || ''} onChange={(event) => onUpdate({ notes: event.target.value })} placeholder="Anteckningar" />
      <button onClick={onUse} className={`${miniButton} mt-3 w-full border-white/10 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white`}>Använd / lägg in</button>
    </article>
  );
}

function MiniCard({ title, meta, onUse, onDelete }: { title: string; meta: string; onUse: () => void; onDelete?: () => void }) {
  return (
    <article className="rounded-[1.4rem] border border-white/10 bg-white/[0.07] p-4 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-base font-black tracking-[-0.04em] text-white">{title}</h4>
          <p className="mt-1 text-xs font-bold text-white/40">{meta}</p>
        </div>
        {onDelete && <button onClick={onDelete} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-black text-white/40 hover:bg-rose-400/15 hover:text-rose-200">×</button>}
      </div>
      <button onClick={onUse} className={`${miniButton} mt-3 w-full border-white/10 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white`}>Använd / lägg in</button>
    </article>
  );
}

function ProgressPanel({ plan, activities, currentUser }: { plan: MealPlan; activities: Activity[]; currentUser: UserKey }) {
  const foodProgress = progress(completedMeals(plan, currentUser), mealTotal(plan));
  const trainingProgress = progress(completedActivities(activities, currentUser), activityTotal(activities));
  return (
    <section className="overflow-hidden rounded-[2rem] border border-emerald-300/20 bg-gradient-to-br from-emerald-300/20 via-white/[0.08] to-sky-300/10 p-5 text-white shadow-[0_24px_90px_rgba(0,0,0,0.30)] backdrop-blur-2xl">
      <p className="eyebrow">Status</p>
      <h3 className="mt-3 text-4xl font-black tracking-[-0.08em]">Dagens check</h3>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <DarkStat label="Mat" value={`${foodProgress}%`} />
        <DarkStat label="Måltider" value={`${completedMeals(plan, currentUser)}/${mealTotal(plan)}`} />
        <DarkStat label="Träning" value={`${trainingProgress}%`} />
        <DarkStat label="Plan" value={lengthLabel[plan.length]} />
      </div>
    </section>
  );
}

function DarkStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">{label}</p><p className="mt-2 text-3xl font-black tracking-[-0.08em] text-white">{value}</p></div>;
}

function ToastCard({ toast }: { toast: Exclude<Toast, null> }) {
  return <div className={`rounded-3xl px-5 py-4 text-sm font-black shadow-2xl ${toast.type === 'bad' ? 'bg-rose-500 text-white' : 'bg-emerald-400 text-slate-950'}`}>{toast.text}</div>;
}

function Empty({ show, text }: { show: boolean; text: string }) {
  return show ? <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.04] p-4 text-sm font-bold leading-6 text-white/35">{text}</p> : null;
}

function PreviewRow({ time, title, meta, done }: { time: string; title: string; meta: string; done?: boolean }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3"><span className="w-12 text-xs font-black text-white/40">{time}</span><div className="min-w-0 flex-1"><p className="font-black text-white">{title}</p><p className="truncate text-xs font-semibold text-white/40">{meta}</p></div><span className={`grid h-8 w-8 place-items-center rounded-xl text-xs font-black ${done ? 'bg-emerald-300 text-slate-950' : 'bg-white/10 text-white/30'}`}>{done ? '✓' : ''}</span></div>;
}
