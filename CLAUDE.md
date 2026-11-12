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
- **Fonts:** self-hosted Atkinson Hyperlegible Next (body) + Sentient (headings), `src/app/fonts.ts`
- **Content:** scraped lesson JSON in `content/lessons/` (54 files,
  `{title, counter, url, html, images, files, videos, scrapedAt}`); `html` is injected via
  `dangerouslySetInnerHTML` in `src/app/materials/[slug]/[lessonId]/page.tsx`. There is no MDX
  pipeline — `content/modules/` does not exist; `src/lib/modules.ts` is vestigial (only its
  `ModuleFrontmatter` type is used). PDFs in `public/assets/files/`.
- **Cron:** `vercel.json` → `/api/cron/daily` at 06:00 UTC, guarded by `CRON_SECRET`.

## Key paths

| Path | Purpose |
|---|---|
| `src/db/schema.ts` | Drizzle schema for all tables |
| `src/db/index.ts` | DB connection (PGlite/Postgres dual mode), `ensureMigrated()` |
| `src/lib/lessons.ts` | `WEEK_DEFS`: 5 weeks / 54 lessons (7/9/13/15/10); reads `content/lessons/` |
| `src/lib/quiz-parser.ts`, `src/lib/exercise-parser.ts` | Parse quizzes/exercises out of Circle HTML at render time |
| `src/lib/quiz-answers.ts` | Correct answers + explanations (16 quizzes) — **AI-inferred, owner should verify** |
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
- Existing: 0000–0007 (`0007_lesson_responses`). Production build runs `db:migrate` first.
- `ensureMigrated()` caches per process → **restart the dev server after adding a migration**.
- PGlite allows **one process**: stop the dev server before `npm run db:migrate`.
- Tables: `participants` (role participant/facilitator/admin, status pending/active/completed,
  passwordHash, groupId, availability, bio, avatar_url), `groups`, `applications`, `login_tokens`,
  `onboarding_tokens`, `http_sessions`, `lesson_progress`, `lesson_responses`, `group_posts`
  (`group_id` NULL = General chat), `group_post_replies`, `fellowship_sessions`,
  `session_attendance`, `email_log`. `exercise_responses` and `modules` are legacy/dead.
- IDs via `newId(prefix)` in `src/lib/ids.ts` (`p_`, `f_`, `fs_`, …).

## Auth

- Participants/facilitators: magic link (`/auth/login` → `/api/auth/send-link`; never reveals
  whether an email exists; tokens SHA-256 hashed, 30 min, single use) or password
  (`/api/auth/password-login`). Cookie `ean_fellowship_session`, 7 days.
- Facilitators sign up at `/facilitator/signup` (status pending) and need admin approval
  (status → active) before they can log in.
- Admin: one shared password from `ADMIN_PASSWORD`; cookie `ean_admin_auth` = SHA-256 of it.
  `src/middleware.ts` (Edge runtime — use Web Crypto, not `node:crypto`) protects `/admin/*`
  and `/api/admin/*` (401 JSON), except `/api/admin/auth` and `/api/admin/forgot-password`.
  `POST /api/admin/sessions` is also open to active facilitators; the route checks that itself.
- An early admin password was hardcoded and is in git history — production must use a different one.

## Features

- **Applicant:** `/apply` 4-step form based on the Typeform ("Other" is a plain option — no
  free-text field yet; no separate student branch yet). Accepted applicants get a 7-day
  `/onboard?token=` link to pick availability and set a password.
- **Participant:** `/materials/[slug]/[lessonId]` with progress bar, quizzes (locked after submit,
  score + explanations) and exercises; answers saved via `/api/exercises/submit` →
  `lesson_responses`. `/account` (profile, upcoming sessions + calendar links), `/chat`
  (General + My group), `/group/[groupId]`.
- **Facilitator:** `/sessions` plan sessions (repeat 1–8 weeks, per-session descriptions);
  `/group/[groupId]/overview` student progress + quiz/exercise answers.
- **Admin:** `/admin` dashboard, applications (bulk accept/reject), participants (+ CSV export),
  groups, form-groups, facilitators, sessions (+ attendance).
- **Emails:** acceptance, rejection (from the owner's "process & templates" docx), magic link
  (self-requested and admin-sent), admin forgot-password. No "application received" email and
  no session reminders yet.

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

1. **Work from 2026-09-07/09 never reached GitHub** and was lost with the old laptop (unless a
   backup has `C:\intro-course-website`): `/graduated` page + redirect, Google Meet auto-creation
   (`src/lib/google-calendar.ts`, pure `crypto`, NOT `google-auth-library` which breaks Turbopack),
   group timing/active toggle (migration 0008), admin "add facilitator" form, prev/next on
   participant pages, delete for participants/applications/groups, the full-page form-groups
   layout, `src/lib/availability.ts` + fixed `SLOT_LABELS`, accept route copying `availability`,
   `/api/dev/seed`, apply-form "Other" free-text fields and the student branch (study field
   instead of occupation/work area). The chat exports outside the repo describe each change.
1b. Access-control gaps (verified 2026-11-12): magic-link login (`consumeLoginToken` +
   `/api/auth/send-link`) ignores `status`, so pending facilitators and accepted-but-not-onboarded
   applicants can log in by magic link (password login does block them). Facilitators can open
   any group's `/group/[groupId]/overview` and chat, not only their own.
2. Two incompatible availability vocabularies: apply form (`monday_1930`…) vs onboarding
   (`early_monday`…), so group matching never lines up. Needs a decision.
3. Go-live hardening: rate-limit magic-link sending, privacy policy page (GDPR; apply links to
   effectiefaltruisme.nl/privacy), noindex/robots, Resend domain verification for the From
   address, application-received email, session reminder cron (`cron/daily` is only TODOs),
   escape names in email HTML, `npm audit` (critical advisory on `next` → upgrade to 16.4.x).
3b. Smaller gaps: no participant forgot-password; groups can only be created (no edit/timing/
   deactivate/delete); only sessions can be deleted; avatar is a URL, no upload; saved quiz
   answers aren't reloaded on revisit; `/api/materials/complete` is a stub; unused
   `exercise-form.tsx`/`lesson-exercise-form.tsx`; apply success screen shows fellowship@ instead
   of programmes@.
4. Google login: researched (Auth.js), not built; recommendation was to keep magic links.

Full chat exports from the original build live outside the repo
(`C:\intro-course-website\chatgeschiedenis\`); search them for the reasoning behind a decision.
