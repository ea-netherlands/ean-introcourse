# EA Netherlands — Intro Fellowship Platform

Platform for the EA Netherlands intro course/fellowship: applicants apply, an admin accepts
them into cohort groups, participants work through 5 weeks of lessons (scraped from Circle)
with quizzes and exercises, facilitators plan weekly online sessions and follow their group.

- Repo: github.com/ea-netherlands/ean-introcourse — branch **`master`**
- **Live** at https://introcourse.effectiefaltruisme.nl (Vercel, deployed since 2026-09-09).
  Pushing to `master` deploys to production — treat every push as a release.
- Contact address everywhere in UI and emails: programmes@effectiefaltruisme.nl
- Course facts (confirmed 2026-11-05): 5 weeks, weekly 75-minute online discussions,
  ~3.5 h prep per week, free.

## Rules from the project owner

- `ean-office-main/` (sibling app, same org/toolchain) is **read-only reference** — never modify it.
- All UI text in **English** (the owner may write to you in Dutch; answer in their language).
- **No emoji in navigation.** (✅/❌ on quiz answers in the facilitator overview is wanted.)
- Navigation identical on every page. Facilitator nav: `Materials | My account | Group chat | Sessions | Overview`.
- **Ask before every `git push` and every production deploy.** Prefer a branch + PR.
  Feature pushes by the owner use title/description "extra functions [date]".
- The owner runs `npm run dev` themself in a visible terminal. Stop any dev server you start.
- Test changes in the browser after each batch, extensively.
- The owner is not deeply technical: explain backend/DB/infra in plain language.
- Admin UIs should be dense and fill the page; expect layout iteration from annotated screenshots.
- Don't read `.env.local` secrets to log in yourself; ask the owner to log in.

## Architecture

- **Framework:** Next.js 16 App Router + Turbopack, React 19, TypeScript strict (`@/*` → `./src/*`)
- **Database:** Drizzle ORM + PGlite (local dev, `data/introcourse-db/`) / Neon Postgres
  (production, via `DATABASE_URL`). `src/db/index.ts` picks the mode, lazily so PGlite never
  starts at build time, and exports `db`, `ensureMigrated` and `export * from "./schema"`.
- **Email:** Resend via `src/lib/email.ts` (falls back to console + `email_log` table when
  `RESEND_API_KEY` is absent). Reply-to is programmes@….
- **Styles:** Tailwind CSS v4 (no config file — `postcss.config.mjs` + `@theme`/`@utility` in
  `src/app/globals.css`) plus CSS variables (`--bg-page`, `--bg-card`, `--text-primary`,
  `--text-muted`, `--border`, `--color-ea-teal` = `#16879C`). Dark/light via `data-theme` on `<html>`.
- **Look = effectiefaltruisme.nl** (repo `ea-netherlands/ean-website`, Chakra UI; its quick course in
  `src/components/course/` is the model for our lesson pages). Stone (warm grey) neutrals, which
  `globals.css` puts into the `slate-*` names so existing classes follow; EA teal; Sentient headings at
  weight 500. Page frame (owner's choice, Nov 2026): `graph-paper` background (same recipe as the
  site) over the whole page, with content as cards (`card-ean`) directly on it; `.page-column` only
  centres at 64rem and is transparent. Shared chrome: `SiteHeader` (white,
  sticky, 32px EAN logo, role-based nav with EAN nav-item colours, theme toggle), `SiteFooter`
  (teal-800), `PublicShell` (header + paper + column + footer for login/apply/onboard/signup/graduated).
  Lessons: menu card fixed on the left (lg+), lesson text in its own card next to it; teal week
  eyebrow, 30/36px h1, prose at 18px/1.7.
  Building blocks: `card-ean` (12px radius, inset key shadow + soft lift), `badge-ean`, `btn-pill` +
  `btn-pill-primary`/`-secondary` (16px radius), `mark.marker` (max one per section). Logos in
  `public/images/logos/` (white variant in dark mode). Admin uses logo and palette but stays plain.
  The EAN site itself has no dark mode; ours is kept and mirrors the tokens.
- **Fonts:** self-hosted Atkinson Hyperlegible Next (body) + Sentient (headings), `src/app/fonts.ts`
- **Content:** scraped lesson JSON in `content/lessons/` (54 files,
  `{title, counter, url, html, images, files, videos, scrapedAt}`); `html` is injected via
  `dangerouslySetInnerHTML` in `src/app/materials/[slug]/[lessonId]/page.tsx`. There is no MDX
  pipeline — `content/modules/` does not exist; `src/lib/modules.ts` is vestigial (only its
  `ModuleFrontmatter` type is used). PDFs in `public/assets/files/`.
- **Re-scraping Circle:** `scripts/circle-scraper/` (see its README). `scrape.js` drives the
  user's own logged-in debug Chrome; `scrape-quiz-results.js` reads quiz questions plus Circle's
  "Correct" verdicts from a finished quiz's results page (Circle's Nov 2026 layout no longer
  exposes quiz questions to `scrape.js`). Last re-scrape 2026-11-19: 31 lessons and the week
  titles changed; quizzes were unchanged, so their old HTML stays (the site's quiz parser expects
  Circle's previous markup).
- **Cron:** `vercel.json` → `/api/cron/daily` at 06:00 UTC, guarded by `CRON_SECRET`.

## Key paths

| Path | Purpose |
|---|---|
| `src/db/schema.ts` | Drizzle schema for all tables |
| `src/db/index.ts` | DB connection (PGlite/Postgres dual mode), `ensureMigrated()` |
| `src/lib/lessons.ts` | `WEEK_DEFS`: 5 weeks / 54 lessons (7/9/13/15/10); reads `content/lessons/` |
| `src/lib/quiz-parser.ts`, `src/lib/exercise-parser.ts` | Parse quizzes/exercises out of Circle HTML at render time |
| `src/lib/quiz-answers.ts` | Correct answers + explanations (16 quizzes). 13 answers (quizzes 3644621, 3644695, 3779929, 3779931, 3779969) confirmed against Circle on 2026-11-19; the other 17 are still AI-inferred |
| `src/lib/auth.ts` | Magic links, password login, session cookie, `getCurrentParticipant()` |
| `src/lib/calendar.ts` | Google/Outlook/.ics links; `SESSION_DURATION_MINUTES = 75` |
| `src/lib/email.ts` | `sendEmail()` wrapper (Resend + console fallback) |
| `src/middleware.ts` | Admin password gate for `/admin/*` and `/api/admin/*` |
| `src/app/api/cron/daily/route.ts` | Daily cron job |
| `src/components/sidebar.tsx` | Participant/facilitator sidebar navigation |

## Commands

```bash
npm run dev          # run from THIS folder (process.cwd() must find content/lessons)
npm run db:migrate   # apply migrations (local PGlite, or Neon via DATABASE_URL)
npx tsc --noEmit     # typecheck (passes as of 2026-11-12)
```

- `npm run db:seed` is **broken** (`src/scripts/seed.ts` doesn't exist). Never seed production.
- `GET /api/dev/latest-email` (dev only, 403 in prod) returns links from the latest logged email —
  handy for magic-link/onboarding tests without a real inbox.
- Local `.env.local`: omit `DATABASE_URL` to use PGlite; set `APP_URL=http://localhost:3000`,
  otherwise magic-link/onboarding redirects go to the production domain.

## Database & migrations

- Migrations are **hand-written** SQL in `drizzle/NNNN_*.sql` (`drizzle-kit generate` needs a TTY).
  Separate statements with `--> statement-breakpoint`; prefer `ADD COLUMN IF NOT EXISTS`.
  Every file **must** also be added by hand to `drizzle/meta/_journal.json` or it is silently skipped.
- Existing: 0000–0010 (`0008_group_timing`, `0009_application_study_field`, `0010_lesson_comments`). Ignore the stray
  `0000_new_the_fallen.sql` (not in the journal). Production build runs `db:migrate` first.
- `ensureMigrated()` caches per process → **restart the dev server after adding a migration**.
- PGlite allows **one process**: stop the dev server before `npm run db:migrate`.
- Tables: `participants` (role participant/facilitator/admin, status pending/active/completed,
  passwordHash, groupId, availability, bio, avatar_url), `groups`, `applications`, `login_tokens`,
  `onboarding_tokens`, `http_sessions`, `lesson_progress`, `lesson_responses`, `group_posts`
  (`group_id` NULL = General chat), `group_post_replies`, `fellowship_sessions`,
  `session_attendance`, `email_log`. `exercise_responses` and `modules` are legacy/dead.
- IDs via `newId(prefix)` in `src/lib/ids.ts` (`p_`, `f_`, `fs_`, …).

## Auth

- Participants/facilitators: magic link (`/auth/login` → `/api/auth/send-link`; tokens SHA-256
  hashed, 30 min, single use) or password
  (`/api/auth/password-login`). Cookie `ean_fellowship_session`, 7 days.
- `/api/auth/send-link` answers `{ ok, status }` with `sent`, `unknown`, `pending` or
  `rate_limited`, and the login page explains each one ("your email is not yet known to us… apply
  here"). Revealing that an address is unknown is a deliberate choice by the programme team.
- Accounts with status `pending` cannot sign in by either method (no link is sent, and
  `/auth/verify` re-checks). Magic links are rate-limited to 3 per address per 15 min (counted in
  `email_log`).
- Facilitators sign up at `/facilitator/signup` (status pending) and need admin approval
  (status → active) before they can log in. Admins can also add them at `/admin/facilitators`.
- Group pages/APIs use `canAccessGroup()` (`src/lib/auth.ts`): you only see the group in your own
  `participants.groupId`; role `admin` sees all. Facilitators are assigned to a group the same way.
- Admin: one shared password from `ADMIN_PASSWORD`; the cookie `ean_admin_session` is a signed,
  8-hour session made and checked in `src/lib/admin-session.ts` (Web Crypto, so it also runs in
  middleware); `DELETE /api/admin/auth` logs out. `src/middleware.ts` protects `/admin/*`
  and `/api/admin/*` (401 JSON), except `/api/admin/auth` and `/api/admin/forgot-password`.
  `POST /api/admin/sessions` is also open to active facilitators; the route checks that itself.
- An early admin password was hardcoded and is in git history — production must use a different one.

## Features

- **Applicant:** `/apply` 4-step form based on the Typeform; "Other" options open a free-text
  field (stored as "Other: …"); students answer field of study (`applications.study_field`)
  instead of occupation/work area. Accepted applicants get a 7-day `/onboard?token=` link to
  confirm availability and set a password; finished participants are sent to `/graduated`.
- **Participant:** `/materials/[slug]/[lessonId]` with progress bar, quizzes (locked after submit,
  score + explanations) and exercises; answers saved via `/api/exercises/submit` →
  `lesson_responses`. `/account` (profile, upcoming sessions + calendar links), `/chat`
  (General + My group), `/group/[groupId]`.
- **Lesson comments:** a "Discussion" card under every lesson (`src/components/lesson-comments.tsx`,
  API `/api/lessons/[lessonId]/comments[/commentId]`, table `lesson_comments`, migration 0010). Shared by the
  whole **cohort** (`groups.cohort`; a group without a cohort label is its own cohort), one level of
  replies, no notification emails (owner's choice). Delete: author, facilitator in the cohort, or role
  admin. Facilitators also see the latest cohort comments on `/group/[groupId]/overview`. Logic in
  `src/lib/comments.ts`.
- **Facilitator guide:** `/facilitator-guide` (active facilitators and role admin only; "Guide" in their
  header nav) embeds James's living Google Doc via its `/preview` URL, plus open/PDF links. Doc id in
  `src/lib/facilitator-guide.ts`, overridable with `FACILITATOR_GUIDE_DOC_ID`. The doc is shared
  "anyone with the link", so the page hides the link but the doc itself is not secret.
- **Facilitator:** `/sessions` plan sessions (repeat 1–8 weeks, per-session descriptions,
  optional auto-created Google Meet); `/group/[groupId]/overview` student progress + answers.
- **Admin:** `/admin` dashboard, applications (bulk accept/reject, delete), participants
  (table with bulk select/delete, prev/next on detail, CSV export), groups (timing,
  activate/deactivate — deactivating marks members completed — delete when empty), full-page
  form-groups matcher, facilitators (approve, add directly), sessions (+ attendance, facilitator shown).
- **Emails** (`src/lib/email.ts`; always `escapeHtml()` user text): application received (+ notice
  to `ADMIN_EMAIL`), acceptance, rejection (from the owner's "process & templates" docx), magic
  link (self-requested and admin-sent), admin forgot-password, and 24h session reminders from
  `cron/daily` (one per attendee, tracked in `session_attendance.invite_sent_at`; needs
  `CRON_SECRET` in production).
- **Google Meet:** `src/lib/google-calendar.ts` (pure `crypto` + fetch — NOT `google-auth-library`,
  which breaks Turbopack). It signs a JWT with `sub` = `GOOGLE_CALENDAR_ID`, which requires
  **domain-wide delegation** for the service account in Google Workspace; without
  `GOOGLE_*` env vars the toggle is disabled and a link is pasted manually.

## Availability / time slots

One vocabulary everywhere: `src/lib/availability.ts` (`monday_1730`, `monday_1930`,
`thursday_1730`, `thursday_1930`, plus `other` on the apply form). Used by `/apply`, `/onboard`,
`groups.timing`, Form Groups matching and all admin labels. Legacy values (`early_monday`…,
`monday_early`…) are translated by `normalizeSlot()` — don't add new vocabularies.

## Gotchas

- Stale `.next` cache causes random 404s / manifest errors → delete `.next` and restart. It grows
  to ~1 GB.
- `next.config.ts` sets the Turbopack root because of a lockfile in the parent folder.
- Theme init in `src/app/layout.tsx` must stay a native `<script dangerouslySetInnerHTML>` in
  `<head>`; `next/script beforeInteractive` breaks under Turbopack/React 19.
- Pass `Date` to client components as ISO strings; cookies can only be set in route handlers/server actions.
- Admin pages use hard-coded light colours because dark-mode `--bg-page` is `#020617`.
- Deleting a session must delete its `session_attendance` rows first (FK).
- Browser automation: `form_input` doesn't fire React `onChange`; `window.confirm()` is
  suppressed in the preview pane.

## Open work (as of 2026-11-12)

1. Production setup the owner must do: `CRON_SECRET` in Vercel (reminders), Resend domain
   verification for the From address, optional `GOOGLE_*` vars + domain-wide delegation,
   a new `ADMIN_PASSWORD`.
2. No dedicated privacy page (apply links to effectiefaltruisme.nl/privacy).
3. Smaller gaps: no participant forgot-password; avatar is a URL, no upload; saved quiz answers
   aren't reloaded on revisit; `/api/materials/complete` is a stub; unused
   `exercise-form.tsx`/`lesson-exercise-form.tsx`; facilitators have no availability of their own;
   lesson pages are readable without logging in.
4. `quiz-answers.ts`: 17 answers in 11 quizzes are still AI-inferred (see Key paths) — owner
   should verify them, e.g. by completing those quizzes on Circle and running
   `scripts/circle-scraper/scrape-quiz-results.js`.
5. Google login: researched (Auth.js), not built; recommendation was to keep magic links.

Full chat exports from the original build live outside the repo
(`C:\intro-course-website\chatgeschiedenis\`); search them for the reasoning behind a decision.
