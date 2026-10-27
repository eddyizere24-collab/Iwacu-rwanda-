# Project status (stage1)

## Live

- App: https://iwacu-rwanda.vercel.app
- Branch for work: `stage1-clean`
- Build: Vercel READY on verified commits

## Done

- Next.js App Router under `src/`
- Public home + GPS locate flow (UI)
- API routes: health, locate, leaders, emergency, ai-router, admin/leaders
- Admin login + dashboard shell
- SQL migrations + `sql/apply_all.sql`
- Security helpers (rate limit, redirect, scope)
- Unit tests under `tests/unit/`

## Pending (owner / ops)

1. Set Vercel env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, optional Upstash keys, `NEXT_PUBLIC_APP_URL`.
2. Enable PostGIS + ltree; run `sql/apply_all.sql`.
3. Ingest verified boundaries; register leaders via admin (no invented contacts).
4. Optional: full e2e against production after env is live.

## Principles

Nationwide Rwanda scope, public emergency contacts, admin self-edit, offline-friendly shell, strict privacy — no invented leader data.
