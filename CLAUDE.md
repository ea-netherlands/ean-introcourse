# EA Netherlands — Intro Fellowship Platform

## Architecture

- **Framework:** Next.js (App Router) with React Server Components
- **Database:** Drizzle ORM + PGlite (local dev) / Neon Postgres (production)
- **Email:** Resend (falls back to console logging when `RESEND_API_KEY` is absent)
- **Styles:** Tailwind CSS v4 (no config file — configured via `postcss.config.mjs` and CSS)
- **Fonts:** Self-hosted Atkinson Hyperlegible Next (body) + Sentient (headings)
- **Content:** MDX files in `content/modules/` — parsed with gray-matter, rendered with next-mdx-remote

## Key paths

| Path | Purpose |
|---|---|
| `src/db/schema.ts` | Drizzle schema for all tables |
| `src/db/index.ts` | DB connection (PGlite/Postgres dual mode) |
| `src/lib/modules.ts` | Reads MDX files from `content/modules/` |
| `src/lib/email.ts` | `sendEmail()` wrapper (Resend + console fallback) |
| `src/lib/auth.ts` | Session cookie helpers (Stage 2+) |
| `src/app/materials/` | Reading materials pages |
| `src/app/admin/` | Coordinator admin pages |
| `src/app/api/cron/daily/route.ts` | Daily cron job (06:00 UTC) |
| `content/modules/` | MDX content files |

## Database

The schema is defined once in `src/db/schema.ts` for all stages.
Stage 1 does not write to any table. Tables are created on first `npm run db:migrate`.

```bash
npm run db:generate   # generate migration after schema change
npm run db:migrate    # apply migrations (local PGlite or Neon via DATABASE_URL)
```

## Module MDX frontmatter

```yaml
---
title: "Week 1: ..."
week: 1
description: "..."
estimatedMinutes: 45
exercises:
  - key: unique_key
    question: "Your question here"
    type: textarea   # textarea | text | radio | checkbox
    options:         # required for radio/checkbox
      - Option A
      - Option B
    required: true
---
```

## Adding a new module

1. Create `content/modules/week-N-slug.mdx` with the frontmatter above
2. The sidebar and navigation update automatically — no code changes needed

## Environment

See `.env.example` for all variables. In development, omit `DATABASE_URL` to use PGlite.

## Do not modify

`ean-office-main/` is a read-only reference. All changes go in this repo only.

## Deployment target

`introcourse.effectiefaltruisme.nl` — Vercel, push to `main` auto-deploys.
