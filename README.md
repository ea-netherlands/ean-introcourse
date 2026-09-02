# EA Netherlands — Intro Fellowship Platform

A web platform for managing the EA Netherlands Intro Fellowship programme. Participants work through a 5-week reading curriculum, facilitators track their group's progress and schedule sessions, and coordinators manage applications, groups, and participants through an admin panel.

**Live URL:** https://introcourse.effectiefaltruisme.nl  
**Stack:** Next.js 15 (App Router) · Drizzle ORM · PGlite (dev) / Neon Postgres (prod) · Tailwind CSS v4

---

## Table of contents

1. [Getting started](#getting-started)
2. [Architecture overview](#architecture-overview)
3. [User roles](#user-roles)
4. [Participant features](#participant-features)
5. [Facilitator features](#facilitator-features)
6. [Admin features](#admin-features)
7. [Application form](#application-form)
8. [Authentication](#authentication)
9. [Database & migrations](#database--migrations)
10. [Content (MDX modules)](#content-mdx-modules)
11. [Environment variables](#environment-variables)
12. [Deployment](#deployment)

---

## Getting started

```bash
npm install
npm run dev        # starts on http://localhost:3000
```

On first run, the database is created automatically at `data/introcourse-db/` (PGlite). No manual migration step needed in development — `ensureMigrated()` runs on the first incoming request.

To seed test data (participants, groups, sample progress):

```bash
npm run db:seed
```

To reset the local database:

```bash
rm -rf data/introcourse-db
```

---

## Architecture overview

```
src/
├── app/                   # Next.js App Router pages & API routes
│   ├── admin/             # Coordinator-only admin panel
│   ├── apply/             # Public application form
│   ├── auth/              # Login, logout, magic-link verify
│   ├── group/[groupId]/   # Group chat + facilitator overview
│   ├── materials/         # Reading materials (sidebar layout)
│   ├── sessions/          # Session scheduling (facilitator)
│   └── account/           # Participant account page
├── components/
│   ├── sidebar.tsx        # Main materials sidebar with nav links
│   └── ...
├── db/
│   ├── schema.ts          # Drizzle schema (single source of truth)
│   └── index.ts           # DB connection (PGlite / Neon dual-mode)
├── lib/
│   ├── auth.ts            # Session cookie helpers
│   ├── lessons.ts         # WEEK_DEFS, getAllWeeksWithLessons()
│   └── email.ts           # sendEmail() wrapper (Resend + console fallback)
content/
└── modules/               # MDX lesson files (week-N-slug.mdx)
drizzle/                   # SQL migration files
```

---

## User roles

| Role | Access |
|---|---|
| **participant** | Materials, My account, Group chat |
| **facilitator** | All participant pages + Sessions, Group overview |
| **admin** | All pages + full admin panel |

Role is set in the `participants` table. Admins log in via the `/admin/login` password page; everyone else uses magic links.

---

## Participant features

### Reading materials
- **URL:** `/materials`
- 5 weeks × 54 lessons served from MDX files in `content/modules/`
- Collapsible sidebar lists all lessons with type icons (reading 📖, quiz ❓, exercise ✏️, wrap-up ✅)
- Lesson completion is tracked per-user in the `lessonProgress` table (by scroll depth / quiz submit)
- Completed lessons show a ✓ checkmark and green highlight in the sidebar

### Group chat
- **URL:** `/group/[groupId]`
- Async discussion board for a group (participants + facilitator)
- Post and reply in threads
- Member list shown at top

### Account page
- **URL:** `/account`
- View name, email, and current group
- Sign-out button

### Upcoming sessions
- Participants see their group's upcoming sessions with date, time, and meeting link
- **Add to calendar** buttons: Google Calendar, Outlook, Apple Calendar (.ics download)

### Sidebar navigation (materials layout)
The left sidebar shows all relevant links for the logged-in user:
- **My account** — account page
- **Group chat** — group discussion (if assigned to a group)
- **Sessions** — session management (facilitators only)
- **Group overview** — student progress view (facilitators only)

---

## Facilitator features

Facilitators see an extended navigation on all pages:  
`Materials | My account | Group chat | Sessions | Overview`

### Sessions page
- **URL:** `/sessions`
- Schedule new sessions with title, date/time, meeting link, and optional agenda
- **Repeat slider** — create up to 5 sessions spaced exactly 1 week apart in one click
- Lists upcoming and past sessions for the facilitator's group
- Meeting link hint: use Zoom/Teams for sessions over 60 minutes (Google Meet free tier caps groups at 60 min)

### Group overview page
- **URL:** `/group/[groupId]/overview`
- Facilitator-only (redirects participants to `/materials`)
- **Stats row:** total students, average lesson completion %, upcoming session count
- **Per-student cards** showing:
  - Name, email, avatar initial
  - Application badges: city, language preference, career stage
  - Occupation, education level, main reasons for joining
  - **Overall progress bar** (grey < 40 %, teal 40–79 %, green ≥ 80 %)
  - **Per-week circles** (W1–W5) with lesson counts — filled teal when all lessons done
- **+ Schedule session** button (shortcut to sessions page)

---

## Admin features

Access the admin panel at `/admin` (password login required).

### Participants
- **URL:** `/admin/participants`
- List all participants with group, status, and lesson progress
- Filter by status: All / Active / Pending / Completed
- **Export CSV** — download full participant list
- Per-participant edit page:
  - Assign to a group (dropdown)
  - Change status (pending / active / completed / rejected)
  - Send magic-link sign-in email
  - View full lesson progress breakdown (all 54 lessons)

### Groups
- **URL:** `/admin/groups`
- Create and rename cohort groups

### Applications
- **URL:** `/admin/applications`
- **Pending tab:** rich applicant cards showing:
  - City, online/in-person preference, phone, career stage, occupation
  - Main reasons for joining (from multi-select)
  - LinkedIn link (opens in new tab)
  - Expandable section: education, work area, motivation essay, "prompted by" field
- **Handled tab:** compact table of accepted/rejected applicants with city column
- **Mass select** — checkbox each row, then bulk **Accept** or **Reject** with one button
- Accepting an application automatically creates a `participant` record

### Form groups
- **URL:** `/admin/form-groups`
- Two-column layout:
  - **Left:** Facilitators — assign each facilitator's group via dropdown
  - **Right:** Active participants without a group — assign them individually
- Drag-and-drop-free; all assignments via dropdowns

### Facilitators
- **URL:** `/admin/facilitators`
- List active facilitators
- **Facilitator sign-up link** — copy a magic link to share with new facilitators

### Sessions (admin)
- **URL:** `/admin/sessions`
- View all sessions across all groups
- Delete sessions
- Per-session attendance tracking: mark which participants attended

---

## Application form

**URL:** `/apply` (public, no login required)

4-step form matching the Typeform intake questionnaire:

| Step | Fields |
|---|---|
| 1 — Motivation | Main reason for joining (multi-select, max 2); what prompted you |
| 2 — Background | Education level; career stage; occupation; work area; motivation essay (~120 words) |
| 3 — Logistics | Language preference (NL/EN); availability (Mon 17:30, Mon 19:30, Thu 17:30, Thu 19:30, Other); online/in-person preference |
| 4 — Contact | Name; email; phone; city; LinkedIn URL; how you heard about us; privacy consent checkbox |

Submissions are stored in the `applications` table. Privacy consent is required (400 error if unchecked).

---

## Authentication

### Participants & facilitators — magic links
1. User enters email at `/auth/login`
2. A signed token is stored in `login_tokens` and emailed via Resend (or logged to console in dev)
3. User clicks the link → `/auth/verify?token=...` → session cookie set → redirect to `/materials`
4. Session cookie is HTTP-only, expires after 30 days

**Dev shortcut:** after requesting a magic link, fetch the token from:
```
GET /api/dev/latest-email
```
Returns `{ to, subject, links: [url] }` — navigate to `links[0]` to sign in instantly.

### Admins — password login
- **URL:** `/admin/login`
- Password set via `ADMIN_PASSWORD` environment variable
- Signs into a separate admin session cookie

### Sign-out
- `POST /auth/logout` — clears the session cookie

---

## Database & migrations

Schema is defined in `src/db/schema.ts`. After changing the schema:

```bash
npm run db:generate   # generates a new SQL migration in drizzle/
npm run db:migrate    # applies pending migrations
```

Migrations run automatically on the first request in dev (via `ensureMigrated()`). In production they run on deploy via `npm run db:migrate`.

### Key tables

| Table | Purpose |
|---|---|
| `participants` | All users (participants, facilitators, admins) |
| `groups` | Cohort groups |
| `applications` | Intake form submissions |
| `lessonProgress` | Per-user per-lesson scroll/completion tracking |
| `fellowshipSessions` | Scheduled group sessions |
| `groupPosts` / `groupPostReplies` | Group discussion board |
| `login_tokens` | Magic-link tokens (expire after 30 min) |
| `email_log` | Dev-only email log for the `/api/dev/latest-email` endpoint |

---

## Content (MDX modules)

Lessons live in `content/modules/` as MDX files. The sidebar and navigation update automatically when files are added or removed.

### Frontmatter format

```yaml
---
title: "Week 1: Doing good better"
week: 1
description: "An introduction to effective altruism."
estimatedMinutes: 45
exercises:
  - key: unique_key
    question: "Your question here"
    type: textarea        # textarea | text | radio | checkbox
    options:              # required for radio / checkbox
      - Option A
      - Option B
    required: true
---
```

### Adding a new lesson

1. Create `content/modules/week-N-slug.mdx` with the frontmatter above
2. The sidebar, lesson counter, and progress tracking update automatically — no code changes needed

### Lesson types (shown as icons in the sidebar)

| Type key | Icon | Meaning |
|---|---|---|
| `reading` | 📖 | Standard reading lesson |
| `objectives` | 🎯 | Learning objectives |
| `quiz` | ❓ | Comprehension quiz |
| `exercise` | ✏️ | Interactive exercise |
| `wrap` | ✅ | Week wrap-up |
| `appendix` | 📎 | Optional extra reading |

---

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Prod only | Neon Postgres connection string. Omit to use local PGlite. |
| `RESEND_API_KEY` | Optional | Resend API key for sending real emails. Falls back to console logging. |
| `ADMIN_PASSWORD` | Yes | Password for the `/admin/login` page |
| `SESSION_SECRET` | Yes | Secret used to sign session cookies (min 32 chars) |
| `NEXT_PUBLIC_BASE_URL` | Yes | Full origin URL, e.g. `https://introcourse.effectiefaltruisme.nl` |

---

## Deployment

The app deploys to Vercel automatically on push to `main`.

```bash
git push origin main   # triggers Vercel deploy
```

**Database:** set `DATABASE_URL` in Vercel environment variables to your Neon Postgres connection string.  
**Migrations:** add a build command override in Vercel: `npm run db:migrate && next build`.

### First-time production setup

1. Create a Neon database at https://neon.tech
2. Copy the connection string into `DATABASE_URL` in Vercel
3. Set `ADMIN_PASSWORD`, `SESSION_SECRET`, `NEXT_PUBLIC_BASE_URL`, and optionally `RESEND_API_KEY`
4. Push to `main` — Vercel builds, runs migrations, and deploys

---

## Do not modify

`ean-office-main/` is a read-only reference folder. All changes go in this repository only.
