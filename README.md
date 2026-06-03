# HealthApp 2026

Version: **0.6.3**

A private Next.js + MongoDB health planner for meals, training, saved routines, day plans, week plans and calendar follow-up.

## What changed in v0.6.3

### Account deletion

Users can now delete their own account from the sidebar account section.

When an account is deleted:

- the user's private meal plans are deleted
- private activities are deleted
- saved meals, activities, day plans and week plans owned by the user are deleted
- health tips created by the user are deleted
- the user is removed from group member lists
- if the user owned a group with other members, ownership is transferred to the next member
- empty groups are deleted
- public/shared plans are **not deleted**; they are anonymized as `Deleted user` so other people can still keep using or copying them

New API route:

```txt
DELETE /api/auth/account
```

This route clears the session cookie after deleting the account.


## What changed in v0.3.0

### Day plans

You can now save the current day as:

- **Matdag** — only the meals for the selected date.
- **Träningsdag** — only the activities for the selected date.
- **Full dagsplan** — both meals and activities.

Saved day plans are stored in the new MongoDB collection:

```txt
savedDayPlans
```

### Week plans

You can now save a complete Monday–Sunday week as a reusable week plan. The week plan stores meals and activities for each weekday.

Saved week plans are stored in:

```txt
savedWeekPlans
```

A saved week plan can be applied from the **Kalender** or **Bank** tab. It will place the plan across Monday–Sunday based on the currently selected week.

### Saved activity bank

Activities can now be saved as reusable single activity templates, just like meals.

Saved activities are stored in:

```txt
savedActivities
```

### Calendar view

The new calendar view shows:

- days with meals
- days with training
- completed meal count
- completed activity count
- click any date to open that day plan
- apply a saved week plan into the selected week

### Cleaner app structure

The UI is still Tailwind-only, but styled more like a clean dashboard inspired by shadcn/material patterns:

- rounded cards
- clean tab navigation
- sidebar app shell
- better calendar layout
- clearer bank sections
- progress cards
- reusable meal/activity/day/week blocks

## New API routes

```txt
GET/POST    /api/saved-activities
DELETE      /api/saved-activities/[id]

GET/POST    /api/day-plans
DELETE      /api/day-plans/[id]

GET/POST    /api/week-plans
DELETE      /api/week-plans/[id]
```

Existing routes were extended:

```txt
GET /api/plans?start=YYYY-MM-DD&end=YYYY-MM-DD
GET /api/activities?start=YYYY-MM-DD&end=YYYY-MM-DD
```

These are used by the calendar.

## Next recommended version: v0.4.0

Good next improvements:

1. Drag and drop meals/activities inside a day.
2. Drag saved meals/activities directly into the calendar.
3. Shopping list generated from week plan meals.
4. Nutrition fields per meal: protein, carbs, fat, kcal.
5. Recurring plans, for example every Monday or every training week.
6. Real auth instead of local password check.
7. More advanced check-in: mood, weight, sleep, water, supplements.
8. Mobile bottom navigation.

## Local setup

```bash
npm install
npm run dev
```

Create `.env.local` from `.env.example` and add your MongoDB connection string.



## v0.4.0 Design dashboard pass

This version changes the visual direction from a plain/table-like layout into a darker premium dashboard inspired by Vercel/v0/shadcn style:

- Dark glass dashboard shell with sidebar navigation.
- Sticky app menu/tabs instead of flat spreadsheet-like buttons.
- Hero status section with meal/training metrics.
- Modern meal cards with checklist button, editable content, saved meal action and card UI.
- Calendar redesigned into a card-based month planner instead of a plain grid/table feeling.
- Bank redesigned as a visual library for meals, activities, day plans and week plans.
- No new UI library dependency was added yet; the styling is Tailwind-only so the app stays simple to run.

Recommended next step: migrate the repeated buttons/cards/inputs into real reusable shadcn-style components, or install shadcn/ui if you want the official component structure.

## v0.4.1 Tailwind/PostCSS hotfix

This version pins Tailwind to v3 because the project uses the classic Tailwind config and `@tailwind base/components/utilities` setup.

If you already ran `npm install` and got the Tailwind v4 PostCSS error, clean your install first:

```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

On Windows PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
npm run dev
```



## v0.4.3 Tailwind v4 fix

This version uses Tailwind CSS v4 compatible PostCSS setup:

```js
// postcss.config.mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

And `app/globals.css` now starts with:

```css
@import "tailwindcss";
```

If you had the previous install locally, delete `node_modules` and `package-lock.json`, then run `npm install` again.


## v0.4.3 — Meal CRUD upgrade

- Ny meal builder ovanför dagens måltider: skriv eget namn, tid, första innehåll och anteckningar direkt.
- Måltidskort har nu rad-för-rad CRUD för mat: lägg till en eller flera items, redigera varje item inline och radera enskilda items.
- Måltidsnamn är tydligare med label och placeholder för t.ex. Förmiddags mellanmål, Eftermiddags mellanmål och Kvällsmål.
- Sparade måltider i banken går nu att redigera inline: namn, tid, innehåll, anteckningar, lägga till mat och radera items.
- Bevarar Tailwind v4-fixen från v0.4.2.


## v0.4.5 - Vercel build hotfix

Fixed MongoDB TypeScript insert typing for Vercel/Next production builds. API route insert documents now omit the top-level `_id` field before calling `insertOne`, so MongoDB can create the `ObjectId` itself.

Affected collections:

- `mealPlans`
- `healthTips`
- `savedMealPlans`
- `activities`
- `savedMeals`
- `savedActivities`
- `savedDayPlans`
- `savedWeekPlans`


## v0.4.5 UX hotfix

- Kompakt kalender på desktop med mindre datumrutor i 7-kolumners full view.
- Måltider visas nu som en ren översiktslista med checkbox och ikonknappar.
- Skapa/redigera måltid sker i modal i stället för stora kort på sidan.
- Full CRUD på mat-items ligger kvar i modalen.
- Hälsotips API serialiserar Mongo `_id` till string och Tips-sidan visar felmeddelande samt stödjer ändra/ta bort.
- Auth/login-signup är planerad till nästa större version.


## v0.4.6

- Dagens plan / WeekStrip är nu kompakt även på mobil.
- Veckans sju datum visas som små rutor bredvid varandra istället för fullbredd-kort.
- Kalendern och övriga vyer är inte ändrade i denna patch.

## v0.5.0 - Auth + private/shared workspaces

- Replaced the old hardcoded Robert/Erika local login with database-backed signup/login.
- Users are saved in MongoDB `users` collection with salted PBKDF2 password hashes.
- Signup creates an email confirmation token and sends a welcome/confirmation email when SMTP is configured.
- Local development fallback logs the confirmation URL to the server console and returns it from `/api/auth/signup`.
- Session is stored in an httpOnly cookie.
- Each user gets a private workspace owner key: `user:<id>`.
- Users can create share groups in MongoDB `groups` collection.
- Groups can have max 10 members.
- Group workspaces use owner key `group:<id>`.
- Meals, meal plans, day plans, week plans, saved meals and activities can now be private or shared through the selected group workspace.
- Group members can add/edit the shared meal and training plans, similar to a Messenger-style group but for food/training planning.

### Auth environment variables

```env
JWT_SECRET="change-this-to-a-long-random-secret"
NEXT_PUBLIC_APP_URL="https://your-vercel-domain.vercel.app"
```

For real confirmation emails, add SMTP settings in Vercel:

```env
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_SECURE="false"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-gmail-app-password"
EMAIL_FROM="Your Health <your-email@gmail.com>"
```

Accounts are active immediately after signup. The app sends a welcome email only; no confirmation link is required.


## v0.5.1 env compatibility

The app now supports the env names used in the Funkcamp-style auth setup:

```env
JWT_SECRET="change-this-to-a-long-random-secret"
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-gmail-app-password"
EMAIL_FROM="Your Health <your-email@gmail.com>"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

v0.6.0 uses only `JWT_SECRET` and the `EMAIL_*` variables. Old `AUTH_SECRET` / `SMTP_*` aliases were removed.

For Gmail, generate an App Password in Google Account settings and rotate it if it has ever been shared outside Vercel/local `.env.local`.

## v0.6.0 — Shared Plans / Community Library

Added a first version of **Shared plans**:

- New app tab: `Delade planer / Shared plans`.
- Public shared plans are stored in MongoDB collection `publicSharedPlans`.
- Users can publish saved meals, saved day plans and saved week plans from the Bank.
- Other logged-in users can copy a public shared meal to the selected day.
- Other logged-in users can copy a public day plan to the selected date.
- Other logged-in users can copy a public week plan to the week that contains the selected date.
- Public plans keep basic stats: copies, likes, publishedBy and publishedByName.
- Admins or the publishing user can delete shared plans.

Also added a first manual language foundation:

- Svenska
- English
- Suomi
- Español
- Português
- 日本語
- 中文

This is manual interface translation, not automatic external translation. This keeps the app free from paid API dependencies. Future versions can expand the dictionary across all UI text or add optional AI/manual translation for public plan descriptions.

### Admin roles

Set admin emails in `.env.local` / Vercel:

```env
ADMIN_EMAILS="your@email.com,partner@email.com"
```

When those emails sign up, their user document gets:

```json
{ "role": "admin" }
```

Existing users can be upgraded in MongoDB by setting `role` to `admin` in the `users` collection.
