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
  AppUser,
  HealthGroup,
  PublicSharedPlan,
  LanguageCode,
} from '@/lib/types';

type LoginUser = AppUser & { id: string };
type Toast = { id: number; text: string; type?: 'good' | 'bad' } | null;
type Tab = 'today' | 'calendar' | 'bank' | 'shared' | 'training';
type CalendarDay = { date: string; inMonth: boolean; day: number; hasMeals: boolean; hasActivities: boolean; completedMeals: number; totalMeals: number; completedActivities: number; totalActivities: number };

function getOwnerLabel(owner: PlanOwner, currentUser?: LoginUser | null, groups: HealthGroup[] = []) {
  if (owner === 'shared') return 'Gemensam';
  if (currentUser && owner === currentUser.key) return 'Min privata';
  if (owner.startsWith('group:')) {
    const id = owner.replace('group:', '');
    return groups.find((group) => group._id === id)?.name || 'Grupp';
  }
  if (owner.startsWith('user:')) return 'Privat plan';
  return owner;
}
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

const languageNames: Record<LanguageCode, string> = { sv: 'Svenska', en: 'English', fi: 'Suomi', es: 'Español', pt: 'Português', fr: 'Français', ja: '日本語', zh: '中文' };
const languageShortNames: Record<LanguageCode, string> = { sv: 'SV', en: 'EN', fi: 'FI', es: 'ES', pt: 'PT', fr: 'FR', ja: 'JP', zh: 'CN' };
const languageFlags: Record<LanguageCode, string> = { sv: '🇸🇪', en: '🇬🇧', fi: '🇫🇮', es: '🇪🇸', pt: '🇵🇹', fr: '🇫🇷', ja: '🇯🇵', zh: '🇨🇳' };
const allLanguages = Object.keys(languageNames) as LanguageCode[];
const uiText: Record<LanguageCode, Record<string, string>> = {
  sv: { shared: 'Delade planer', today: 'Dagens plan', calendar: 'Kalender', bank: 'Bank', training: 'Träning', publish: 'Publicera', copy: 'Kopiera', sharedSubtitle: 'Hitta inspiration från andra och kopiera en måltid, dagsplan eller veckoplan till din egen kalender.', language: 'Språk', personalPlan: 'Min privata plan', healthTips: 'Hälsotips', shareWithFriends: 'Dela med vänner', createGroup: 'Skapa grupp', invite: 'Bjud in', logout: 'Logga ut', welcomeKicker: 'Welcome to Your Health', login: 'Logga in', signup: 'Skapa konto', welcomeBack: 'Välkommen tillbaka', authTitle: 'Build your health rhythm.', authSubtitle: 'Skapa måltidsplaner, spara dina bästa måltider, planera träning, bygg dag- och veckoplaner och dela inspiration med familj eller vänner.', name: 'Namn', email: 'Email', password: 'Lösenord minst 8 tecken', confirmationNote: 'Kontot skapas direkt. Du får bara ett välkomstmail med en kort introduktion till appen.', loginCta: 'Öppna dashboard', signupCta: 'Skapa konto', switchToLogin: 'Har du redan konto? Logga in', switchToSignup: 'Inget konto än? Skapa konto', heroMealTitle: 'Planera veckan', heroMealMeta: 'Frukost, lunch, mellis, middag', heroTrainingTitle: 'Spara aktiviteter', heroTrainingMeta: 'Dagsplaner och veckoplaner', heroShareTitle: 'Inspirera varandra', heroShareMeta: 'Privat eller grupp upp till 10 personer' },
  en: { shared: 'Shared plans', today: 'Today', calendar: 'Calendar', bank: 'Bank', training: 'Training', publish: 'Publish', copy: 'Copy', sharedSubtitle: 'Find inspiration from others and copy a meal, day plan or week plan to your own calendar.', language: 'Language', personalPlan: 'My private plan', healthTips: 'Health tips', shareWithFriends: 'Share with friends', createGroup: 'Create group', invite: 'Invite', logout: 'Log out', welcomeKicker: 'Welcome to Your Health', login: 'Log in', signup: 'Sign up', welcomeBack: 'Welcome back', authTitle: 'Build your health rhythm.', authSubtitle: 'Create meal plans, save your best meals, plan training, build day and week plans and share inspiration with family or friends.', name: 'Name', email: 'Email', password: 'Password, at least 8 characters', confirmationNote: 'Your account opens directly. You only receive a welcome email with a short introduction to the app.', loginCta: 'Open dashboard', signupCta: 'Create account', switchToLogin: 'Already have an account? Log in', switchToSignup: 'No account yet? Sign up', heroMealTitle: 'Plan your week', heroMealMeta: 'Breakfast, lunch, snacks, dinner', heroTrainingTitle: 'Save activities', heroTrainingMeta: 'Day plans and week plans', heroShareTitle: 'Inspire each other', heroShareMeta: 'Private or group up to 10 people' },
  fi: { shared: 'Jaetut suunnitelmat', today: 'Tänään', calendar: 'Kalenteri', bank: 'Pankki', training: 'Treeni', publish: 'Julkaise', copy: 'Kopioi', sharedSubtitle: 'Löydä inspiraatiota muilta ja kopioi ateria, päivä- tai viikkosuunnitelma omaan kalenteriin.', language: 'Kieli', personalPlan: 'Oma suunnitelma', healthTips: 'Terveysvinkit', shareWithFriends: 'Jaa ystäville', createGroup: 'Luo ryhmä', invite: 'Kutsu', logout: 'Kirjaudu ulos', welcomeKicker: 'Welcome to Your Health', login: 'Kirjaudu', signup: 'Luo tili', welcomeBack: 'Tervetuloa takaisin', authTitle: 'Rakenna oma terveysrytmi.', authSubtitle: 'Luo ateriasuunnitelmia, tallenna suosikkiateriat, suunnittele treenit ja jaa inspiraatiota perheen tai ystävien kanssa.', name: 'Nimi', email: 'Email', password: 'Salasana, vähintään 8 merkkiä', confirmationNote: 'Tili avautuu heti. Saat vain tervetulosähköpostin, jossa on lyhyt esittely sovelluksesta.', loginCta: 'Avaa dashboard', signupCta: 'Luo tili', switchToLogin: 'Onko sinulla jo tili? Kirjaudu', switchToSignup: 'Ei tiliä? Luo tili', heroMealTitle: 'Suunnittele viikko', heroMealMeta: 'Aamiainen, lounas, välipala, illallinen', heroTrainingTitle: 'Tallenna aktiviteetit', heroTrainingMeta: 'Päivä- ja viikkosuunnitelmat', heroShareTitle: 'Inspiroikaa toisianne', heroShareMeta: 'Yksityinen tai ryhmä, max 10 henkilöä' },
  es: { shared: 'Planes compartidos', today: 'Hoy', calendar: 'Calendario', bank: 'Banco', training: 'Entreno', publish: 'Publicar', copy: 'Copiar', sharedSubtitle: 'Encuentra inspiración de otros y copia una comida, día o semana a tu calendario.', language: 'Idioma', personalPlan: 'Mi plan privado', healthTips: 'Consejos de salud', shareWithFriends: 'Compartir con amigos', createGroup: 'Crear grupo', invite: 'Invitar', logout: 'Cerrar sesión', welcomeKicker: 'Welcome to Your Health', login: 'Entrar', signup: 'Crear cuenta', welcomeBack: 'Bienvenido de nuevo', authTitle: 'Construye tu ritmo saludable.', authSubtitle: 'Crea planes de comida, guarda tus mejores comidas, planifica entrenos y comparte inspiración con familia o amigos.', name: 'Nombre', email: 'Email', password: 'Contraseña, mínimo 8 caracteres', confirmationNote: 'Tu cuenta se abre directamente. Solo recibirás un email de bienvenida con una breve introducción.', loginCta: 'Abrir dashboard', signupCta: 'Crear cuenta', switchToLogin: '¿Ya tienes cuenta? Entrar', switchToSignup: '¿No tienes cuenta? Crear cuenta', heroMealTitle: 'Planifica la semana', heroMealMeta: 'Desayuno, comida, snack, cena', heroTrainingTitle: 'Guarda actividades', heroTrainingMeta: 'Planes diarios y semanales', heroShareTitle: 'Inspiraos juntos', heroShareMeta: 'Privado o grupo hasta 10 personas' },
  pt: { shared: 'Planos partilhados', today: 'Hoje', calendar: 'Calendário', bank: 'Banco', training: 'Treino', publish: 'Publicar', copy: 'Copiar', sharedSubtitle: 'Encontra inspiração e copia uma refeição, dia ou semana para o teu calendário.', language: 'Idioma', personalPlan: 'O meu plano privado', healthTips: 'Dicas de saúde', shareWithFriends: 'Partilhar com amigos', createGroup: 'Criar grupo', invite: 'Convidar', logout: 'Sair', welcomeKicker: 'Welcome to Your Health', login: 'Entrar', signup: 'Criar conta', welcomeBack: 'Bem-vindo de volta', authTitle: 'Constrói o teu ritmo de saúde.', authSubtitle: 'Cria planos de refeições, guarda as melhores refeições, planeia treino e partilha inspiração com família ou amigos.', name: 'Nome', email: 'Email', password: 'Password, mínimo 8 caracteres', confirmationNote: 'A conta abre diretamente. Recebes apenas um email de boas-vindas com uma breve introdução.', loginCta: 'Abrir dashboard', signupCta: 'Criar conta', switchToLogin: 'Já tens conta? Entrar', switchToSignup: 'Ainda sem conta? Criar conta', heroMealTitle: 'Planeia a semana', heroMealMeta: 'Pequeno-almoço, almoço, snack, jantar', heroTrainingTitle: 'Guarda atividades', heroTrainingMeta: 'Planos diários e semanais', heroShareTitle: 'Inspirem-se juntos', heroShareMeta: 'Privado ou grupo até 10 pessoas' },
  fr: { shared: 'Plans partagés', today: 'Aujourd’hui', calendar: 'Calendrier', bank: 'Bibliothèque', training: 'Entraînement', publish: 'Publier', copy: 'Copier', sharedSubtitle: 'Trouve de l’inspiration chez les autres et copie un repas, une journée ou une semaine dans ton calendrier.', language: 'Langue', personalPlan: 'Mon plan privé', healthTips: 'Conseils santé', shareWithFriends: 'Partager avec des amis', createGroup: 'Créer un groupe', invite: 'Inviter', logout: 'Déconnexion', welcomeKicker: 'Welcome to Your Health', login: 'Connexion', signup: 'Créer un compte', welcomeBack: 'Bon retour', authTitle: 'Construis ton rythme santé.', authSubtitle: 'Crée des plans de repas, sauvegarde tes meilleurs repas, planifie tes entraînements et partage l’inspiration avec ta famille ou tes amis.', name: 'Nom', email: 'Email', password: 'Mot de passe, au moins 8 caractères', confirmationNote: 'Le compte s’ouvre directement. Tu reçois seulement un email de bienvenue avec une courte introduction.', loginCta: 'Ouvrir le dashboard', signupCta: 'Créer un compte', switchToLogin: 'Tu as déjà un compte ? Connexion', switchToSignup: 'Pas encore de compte ? Créer un compte', heroMealTitle: 'Planifie ta semaine', heroMealMeta: 'Petit-déjeuner, déjeuner, snack, dîner', heroTrainingTitle: 'Sauvegarde tes activités', heroTrainingMeta: 'Plans journaliers et hebdomadaires', heroShareTitle: 'Inspirez-vous ensemble', heroShareMeta: 'Privé ou groupe jusqu’à 10 personnes' },
  ja: { shared: '共有プラン', today: '今日', calendar: 'カレンダー', bank: 'バンク', training: 'トレーニング', publish: '公開', copy: 'コピー', sharedSubtitle: '他の人のプランを見て、食事・1日・1週間プランを自分のカレンダーにコピーできます。', language: '言語', personalPlan: '自分のプラン', healthTips: '健康ヒント', shareWithFriends: '友達と共有', createGroup: 'グループ作成', invite: '招待', logout: 'ログアウト', welcomeKicker: 'Welcome to Your Health', login: 'ログイン', signup: '登録', welcomeBack: 'おかえりなさい', authTitle: '健康リズムを作ろう。', authSubtitle: '食事プラン、保存した食事、トレーニング、1日・1週間プランを作り、家族や友達と共有できます。', name: '名前', email: 'Email', password: 'パスワード 8文字以上', confirmationNote: 'アカウントはすぐに使えます。アプリの簡単な紹介メールだけが届きます。', loginCta: 'ダッシュボードへ', signupCta: 'アカウント作成', switchToLogin: 'すでにアカウントがありますか？ログイン', switchToSignup: 'アカウントがありませんか？登録', heroMealTitle: '週間を計画', heroMealMeta: '朝食、昼食、軽食、夕食', heroTrainingTitle: '活動を保存', heroTrainingMeta: '1日・1週間プラン', heroShareTitle: '互いに刺激を', heroShareMeta: '個人または最大10人のグループ' },
  zh: { shared: '共享计划', today: '今天', calendar: '日历', bank: '资料库', training: '训练', publish: '发布', copy: '复制', sharedSubtitle: '从他人的计划获得灵感，并复制餐食、日计划或周计划到自己的日历。', language: '语言', personalPlan: '我的私人计划', healthTips: '健康提示', shareWithFriends: '与朋友分享', createGroup: '创建群组', invite: '邀请', logout: '退出登录', welcomeKicker: 'Welcome to Your Health', login: '登录', signup: '注册', welcomeBack: '欢迎回来', authTitle: '建立你的健康节奏。', authSubtitle: '创建餐食计划，保存喜欢的餐食，安排训练，建立日计划和周计划，并与家人朋友分享灵感。', name: '姓名', email: 'Email', password: '密码至少8个字符', confirmationNote: '账号会直接启用。你只会收到一封简短介绍应用的欢迎邮件。', loginCta: '打开仪表盘', signupCta: '创建账号', switchToLogin: '已有账号？登录', switchToSignup: '还没有账号？注册', heroMealTitle: '计划一周', heroMealMeta: '早餐、午餐、加餐、晚餐', heroTrainingTitle: '保存活动', heroTrainingMeta: '日计划和周计划', heroShareTitle: '互相启发', heroShareMeta: '私人或最多10人的群组' },
};

const extraText: Record<LanguageCode, Record<string, string>> = {
  sv: { appName: 'DinHälsa', privatePlanShort: 'Privat plan', dashboard: 'dashboard', day: 'Dag', week: 'Vecka', ongoing: 'Pågående', workspace: 'Workspace', signedInAs: 'Inloggad som', members: 'medlemmar', newGroupPlaceholder: 'Ny grupp, t.ex. Familjen', friendEmailPlaceholder: 'vän@email.se', account: 'Konto', deleteAccount: 'Radera konto', deleteAccountNote: 'Raderar dina privata planer. Offentliga/delade planer finns kvar anonymt för andra.', mealPlanner: 'Måltidsplanerare', mealPlannerHelp: 'Sätt upp måltider, spara dagen, eller bygg hela veckan som en mall.', saveTodayPlan: 'Spara dagens plan', addMeal: '+ Måltid', saveFoodDay: 'Spara matdag', saveFullDay: 'Spara hel dag', saveWeek: 'Spara vecka', clear: 'Rensa', todayMeals: 'Dagens måltider', mealOverview: 'Måltidsöversikt', mealOverviewHelp: 'Kompakt vy. Klicka på pennan för att ändra namn, tid, innehåll och notes.', mealCount: 'måltider', selectedDay: 'Vald dag', weekPlans: 'Veckoplaner', applyWeekHelp: 'Applicera en sparad vecka på veckan där valt datum ligger.', noWeekPlans: 'Spara en vecka från Dagens plan så hamnar den här.', food: 'Mat', meals: 'Måltider', activities: 'Aktiviteter', todayButton: 'Idag', eatenToday: 'ätna idag', activitiesDone: 'aktiviteter klara', savedLibrary: 'Sparat bibliotek', bankHelp: 'Återanvänd privat, dela i grupp eller publicera som inspiration.', templates: 'mallar', savedActivities: 'Aktiviteter', dayPlans: 'Dagsplaner', oldTemplate: 'Gammal mall', useInsert: 'Använd / lägg in', noSavedMeals: 'Spara en måltid från ett måltidskort.', noSavedActivities: 'Spara en aktivitet från träningskortet.', noDayPlans: 'Spara matdag, träningsdag eller full dagsplan.', noSavedWeekPlans: 'Spara hela veckan från Dagens plan.', community: 'Community', copyTo: 'Kopieras till', public: 'publicerade', all: 'Alla', sharedMeals: 'Måltider', dayPlansFilter: 'Dagsplaner', weekPlansFilter: 'Veckoplaner', noPublishedPlans: 'Inga publicerade planer än. Publicera från din Bank så dyker de upp här.', trainingFilter: 'Träning', loading: 'Laddar...', plan: 'Plan', status: 'Status', todayCheck: 'Dagens check' },
  en: { appName: 'Your Health', privatePlanShort: 'Private plan', dashboard: 'dashboard', day: 'Day', week: 'Week', ongoing: 'Ongoing', workspace: 'Workspace', signedInAs: 'Signed in as', members: 'members', newGroupPlaceholder: 'New group, e.g. Family', friendEmailPlaceholder: 'friend@email.com', account: 'Account', deleteAccount: 'Delete account', deleteAccountNote: 'Deletes your private plans. Public/shared plans stay anonymized for others.', mealPlanner: 'Meal planner', mealPlannerHelp: 'Set up meals, save the day, or build the full week as a template.', saveTodayPlan: 'Save today’s plan', addMeal: '+ Meal', saveFoodDay: 'Save food day', saveFullDay: 'Save full day', saveWeek: 'Save week', clear: 'Clear', todayMeals: 'Today’s meals', mealOverview: 'Meal overview', mealOverviewHelp: 'Compact view. Click the pen to edit name, time, content and notes.', mealCount: 'meals', selectedDay: 'Selected day', weekPlans: 'Week plans', applyWeekHelp: 'Apply a saved week to the week containing the selected date.', noWeekPlans: 'Save a week from Today’s plan and it will appear here.', food: 'Food', meals: 'Meals', activities: 'Activities', todayButton: 'Today', eatenToday: 'eaten today', activitiesDone: 'activities done', savedLibrary: 'Saved library', bankHelp: 'Reuse privately, share in a group, or publish as inspiration.', templates: 'templates', savedActivities: 'Activities', dayPlans: 'Day plans', oldTemplate: 'Old template', useInsert: 'Use / insert', noSavedMeals: 'Save a meal from a meal card.', noSavedActivities: 'Save an activity from the training card.', noDayPlans: 'Save a food day, training day or full day plan.', noSavedWeekPlans: 'Save the full week from Today’s plan.', community: 'Community', copyTo: 'Copied to', public: 'public', all: 'All', sharedMeals: 'Meals', dayPlansFilter: 'Day plans', weekPlansFilter: 'Week plans', noPublishedPlans: 'No published plans yet. Publish from your Bank and they will appear here.', trainingFilter: 'Training', loading: 'Loading...', plan: 'Plan', status: 'Status', todayCheck: 'Today’s check' },
  fi: { privatePlanShort: 'Yksityinen suunnitelma', selectedDay: 'Valittu päivä', weekPlans: 'Viikkosuunnitelmat', meals: 'Ateriat', activities: 'Aktiviteetit', todayButton: 'Tänään', loading: 'Ladataan...' }, es: { privatePlanShort: 'Plan privado', selectedDay: 'Día seleccionado', weekPlans: 'Planes semanales', meals: 'Comidas', activities: 'Actividades', todayButton: 'Hoy', loading: 'Cargando...' }, pt: { privatePlanShort: 'Plano privado', selectedDay: 'Dia selecionado', weekPlans: 'Planos semanais', meals: 'Refeições', activities: 'Atividades', todayButton: 'Hoje', loading: 'A carregar...' }, fr: { privatePlanShort: 'Plan privé', selectedDay: 'Jour sélectionné', weekPlans: 'Plans hebdo', meals: 'Repas', activities: 'Activités', todayButton: 'Aujourd’hui', loading: 'Chargement...', mealPlanner: 'Planificateur de repas', savedLibrary: 'Bibliothèque sauvegardée', dayPlans: 'Plans journaliers', deleteAccount: 'Supprimer le compte', account: 'Compte' }, ja: { privatePlanShort: '個人プラン', selectedDay: '選択日', weekPlans: '週間プラン', meals: '食事', activities: '活動', todayButton: '今日', loading: '読み込み中...' }, zh: { privatePlanShort: '私人计划', selectedDay: '选中日期', weekPlans: '周计划', meals: '餐食', activities: '活动', todayButton: '今天', loading: '加载中...' },
};
(['sv','en','fi','es','pt','fr','ja','zh'] as LanguageCode[]).forEach((code) => { uiText[code] = { ...uiText.en, ...extraText.en, ...uiText[code], ...extraText[code] }; });
const localeByLanguage: Record<LanguageCode, string> = { sv: 'sv-SE', en: 'en-US', fi: 'fi-FI', es: 'es-ES', pt: 'pt-PT', fr: 'fr-FR', ja: 'ja-JP', zh: 'zh-CN' };
function tr(t: Record<string, string>, key: string, fallback: string) { return t[key] || uiText.en[key] || fallback; }
function localizedWeekdays(language: LanguageCode) { const base = mondayOf(today()); return Array.from({ length: 7 }, (_, index) => toDate(addDays(base, index)).toLocaleDateString(localeByLanguage[language], { weekday: 'short' })); }
function ownerLabel(owner: PlanOwner, currentUser: LoginUser | null | undefined, groups: HealthGroup[], t: Record<string, string>) { if (owner.startsWith('user:')) return tr(t, 'privatePlanShort', 'Private plan'); const group = groups.find((item) => `group:${item._id}` === owner); return group?.name || 'Shared plan'; }
function displayPlanTitle(plan: MealPlan, owner: PlanOwner, currentUser: LoginUser, groups: HealthGroup[], t: Record<string, string>) { const lower = (plan.title || '').toLowerCase(); if (!plan._id || lower.includes('privat plan') || lower.includes('private plan') || lower.includes('dagens plan') || lower.includes('today')) return `${ownerLabel(owner, currentUser, groups, t)} · ${t.today}`; return plan.title; }
function lengthText(length: PlanLength, t: Record<string, string>) { return length === 'week' ? tr(t, 'week', 'Week') : length === 'ongoing' ? tr(t, 'ongoing', 'Ongoing') : tr(t, 'day', 'Day'); }
function kindText(kind: DayPlanKind, t: Record<string, string>) { return kind === 'training' ? t.training : kind === 'full' ? 'Food + training' : tr(t, 'food', 'Food'); }

function today() { return new Date().toISOString().slice(0, 10); }
function uid() { return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function toDate(value: string) { return new Date(`${value}T12:00:00`); }
function iso(date: Date) { return date.toISOString().slice(0, 10); }
function parseItems(value: string) { return value.split(/,|\n/).map((item) => item.trim()).filter(Boolean); }
function itemsToText(items: string[]) { return items.join('\n'); }
function formatDate(value: string, language: LanguageCode = 'en') { return toDate(value).toLocaleDateString(localeByLanguage[language], { weekday: 'long', day: 'numeric', month: 'long' }); }
function monthLabel(value: string, language: LanguageCode = 'en') { return toDate(value).toLocaleDateString(localeByLanguage[language], { month: 'long', year: 'numeric' }); }
function addDays(value: string, days: number) { const date = toDate(value); date.setDate(date.getDate() + days); return iso(date); }
function monthStart(value: string) { const date = toDate(value); date.setDate(1); return iso(date); }
function prevMonth(value: string) { const date = toDate(value); date.setMonth(date.getMonth() - 1, 1); return iso(date); }
function nextMonth(value: string) { const date = toDate(value); date.setMonth(date.getMonth() + 1, 1); return iso(date); }
function mondayOf(value: string) { const date = toDate(value); const day = date.getDay() || 7; date.setDate(date.getDate() - day + 1); return iso(date); }
function cleanMeal(meal: Meal): Meal { return { ...meal, id: meal.id || uid(), title: meal.title?.trim() || 'Ny måltid', time: meal.time?.trim() || '', items: Array.isArray(meal.items) ? meal.items.map((i) => i.trim()).filter(Boolean) : [], notes: meal.notes?.trim() || '', completedBy: meal.completedBy || {} }; }
function cleanSavedActivity(activity: Partial<SavedActivity>): SavedActivity { return { owner: (activity.owner || 'shared') as PlanOwner, title: activity.title?.trim() || 'Ny aktivitet', time: activity.time?.trim() || '', comment: activity.comment?.trim() || '', createdBy: (activity.createdBy || '') as UserKey }; }
function emptyPlan(owner: PlanOwner, date: string): MealPlan { return { owner, title: owner === 'shared' ? 'Dagens gemensamma plan' : `${getOwnerLabel(owner)} · dagens plan`, date, length: 'day', meals: defaultMeals.map((m) => ({ id: uid(), title: m.title, time: m.time, items: m.items, notes: '', completedBy: {} })) }; }
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

export default function HealthApp() {
  const [currentUser, setCurrentUser] = useState<LoginUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authDraft, setAuthDraft] = useState({ name: '', email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [groups, setGroups] = useState<HealthGroup[]>([]);
  const [activeOwner, setActiveOwner] = useState<PlanOwner>('');
  const [groupDraft, setGroupDraft] = useState({ name: '', description: '', inviteEmail: '' });
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
  const [publicPlans, setPublicPlans] = useState<PublicSharedPlan[]>([]);
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [activityDraft, setActivityDraft] = useState({ title: '', time: '', comment: '' });
  const [mealDraft, setMealDraft] = useState({ title: '', time: '', item: '', notes: '' });
  const [mealModalMode, setMealModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    void fetch('/api/auth/me')
      .then((response) => response.json())
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user);
          setActiveOwner(data.user.key);
        }
      })
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    if (!activeOwner) setActiveOwner(currentUser.key);
    setIsBusy(true);
    void Promise.all([refreshData(), refreshGroups()]).finally(() => setIsBusy(false));
  }, [currentUser, selectedDate, calendarMonth, activeOwner]);

  const owner = activeOwner || currentUser?.key || 'shared';
  const plan = useMemo(() => plans.find((item) => item.owner === owner) || emptyPlan(owner, selectedDate), [plans, owner, selectedDate]);
  const ownerActivities = useMemo(() => activities.filter((activity) => activity.owner === owner), [activities, owner]);
  const canEdit = Boolean(currentUser);
  const ownerSavedMeals = savedMeals.filter((meal) => meal.owner === owner);
  const ownerSavedActivities = savedActivities.filter((activity) => activity.owner === owner);
  const ownerDayPlans = dayPlans.filter((dayPlan) => dayPlan.owner === owner);
  const ownerWeekPlans = weekPlans.filter((weekPlan) => weekPlan.owner === owner);
  const ownerOldDayTemplates = oldDayTemplates.filter((template) => template.owner === owner);
  const selectedWeek = weekDates(selectedDate);
  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth, calendarPlans.filter((p) => p.owner === owner), calendarActivities.filter((a) => a.owner === owner), currentUser?.key || 'robert'), [calendarMonth, calendarPlans, calendarActivities, owner, currentUser]);
  const t = uiText[language];

  async function refreshData() {
    const { start, end } = calendarRange(calendarMonth);
    const [plansRes, calendarPlansRes, activitiesRes, calendarActivitiesRes, oldTemplatesRes, mealsRes, savedActivitiesRes, dayPlansRes, weekPlansRes, publicPlansRes] = await Promise.all([
      fetch(`/api/plans?date=${selectedDate}`),
      fetch(`/api/plans?start=${start}&end=${end}`),
      fetch(`/api/activities?date=${selectedDate}`),
      fetch(`/api/activities?start=${start}&end=${end}`),
      fetch('/api/templates'),
      fetch('/api/meals'),
      fetch('/api/saved-activities'),
      fetch('/api/day-plans'),
      fetch('/api/week-plans'),
      fetch('/api/shared-plans'),
    ]);
    const [plansData, calendarPlansData, activitiesData, calendarActivitiesData, oldTemplatesData, mealsData, savedActivitiesData, dayPlansData, weekPlansData, publicPlansData] = await Promise.all([
      plansRes.json(), calendarPlansRes.json(), activitiesRes.json(), calendarActivitiesRes.json(), oldTemplatesRes.json(), mealsRes.json(), savedActivitiesRes.json(), dayPlansRes.json(), weekPlansRes.json(), publicPlansRes.json(),
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
    setPublicPlans(publicPlansData.plans || []);
  }

  function showToast(text: string, type: 'good' | 'bad' = 'good') {
    const id = Date.now();
    setToast({ id, text, type });
    window.setTimeout(() => setToast((active) => (active?.id === id ? null : active)), 2600);
  }

  async function submitAuth() {
    setLoginError('');
    const path = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(authDraft) });
    const data = await response.json();
    if (!response.ok) return setLoginError(data.message || 'Kunde inte logga in.');
    setCurrentUser(data.user);
    setActiveOwner(data.user.key);
    if (authMode === 'signup') showToast('Konto skapat. Välkommen in!', 'good');
  }
  async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); setCurrentUser(null); setActiveOwner(''); setGroups([]); setAuthDraft({ name: '', email: '', password: '' }); }

  async function deleteAccount() {
    const firstConfirm = window.confirm('Vill du radera ditt konto? Dina privata måltider, planer och aktiviteter tas bort. Delade/publicerade planer finns kvar anonymt så andra kan fortsätta använda dem.');
    if (!firstConfirm) return;
    const typed = window.prompt('Skriv RADERA för att bekräfta.');
    if (typed !== 'RADERA') return showToast('Kontot raderades inte.', 'bad');

    const response = await fetch('/api/auth/account', { method: 'DELETE' });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return showToast(data.message || 'Kunde inte radera kontot.', 'bad');
    }

    setCurrentUser(null);
    setActiveOwner('');
    setGroups([]);
    setAuthDraft({ name: '', email: '', password: '' });
    showToast('Kontot är raderat.', 'good');
  }

  async function refreshGroups() {
    const response = await fetch('/api/groups');
    if (!response.ok) return setGroups([]);
    const data = await response.json();
    setGroups(data.groups || []);
  }
  async function createGroup() {
    if (!groupDraft.name.trim()) return showToast('Skriv ett namn på gruppen först.', 'bad');
    const response = await fetch('/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: groupDraft.name, description: groupDraft.description }) });
    if (!response.ok) return showToast('Kunde inte skapa gruppen.', 'bad');
    const data = await response.json();
    await refreshGroups();
    setActiveOwner(`group:${data.group._id}`);
    setGroupDraft({ name: '', description: '', inviteEmail: '' });
    showToast('Gruppen är skapad.');
  }
  async function inviteToActiveGroup() {
    const groupId = owner.startsWith('group:') ? owner.replace('group:', '') : '';
    if (!groupId) return showToast('Välj en grupp först.', 'bad');
    const response = await fetch(`/api/groups/${groupId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'invite', email: groupDraft.inviteEmail }) });
    const data = await response.json();
    if (!response.ok) return showToast(data.message || 'Kunde inte bjuda in.', 'bad');
    setGroupDraft((draft) => ({ ...draft, inviteEmail: '' }));
    await refreshGroups();
    showToast('Vännen är tillagd i gruppen.');
  }

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


  async function publishSharedPlan(payload: Partial<PublicSharedPlan>) {
    if (!currentUser) return;
    const description = window.prompt('Kort beskrivning som andra ser?', payload.description || '') || '';
    const tagsText = window.prompt('Tags, separera med kommatecken. Ex: fat loss, protein, family', Array.isArray(payload.tags) ? payload.tags.join(', ') : '') || '';
    const response = await fetch('/api/shared-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, description, tags: parseItems(tagsText), language, sourceOwner: owner }),
    });
    if (!response.ok) return showToast('Kunde inte publicera planen.', 'bad');
    await refreshData();
    setTab('shared');
    showToast('Planen är publicerad i Delade planer.');
  }

  function publishMeal(meal: SavedMeal) {
    void publishSharedPlan({ type: 'meal', title: meal.title, meals: [{ id: uid(), title: meal.title, time: meal.time, items: meal.items, notes: meal.notes, completedBy: {} }] });
  }

  function publishDay(dayPlan: SavedDayPlan) {
    void publishSharedPlan({ type: dayPlan.kind === 'training' ? 'training' : 'day', title: dayPlan.title, dayPlan });
  }

  function publishWeek(weekPlan: SavedWeekPlan) {
    void publishSharedPlan({ type: 'week', title: weekPlan.title, description: weekPlan.description || '', weekPlan });
  }

  async function copySharedPlan(sharedPlan: PublicSharedPlan) {
    if (!currentUser) return;
    if (sharedPlan._id) void fetch(`/api/shared-plans/${sharedPlan._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'copy' }) });

    if (sharedPlan.type === 'meal' && sharedPlan.meals?.[0]) {
      const meal = cleanMeal({ ...sharedPlan.meals[0], id: uid(), completedBy: {} });
      const nextPlan = { ...plan, meals: [...plan.meals, meal] };
      patchPlan(() => nextPlan);
      await savePlan(nextPlan);
      setTab('today');
      showToast('Måltiden är kopierad till dagens plan.');
      return;
    }

    if ((sharedPlan.type === 'day' || sharedPlan.type === 'training') && sharedPlan.dayPlan) {
      await useDayPlan({ ...sharedPlan.dayPlan, owner });
      setTab('today');
      showToast('Dagsplanen är kopierad till valt datum.');
      return;
    }

    if (sharedPlan.type === 'week' && sharedPlan.weekPlan) {
      await applyWeekPlan({ ...sharedPlan.weekPlan, owner });
      setTab('calendar');
      showToast('Veckoplanen är kopierad till vald vecka.');
      return;
    }

    showToast('Den här delade planen saknar data att kopiera.', 'bad');
  }

  if (!authChecked) return <main className="min-h-screen bg-[#07080c] text-white"><Background /><div className="relative z-10 grid min-h-screen place-items-center"><p className="rounded-3xl border border-white/10 bg-white/10 px-6 py-4 font-black">Laddar...</p></div></main>;
  if (!currentUser) return <LoginScreen mode={authMode} setMode={setAuthMode} draft={authDraft} setDraft={setAuthDraft} submit={submitAuth} loginError={loginError} language={language} setLanguage={setLanguage} />;

  return (
    <main className="min-h-screen overflow-hidden text-white">
      <Background />
      <div className="relative z-10 mx-auto grid max-w-[1760px] gap-5 p-3 md:p-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Sidebar owner={owner} currentUser={currentUser} groups={groups} activeOwner={owner} setActiveOwner={setActiveOwner} groupDraft={groupDraft} setGroupDraft={setGroupDraft} createGroup={createGroup} inviteToActiveGroup={inviteToActiveGroup} logout={logout} deleteAccount={deleteAccount} language={language} setLanguage={setLanguage} />
        <section className="min-w-0 space-y-5">
          <Hero owner={owner} groups={groups} currentUser={currentUser} selectedDate={selectedDate} setSelectedDate={(date) => { setSelectedDate(date); setCalendarMonth(monthStart(date)); }} plan={plan} activities={ownerActivities} language={language} t={t} />
          <TabBar tab={tab} setTab={setTab} t={t} />
          {toast && <ToastCard toast={toast} />}
          {isBusy && <div className="rounded-3xl border border-slate-200 bg-white/80 px-5 py-4 text-sm font-black text-slate-500">{tr(t, 'loading', 'Loading...')}</div>}

          {tab === 'today' && (
            <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_430px]">
              <section className="space-y-5">
                <WeekStrip dates={selectedWeek} selectedDate={selectedDate} setSelectedDate={setSelectedDate} language={language} />
                <PlannerHeader plan={plan} canEdit={canEdit} t={t} onTitle={(title) => patchPlan((p) => ({ ...p, title }))} onLength={(length) => patchPlan((p) => ({ ...p, length }))} onSave={() => savePlan()} onDelete={deletePlan} onSaveFoodDay={() => saveDayPlan('food')} onSaveFullDay={() => saveDayPlan('full')} onSaveWeek={saveWeekPlan} onAddMeal={openCreateMealModal} />
                <MealOverview t={t} meals={plan.meals} canEdit={canEdit} currentUser={currentUser.key} onToggle={toggleMeal} onEdit={openEditMealModal} onRemove={removeMeal} onSaveMeal={(meal) => saveMealTemplate(meal)} />
              </section>
              <aside className="space-y-5 2xl:sticky 2xl:top-5 2xl:self-start">
                <ProgressPanel t={t} plan={plan} activities={ownerActivities} currentUser={currentUser.key} />
                <TrainingPanel t={t} activities={ownerActivities} canEdit={canEdit} currentUser={currentUser.key} draft={activityDraft} setDraft={setActivityDraft} addActivity={() => addActivity()} updateActivity={updateActivity} deleteActivity={deleteActivity} saveActivity={saveActivityTemplate} saveTrainingDay={() => saveDayPlan('training')} />
              </aside>
            </div>
          )}

          {tab === 'calendar' && <CalendarPanel language={language} t={t} calendarMonth={calendarMonth} setCalendarMonth={setCalendarMonth} days={calendarDays} selectedDate={selectedDate} selectDate={(date) => { setSelectedDate(date); setTab('today'); }} weekPlans={ownerWeekPlans} applyWeekPlan={applyWeekPlan} deleteWeekPlan={deleteWeekPlan} />}

          {tab === 'bank' && <BankPanel t={t} meals={ownerSavedMeals} activities={ownerSavedActivities} dayPlans={ownerDayPlans} weekPlans={ownerWeekPlans} oldDayTemplates={ownerOldDayTemplates} addSavedMeal={(meal) => addMeal({ title: meal.title, time: meal.time, items: meal.items, notes: meal.notes })} updateSavedMeal={updateMealTemplate} addSavedActivity={(activity) => addActivity(activity)} useDayPlan={useDayPlan} applyWeekPlan={applyWeekPlan} deleteMeal={deleteMealTemplate} deleteSavedActivity={deleteSavedActivity} deleteDayPlan={deleteDayPlan} deleteWeekPlan={deleteWeekPlan} publishMeal={publishMeal} publishDay={publishDay} publishWeek={publishWeek} />}

          {tab === 'shared' && <SharedPlansPanel language={language} plans={publicPlans} currentUser={currentUser} selectedDate={selectedDate} copyPlan={copySharedPlan} deletePlan={async (id) => { if (!id) return; await fetch(`/api/shared-plans/${id}`, { method: 'DELETE' }); await refreshData(); showToast('Delad plan är borttagen.'); }} t={t} />}

          {tab === 'training' && <TrainingPanel t={t} activities={ownerActivities} canEdit={canEdit} currentUser={currentUser.key} draft={activityDraft} setDraft={setActivityDraft} addActivity={() => addActivity()} updateActivity={updateActivity} deleteActivity={deleteActivity} saveActivity={saveActivityTemplate} saveTrainingDay={() => saveDayPlan('training')} large />}

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

function LoginScreen({ mode, setMode, draft, setDraft, submit, loginError, language, setLanguage }: { mode: 'login' | 'signup'; setMode: (mode: 'login' | 'signup') => void; draft: { name: string; email: string; password: string }; setDraft: (draft: { name: string; email: string; password: string }) => void; submit: () => void; loginError: string; language: LanguageCode; setLanguage: (language: LanguageCode) => void }) {
  const isSignup = mode === 'signup';
  const t = uiText[language];
  return (
    <main className="min-h-screen text-white">
      <Background />
      <section className="relative z-10 mx-auto grid min-h-screen max-w-7xl place-items-center px-3 py-5 sm:px-4 sm:py-8">
        <div className="grid w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.06] shadow-[0_40px_140px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:rounded-[2.2rem] lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative overflow-hidden p-5 sm:p-8 md:p-10 lg:min-h-[640px] lg:p-12">
            <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-emerald-400/30 blur-3xl sm:h-96 sm:w-96" />
            <div className="relative max-w-3xl">
              <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-2 text-[0.65rem] font-black uppercase tracking-[0.18em] text-emerald-200 backdrop-blur-xl sm:px-4 sm:text-xs sm:tracking-[0.28em]">DinHälsa · HealthApp 2026</div>
              <h1 className="mt-6 text-[2.55rem] font-black leading-[0.9] tracking-[-0.08em] text-white sm:text-6xl md:text-7xl lg:mt-8 lg:text-8xl">{t.authTitle}</h1>
              <p className="mt-5 max-w-xl text-sm font-semibold leading-7 text-white/60 sm:text-base md:mt-7 md:text-lg md:leading-8">{t.authSubtitle}</p>
            </div>

            <div className="relative mt-7 rounded-[1.55rem] border border-white/10 bg-black/30 p-4 backdrop-blur-xl sm:rounded-[2rem] sm:p-5 lg:absolute lg:bottom-8 lg:left-auto lg:right-8 lg:mt-0 lg:w-[28rem]">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.24em] text-white/40 sm:text-xs sm:tracking-[0.32em]">{t.welcomeKicker}</p>
              <div className="mt-4 space-y-3">
                <PreviewRow time="Meals" title={t.heroMealTitle} meta={t.heroMealMeta} done />
                <PreviewRow time="Training" title={t.heroTrainingTitle} meta={t.heroTrainingMeta} />
                <PreviewRow time="Share" title={t.heroShareTitle} meta={t.heroShareMeta} />
              </div>
            </div>
          </div>
          <div className="flex items-center border-t border-white/10 bg-white/[0.08] p-4 sm:p-5 md:p-10 lg:border-l lg:border-t-0">
            <div className="w-full rounded-[1.55rem] border border-white/10 bg-white/90 p-5 text-slate-950 shadow-2xl sm:rounded-[2rem] sm:p-6 md:p-8">
              <div className="mb-5 rounded-[1.25rem] border border-slate-200 bg-slate-950 p-2 shadow-inner shadow-black/20">
                <LanguagePicker language={language} setLanguage={setLanguage} compact />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.26em] text-emerald-600 sm:tracking-[0.32em]">{isSignup ? t.signup : t.login}</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.07em] sm:text-4xl">{isSignup ? t.welcomeKicker : t.welcomeBack}</h2>
              {isSignup && <input className={`${input} mt-6`} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder={t.name} />}
              <input className={`${input} ${isSignup ? 'mt-3' : 'mt-6'}`} type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} placeholder={t.email} />
              <input className={`${input} mt-3`} type="password" value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} onKeyDown={(event) => event.key === 'Enter' && submit()} placeholder={t.password} />
              {isSignup && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold leading-6 text-emerald-900">{t.confirmationNote}</p>}
              {loginError && <p className="mt-3 text-sm font-black text-rose-600">{loginError}</p>}
              <button onClick={submit} className={`${greenButton} mt-5 w-full`}>{isSignup ? t.signupCta : t.loginCta}</button>
              <button onClick={() => { setMode(isSignup ? 'login' : 'signup'); }} className="mt-4 w-full text-sm font-black text-slate-500 hover:text-slate-950">{isSignup ? t.switchToLogin : t.switchToSignup}</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function LanguagePicker({ language, setLanguage, compact = false }: { language: LanguageCode; setLanguage: (language: LanguageCode) => void; compact?: boolean }) {
  return (
    <div className={`grid ${compact ? 'grid-cols-4 gap-1.5 sm:grid-cols-8' : 'grid-cols-2 gap-2 sm:grid-cols-3'}`}>
      {allLanguages.map((code) => {
        const active = code === language;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLanguage(code)}
            title={languageNames[code]}
            className={`group flex items-center justify-center gap-2 rounded-2xl border px-2 py-2 text-xs font-black transition ${active ? 'border-emerald-300/50 bg-emerald-300 text-slate-950 shadow-lg shadow-emerald-950/20' : 'border-white/10 bg-black/45 text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white'}`}
          >
            <span className="text-base leading-none">{languageFlags[code]}</span>
            {!compact && <span>{languageShortNames[code]}</span>}
          </button>
        );
      })}
    </div>
  );
}


function Sidebar({ owner, currentUser, groups, activeOwner, setActiveOwner, groupDraft, setGroupDraft, createGroup, inviteToActiveGroup, logout, deleteAccount, language, setLanguage }: { owner: PlanOwner; currentUser: LoginUser; groups: HealthGroup[]; activeOwner: PlanOwner; setActiveOwner: (owner: PlanOwner) => void; groupDraft: { name: string; description: string; inviteEmail: string }; setGroupDraft: (draft: { name: string; description: string; inviteEmail: string }) => void; createGroup: () => void; inviteToActiveGroup: () => void; logout: () => void; deleteAccount: () => void; language: LanguageCode; setLanguage: (language: LanguageCode) => void }) {
  const selectedGroup = groups.find((group) => `group:${group._id}` === activeOwner);
  const t = uiText[language];
  return (
    <aside className="xl:sticky xl:top-5">
      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.08] p-3 text-white shadow-[0_28px_100px_rgba(0,0,0,0.30)] backdrop-blur-2xl">
        <div className="rounded-[1.65rem] bg-white/[0.08] p-5 ring-1 ring-white/10">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400 text-xl font-black text-slate-950">H</div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-white/40">{t.appName}</p>
              <h2 className="text-2xl font-black tracking-[-0.07em]">2026</h2>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">{tr(t, 'workspace', 'Workspace')}</p>
            <p className="mt-2 text-lg font-black">{ownerLabel(owner, currentUser, groups, t)}</p>
            <p className="mt-1 text-sm font-semibold text-white/50">{tr(t, 'signedInAs', 'Signed in as')} {currentUser.name}</p>
          </div>
        </div>
        <nav className="mt-3 space-y-2 rounded-[1.65rem] bg-black/20 p-3 ring-1 ring-white/10">
          <button onClick={() => setActiveOwner(currentUser.key)} className={`w-full text-left ${activeOwner === currentUser.key ? 'rounded-2xl bg-white text-slate-950 shadow-xl' : 'rounded-2xl text-white/60 hover:bg-white/[0.08] hover:text-white'} px-3 py-3 text-sm font-black transition`}>● {t.personalPlan}</button>
          {groups.map((group) => (
            <button key={group._id} onClick={() => setActiveOwner(`group:${group._id}`)} className={`w-full text-left ${activeOwner === `group:${group._id}` ? 'rounded-2xl bg-white text-slate-950 shadow-xl' : 'rounded-2xl text-white/60 hover:bg-white/[0.08] hover:text-white'} px-3 py-3 text-sm font-black transition`}>◌ {group.name}</button>
          ))}
          <NavLink href="/tips" icon="✦" label={t.healthTips} active={false} />
        </nav>
        <div className="mt-3 rounded-[1.65rem] border border-white/10 bg-white/[0.06] p-3">
          <p className="px-2 text-xs font-black uppercase tracking-[0.22em] text-white/35">{t.shareWithFriends}</p>
          <input className={`${darkInput} mt-3 py-2`} value={groupDraft.name} onChange={(event) => setGroupDraft({ ...groupDraft, name: event.target.value })} placeholder={tr(t, 'newGroupPlaceholder', 'New group')} />
          <button onClick={createGroup} className={`${softDarkButton} mt-2 w-full py-2`}>{t.createGroup}</button>
          {selectedGroup && <div className="mt-3 rounded-2xl bg-black/20 p-3">
            <p className="text-xs font-black text-white/45">{selectedGroup.members?.length || 0}/10 {tr(t, 'members', 'members')}</p>
            <input className={`${darkInput} mt-2 py-2`} value={groupDraft.inviteEmail} onChange={(event) => setGroupDraft({ ...groupDraft, inviteEmail: event.target.value })} placeholder={tr(t, 'friendEmailPlaceholder', 'friend@email.com')} />
            <button onClick={inviteToActiveGroup} className={`${greenButton} mt-2 w-full py-2`}>{t.invite}</button>
          </div>}
        </div>

        <div className="mt-3 rounded-[1.65rem] border border-white/10 bg-white/[0.06] p-3">
          <p className="px-2 text-xs font-black uppercase tracking-[0.22em] text-white/35">{t.language}</p>
          <div className="mt-3 rounded-[1.25rem] bg-black/45 p-2 ring-1 ring-white/10">
            <LanguagePicker language={language} setLanguage={setLanguage} />
          </div>
        </div>
        <div className="mt-3 rounded-[1.65rem] border border-white/10 bg-white/[0.06] p-3">
          <p className="px-2 text-xs font-black uppercase tracking-[0.22em] text-white/35">{tr(t, 'account', 'Account')}</p>
          <button onClick={logout} className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm font-black text-white/70 transition hover:bg-white/[0.12] hover:text-white">{t.logout}</button>
          <button onClick={deleteAccount} className="mt-2 w-full rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm font-black text-rose-100 transition hover:bg-rose-400/20 hover:text-white">{tr(t, 'deleteAccount', 'Delete account')}</button>
          <p className="mt-2 px-2 text-[0.68rem] font-bold leading-5 text-white/35">{tr(t, 'deleteAccountNote', 'Deletes your private plans. Public/shared plans stay anonymized for others.')}</p>
        </div>
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

function Hero({ owner, groups, currentUser, selectedDate, setSelectedDate, plan, activities, language, t }: { owner: PlanOwner; groups: HealthGroup[]; currentUser: LoginUser; selectedDate: string; setSelectedDate: (date: string) => void; plan: MealPlan; activities: Activity[]; language: LanguageCode; t: Record<string, string> }) {
  const doneMeals = completedMeals(plan, currentUser.key);
  const totalMeals = mealTotal(plan);
  const doneActivities = completedActivities(activities, currentUser.key);
  const totalActivities = activityTotal(activities);
  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.09] p-3 text-white shadow-[0_28px_100px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:rounded-[2rem] sm:p-4 md:rounded-[2.2rem] md:p-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
        <div className="relative overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-emerald-400/[0.14] p-4 ring-1 ring-white/10 sm:rounded-[1.6rem] sm:p-5 md:rounded-[1.8rem] md:p-8">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-300/25 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.18em] text-emerald-100 sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.26em]">{ownerLabel(owner, currentUser, groups, t)} {tr(t, 'dashboard', 'dashboard')}</span>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.16em] text-white/50 sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.22em]">{lengthText(plan.length, t)}</span>
            </div>
            <h1 className="mt-4 max-w-3xl text-[2.45rem] font-black leading-[0.92] tracking-[-0.08em] sm:text-5xl md:mt-6 md:text-7xl">{displayPlanTitle(plan, owner, currentUser, groups, t)}</h1>
            <p className="mt-3 text-sm font-semibold capitalize text-white/50 sm:text-base md:mt-5 md:text-lg">{formatDate(selectedDate, language)} · {currentUser.name}</p>
            <div className="mt-5 flex flex-wrap gap-2 sm:gap-3 md:mt-7">
              <input className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs font-black text-white outline-none [color-scheme:dark] sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
              <button onClick={() => setSelectedDate(today())} className="rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-xs font-black text-white/75 transition hover:bg-white/15 hover:text-white sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">{tr(t, 'todayButton', 'Today')}</button>
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <MetricCard title={tr(t, 'meals', 'Meals')} value={`${doneMeals}/${totalMeals}`} note={tr(t, 'eatenToday', 'eaten today')} tone="green" />
          <MetricCard title={t.training} value={`${doneActivities}/${totalActivities}`} note={tr(t, 'activitiesDone', 'activities done')} tone="blue" />
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

function TabBar({ tab, setTab, t }: { tab: Tab; setTab: (tab: Tab) => void; t: Record<string, string> }) {
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'today', label: t.today, icon: '☑' },
    { id: 'calendar', label: t.calendar, icon: '◷' },
    { id: 'bank', label: t.bank, icon: '▣' },
    { id: 'shared', label: t.shared, icon: '◎' },
    { id: 'training', label: t.training, icon: '↗' },
  ];
  return (
    <div className="sticky top-3 z-20 rounded-[1.7rem] border border-white/10 bg-black/30 p-2 shadow-[0_20px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
      <div className="grid gap-2 md:grid-cols-5">
        {tabs.map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)} className={`flex items-center justify-center gap-2 rounded-[1.25rem] px-4 py-3 text-sm font-black transition ${tab === item.id ? 'bg-white text-slate-950 shadow-xl' : 'text-white/50 hover:bg-white/[0.08] hover:text-white'}`}>
            <span>{item.icon}</span>{item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function WeekStrip({ dates, selectedDate, setSelectedDate, language }: { dates: string[]; selectedDate: string; setSelectedDate: (date: string) => void; language: LanguageCode }) {
  return (
    <section className="grid grid-cols-7 gap-1.5 sm:gap-2 md:gap-3">
      {dates.map((date, index) => {
        const active = date === selectedDate;
        const parsed = toDate(date);
        return (
          <button key={date} onClick={() => setSelectedDate(date)} className={`group min-w-0 overflow-hidden rounded-2xl border px-1 py-2 text-center shadow-lg transition hover:-translate-y-0.5 sm:rounded-[1.25rem] sm:px-2 sm:py-3 md:rounded-[1.55rem] md:p-4 md:text-left md:shadow-xl ${active ? 'border-emerald-300/35 bg-emerald-300 text-slate-950 shadow-emerald-900/20' : 'border-white/10 bg-white/[0.08] text-white backdrop-blur-xl hover:bg-white/[0.12]'}`}>
            <p className={`truncate text-[0.58rem] font-black uppercase tracking-[0.08em] sm:text-[0.65rem] sm:tracking-[0.14em] md:text-xs md:tracking-[0.2em] ${active ? 'text-slate-700' : 'text-white/40'}`}>{localizedWeekdays(language)[index]}</p>
            <p className="mt-1 text-xl font-black tracking-[-0.08em] sm:text-2xl md:mt-2 md:text-3xl">{parsed.getDate()}</p>
            <p className={`mt-0.5 truncate text-[0.6rem] font-bold capitalize sm:text-xs md:mt-1 ${active ? 'text-slate-700' : 'text-white/40'}`}>{parsed.toLocaleDateString(localeByLanguage[language], { month: 'short' })}</p>
          </button>
        );
      })}
    </section>
  );
}

function PlannerHeader({ plan, canEdit, t, onTitle, onLength, onSave, onDelete, onSaveFoodDay, onSaveFullDay, onSaveWeek, onAddMeal }: { plan: MealPlan; canEdit: boolean; t: Record<string, string>; onTitle: (title: string) => void; onLength: (length: PlanLength) => void; onSave: () => void; onDelete: () => void; onSaveFoodDay: () => void; onSaveFullDay: () => void; onSaveWeek: () => void; onAddMeal: () => void }) {
  return (
    <section className={`${card} p-5 md:p-6`}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <p className="eyebrow">{tr(t, 'mealPlanner', 'Meal planner')}</p>
          <input disabled={!canEdit} className="mt-2 w-full border-0 bg-transparent text-4xl font-black tracking-[-0.08em] text-white outline-none placeholder:text-white/20 md:text-5xl" value={plan.title} onChange={(event) => onTitle(event.target.value)} />
          <p className="mt-3 text-sm font-semibold text-white/40">{tr(t, 'mealPlannerHelp', 'Set up meals, save the day, or build the full week as a template.')}</p>
        </div>
        <div className="grid gap-3">
          <select disabled={!canEdit} className={darkInput} value={plan.length} onChange={(event) => onLength(event.target.value as PlanLength)}>
            <option value="day">{tr(t, 'day', 'Day')}</option>
            <option value="week">{tr(t, 'week', 'Week')}</option>
            <option value="ongoing">{tr(t, 'ongoing', 'Ongoing')}</option>
          </select>
          <button disabled={!canEdit} onClick={onSave} className={greenButton}>{tr(t, 'saveTodayPlan', 'Save today plan')}</button>
        </div>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <button disabled={!canEdit} onClick={onAddMeal} className={softDarkButton}>{tr(t, 'addMeal', '+ Meal')}</button>
        <button disabled={!canEdit} onClick={onSaveFoodDay} className={softDarkButton}>{tr(t, 'saveFoodDay', 'Save food day')}</button>
        <button disabled={!canEdit} onClick={onSaveFullDay} className={softDarkButton}>{tr(t, 'saveFullDay', 'Save full day')}</button>
        <button disabled={!canEdit} onClick={onSaveWeek} className={primaryButton}>{tr(t, 'saveWeek', 'Save week')}</button>
        <button disabled={!canEdit || !plan._id} onClick={onDelete} className={dangerButton}>{tr(t, 'clear', 'Clear')}</button>
      </div>
    </section>
  );
}

function MealOverview({ meals, canEdit, currentUser, onToggle, onEdit, onRemove, onSaveMeal, t }: { meals: Meal[]; canEdit: boolean; t: Record<string, string>; currentUser: UserKey; onToggle: (mealId: string) => void; onEdit: (mealId: string) => void; onRemove: (mealId: string) => void; onSaveMeal: (meal: Meal) => void }) {
  return (
    <section className={`${card} p-5 md:p-6`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{tr(t, 'todayMeals', 'Today meals')}</p>
          <h3 className="mt-2 text-4xl font-black tracking-[-0.08em] text-white">{tr(t, 'mealOverview', 'Meal overview')}</h3>
          <p className="mt-2 text-sm font-semibold text-white/40">{tr(t, 'mealOverviewHelp', 'Compact view. Click the pen to edit.')}</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white/50">{meals.length} {tr(t, 'mealCount', 'meals')}</div>
      </div>
      <div className="mt-5 space-y-3">
        <Empty show={meals.length === 0} text={tr(t, 'noMealsYet', 'No meal created yet.')} />
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

function TrainingPanel({ activities, canEdit, currentUser, draft, setDraft, addActivity, updateActivity, deleteActivity, saveActivity, saveTrainingDay, large, t }: { activities: Activity[]; t: Record<string, string>; canEdit: boolean; currentUser: UserKey; draft: { title: string; time: string; comment: string }; setDraft: (draft: { title: string; time: string; comment: string }) => void; addActivity: () => void; updateActivity: (activity: Activity, patch: Partial<Activity>) => void; deleteActivity: (id?: string) => void; saveActivity: (activity: Activity) => void; saveTrainingDay: () => void; large?: boolean }) {
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

function CalendarPanel({ calendarMonth, setCalendarMonth, days, selectedDate, selectDate, weekPlans, applyWeekPlan, deleteWeekPlan, language, t }: { calendarMonth: string; language: LanguageCode; t: Record<string, string>; setCalendarMonth: (date: string) => void; days: CalendarDay[]; selectedDate: string; selectDate: (date: string) => void; weekPlans: SavedWeekPlan[]; applyWeekPlan: (plan: SavedWeekPlan) => void; deleteWeekPlan: (id?: string) => void }) {
  const activeDay = days.find((day) => day.date === selectedDate);
  return (
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_390px]">
      <section className={`${card} p-4 md:p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">{t.calendar}</p>
            <h2 className="mt-2 text-4xl font-black capitalize tracking-[-0.08em] text-white md:text-5xl">{monthLabel(calendarMonth, language)}</h2>
            <p className="mt-2 text-sm font-semibold text-white/40"></p>
          </div>
          <div className="flex gap-2">
            <button className={softDarkButton} onClick={() => setCalendarMonth(prevMonth(calendarMonth))}>←</button>
            <button className={softDarkButton} onClick={() => setCalendarMonth(monthStart(today()))}>{tr(t, 'todayButton', 'Today')}</button>
            <button className={softDarkButton} onClick={() => setCalendarMonth(nextMonth(calendarMonth))}>→</button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-1.5 md:gap-2">
          {localizedWeekdays(language).map((day) => <p key={day} className="px-1 text-center text-[10px] font-black uppercase tracking-[0.16em] text-white/35 md:text-xs">{day}</p>)}
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
        <p className="eyebrow">{tr(t, 'selectedDay', 'Selected day')}</p>
        <h3 className="mt-2 text-4xl font-black tracking-[-0.08em] text-white capitalize">{formatDate(selectedDate, language)}</h3>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <DarkStat label={tr(t, 'meals', 'Meals')} value={activeDay ? `${activeDay.completedMeals}/${activeDay.totalMeals}` : '0/0'} />
          <DarkStat label={t.training} value={activeDay ? `${activeDay.completedActivities}/${activeDay.totalActivities}` : '0/0'} />
        </div>
        <div className="mt-7 rounded-[1.7rem] border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200/75">{tr(t, 'weekPlans', 'Week plans')}</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/50">{tr(t, 'applyWeekHelp', 'Apply a saved week to selected week.')}</p>
          <div className="mt-4 space-y-3">
            <Empty show={weekPlans.length === 0} text={tr(t, 'noWeekPlans', 'Save a week from Today plan and it will appear here.')} />
            {weekPlans.map((plan) => <MiniCard key={plan._id || plan.title} title={plan.title} meta={`${plan.days.length} ${tr(t, 'day', 'days')} · mat + träning`} onUse={() => applyWeekPlan(plan)} onDelete={() => deleteWeekPlan(plan._id)} />)}
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

function BankPanel({ meals, activities, dayPlans, weekPlans, oldDayTemplates, addSavedMeal, updateSavedMeal, addSavedActivity, useDayPlan, applyWeekPlan, deleteMeal, deleteSavedActivity, deleteDayPlan, deleteWeekPlan, publishMeal, publishDay, publishWeek, t }: { meals: SavedMeal[]; activities: SavedActivity[]; dayPlans: SavedDayPlan[]; weekPlans: SavedWeekPlan[]; oldDayTemplates: SavedMealPlan[]; addSavedMeal: (meal: SavedMeal) => void; updateSavedMeal: (meal: SavedMeal, patch: Partial<SavedMeal>) => void; addSavedActivity: (activity: SavedActivity) => void; useDayPlan: (plan: SavedDayPlan) => void; applyWeekPlan: (plan: SavedWeekPlan) => void; deleteMeal: (id?: string) => void; deleteSavedActivity: (id?: string) => void; deleteDayPlan: (id?: string) => void; deleteWeekPlan: (id?: string) => void; publishMeal: (meal: SavedMeal) => void; publishDay: (plan: SavedDayPlan) => void; publishWeek: (plan: SavedWeekPlan) => void; t: Record<string, string> }) {
  return (
    <section className={`${card} p-5 md:p-6`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t.bank}</p>
          <h2 className="mt-2 text-5xl font-black tracking-[-0.08em] text-white">{tr(t, 'savedLibrary', 'Saved library')}</h2>
          <p className="mt-2 text-sm font-semibold text-white/40">{tr(t, 'bankHelp', 'Reuse privately, share in a group, or publish.')}</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white/50">{meals.length + activities.length + dayPlans.length + weekPlans.length} {tr(t, 'templates', 'templates')}</div>
      </div>
      <div className="mt-7 grid gap-5 xl:grid-cols-2 2xl:grid-cols-4">
        <BankColumn title={tr(t, 'meals', 'Meals')} icon="🍳"><Empty show={meals.length === 0} text={tr(t, 'noSavedMeals', 'Save a meal from a meal card.')} />{meals.map((meal) => <SavedMealCard key={meal._id || meal.title} meal={meal} onUse={() => addSavedMeal(meal)} onUpdate={(patch) => updateSavedMeal(meal, patch)} onDelete={() => deleteMeal(meal._id)} onPublish={() => publishMeal(meal)} publishLabel={t.publish} />)}</BankColumn>
        <BankColumn title={tr(t, 'activities', 'Activities')} icon="⚡"><Empty show={activities.length === 0} text={tr(t, 'noSavedActivities', 'Save an activity from the training card.')} />{activities.map((activity) => <MiniCard key={activity._id || activity.title} title={activity.title} meta={activity.time || 'Ingen tid'} onUse={() => addSavedActivity(activity)} onDelete={() => deleteSavedActivity(activity._id)} />)}</BankColumn>
        <BankColumn title={tr(t, 'dayPlans', 'Day plans')} icon="☑"><Empty show={dayPlans.length === 0 && oldDayTemplates.length === 0} text={tr(t, 'noDayPlans', 'Save a day plan.')} />{dayPlans.map((plan) => <MiniCard key={plan._id || plan.title} title={plan.title} meta={`${kindText(plan.kind, t)} · ${plan.meals.length} ${tr(t, 'mealCount', 'meals')} · ${plan.activities.length} ${tr(t, 'activities', 'activities')}`} onUse={() => useDayPlan(plan)} onDelete={() => deleteDayPlan(plan._id)} onPublish={() => publishDay(plan)} publishLabel={t.publish} />)}{oldDayTemplates.map((template) => <MiniCard key={template._id || template.title} title={template.title} meta={`${tr(t, 'oldTemplate', 'Old template')} · ${template.meals.length} ${tr(t, 'mealCount', 'meals')}`} onUse={() => useDayPlan({ owner: template.owner, title: template.title, kind: 'food', meals: template.meals, activities: [], createdBy: template.createdBy })} />)}</BankColumn>
        <BankColumn title={tr(t, 'weekPlans', 'Week plans')} icon="◷"><Empty show={weekPlans.length === 0} text={tr(t, 'noSavedWeekPlans', 'Save the full week from Today plan.')} />{weekPlans.map((plan) => <MiniCard key={plan._id || plan.title} title={plan.title} meta={`${plan.days.length} ${tr(t, 'day', 'days')}`} onUse={() => applyWeekPlan(plan)} onDelete={() => deleteWeekPlan(plan._id)} onPublish={() => publishWeek(plan)} publishLabel={t.publish} />)}</BankColumn>
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

function SavedMealCard({ meal, onUse, onUpdate, onDelete, onPublish, publishLabel = 'Publicera' }: { meal: SavedMeal; onUse: () => void; onUpdate: (patch: Partial<SavedMeal>) => void; onDelete: () => void; onPublish?: () => void; publishLabel?: string }) {
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
      <div className="mt-3 grid gap-2 sm:grid-cols-2"><button onClick={onUse} className={`${miniButton} w-full border-white/10 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white`}>Använd / lägg in</button>{onPublish && <button onClick={onPublish} className={`${miniButton} w-full border-emerald-300/20 bg-emerald-300/15 text-emerald-100 hover:bg-emerald-300/25`}>{publishLabel}</button>}</div>
    </article>
  );
}

function MiniCard({ title, meta, onUse, onDelete, onPublish, publishLabel = 'Publicera' }: { title: string; meta: string; onUse: () => void; onDelete?: () => void; onPublish?: () => void; publishLabel?: string }) {
  return (
    <article className="rounded-[1.4rem] border border-white/10 bg-white/[0.07] p-4 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-base font-black tracking-[-0.04em] text-white">{title}</h4>
          <p className="mt-1 text-xs font-bold text-white/40">{meta}</p>
        </div>
        {onDelete && <button onClick={onDelete} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-black text-white/40 hover:bg-rose-400/15 hover:text-rose-200">×</button>}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2"><button onClick={onUse} className={`${miniButton} w-full border-white/10 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white`}>Använd / lägg in</button>{onPublish && <button onClick={onPublish} className={`${miniButton} w-full border-emerald-300/20 bg-emerald-300/15 text-emerald-100 hover:bg-emerald-300/25`}>{publishLabel}</button>}</div>
    </article>
  );
}

function SharedPlansPanel({ plans, currentUser, selectedDate, copyPlan, deletePlan, t, language }: { plans: PublicSharedPlan[]; language: LanguageCode; currentUser: LoginUser; selectedDate: string; copyPlan: (plan: PublicSharedPlan) => void; deletePlan: (id?: string) => void; t: Record<string, string> }) {
  const [filter, setFilter] = useState<'all' | PublicSharedPlan['type']>('all');
  const visiblePlans = filter === 'all' ? plans : plans.filter((plan) => plan.type === filter);
  const filters: { id: 'all' | PublicSharedPlan['type']; label: string }[] = [
    { id: 'all', label: tr(t, 'all', 'All') },
    { id: 'meal', label: tr(t, 'sharedMeals', 'Meals') },
    { id: 'day', label: tr(t, 'dayPlansFilter', 'Day plans') },
    { id: 'week', label: tr(t, 'weekPlansFilter', 'Week plans') },
    { id: 'training', label: tr(t, 'trainingFilter', 'Training') },
  ];

  return (
    <section className={`${card} p-5 md:p-6`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{tr(t, 'community', 'Community')}</p>
          <h2 className="mt-2 text-4xl font-black tracking-[-0.08em] text-white md:text-6xl">{t.shared}</h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/45">{t.sharedSubtitle}</p>
          <p className="mt-2 text-xs font-bold text-emerald-100/60">{tr(t, 'copyTo', 'Copied to')}: {formatDate(selectedDate, language)} · {currentUser.name}</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white/50">{plans.length} {tr(t, 'public', 'public')}</div>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => (
          <button key={item.id} onClick={() => setFilter(item.id)} className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition ${filter === item.id ? 'bg-white text-slate-950' : 'border border-white/10 bg-white/[0.06] text-white/50 hover:bg-white/[0.1] hover:text-white'}`}>{item.label}</button>
        ))}
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        <Empty show={visiblePlans.length === 0} text={tr(t, 'noPublishedPlans', 'No published plans yet.')} />
        {visiblePlans.map((plan) => <SharedPlanCard key={plan._id || plan.title} plan={plan} currentUser={currentUser} copyPlan={copyPlan} deletePlan={deletePlan} t={t} />)}
      </div>
    </section>
  );
}

function SharedPlanCard({ plan, currentUser, copyPlan, deletePlan, t }: { plan: PublicSharedPlan; currentUser: LoginUser; copyPlan: (plan: PublicSharedPlan) => void; deletePlan: (id?: string) => void; t: Record<string, string> }) {
  const canDelete = currentUser.role === 'admin' || plan.publishedBy === currentUser.key;
  const mealCount = plan.type === 'meal' ? (plan.meals?.[0]?.items.length || 0) : plan.dayPlan ? plan.dayPlan.meals.length : plan.weekPlan ? plan.weekPlan.days.reduce((sum, day) => sum + day.meals.length, 0) : 0;
  const activityCount = plan.dayPlan ? plan.dayPlan.activities.length : plan.weekPlan ? plan.weekPlan.days.reduce((sum, day) => sum + day.activities.length, 0) : 0;
  const typeLabel = plan.type === 'meal' ? 'Meal' : plan.type === 'week' ? 'Week plan' : plan.type === 'training' ? 'Training' : 'Day plan';

  return (
    <article className="group overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/[0.07] p-4 shadow-2xl transition hover:-translate-y-1 hover:bg-white/[0.1] md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-300/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">{typeLabel}</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{languageNames[plan.language || 'en']}</span>
          </div>
          <h3 className="mt-4 text-2xl font-black tracking-[-0.07em] text-white md:text-3xl">{plan.title}</h3>
          <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-white/45">{plan.description || 'No description yet.'}</p>
        </div>
        {canDelete && <button onClick={() => deletePlan(plan._id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-black text-white/35 hover:bg-rose-400/15 hover:text-rose-100">×</button>}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <DarkStat label="Food" value={String(mealCount)} />
        <DarkStat label="Training" value={String(activityCount)} />
        <DarkStat label="Copies" value={String(plan.copies || 0)} />
      </div>

      {Array.isArray(plan.tags) && plan.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{plan.tags.map((tag) => <span key={tag} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/40">#{tag}</span>)}</div>}

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-xs font-bold text-white/35">By {plan.publishedByName || 'Health user'}</p>
        <button onClick={() => copyPlan(plan)} className={`${greenButton} shrink-0 py-2`}>{t.copy}</button>
      </div>
    </article>
  );
}


function ProgressPanel({ plan, activities, currentUser, t }: { plan: MealPlan; t: Record<string, string>; activities: Activity[]; currentUser: UserKey }) {
  const foodProgress = progress(completedMeals(plan, currentUser), mealTotal(plan));
  const trainingProgress = progress(completedActivities(activities, currentUser), activityTotal(activities));
  return (
    <section className="overflow-hidden rounded-[2rem] border border-emerald-300/20 bg-gradient-to-br from-emerald-300/20 via-white/[0.08] to-sky-300/10 p-5 text-white shadow-[0_24px_90px_rgba(0,0,0,0.30)] backdrop-blur-2xl">
      <p className="eyebrow">{tr(t, 'status', 'Status')}</p>
      <h3 className="mt-3 text-4xl font-black tracking-[-0.08em]">{tr(t, 'todayCheck', 'Today check')}</h3>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <DarkStat label={tr(t, 'food', 'Food')} value={`${foodProgress}%`} />
        <DarkStat label={tr(t, 'meals', 'Meals')} value={`${completedMeals(plan, currentUser)}/${mealTotal(plan)}`} />
        <DarkStat label={t.training} value={`${trainingProgress}%`} />
        <DarkStat label={tr(t, 'plan', 'Plan')} value={lengthText(plan.length, t)} />
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
