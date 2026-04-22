# Trading Adv — AI-powered Stock Portfolio Advisor

A **production-ready**, full-stack Next.js application that lets users import
their stock portfolios (CSV or broker screenshot) and get personalised AI
advisory reports.

---

## Security notes

- **Secrets** live in `.env` locally (gitignored) and in your host’s env (e.g. Vercel). Never commit `.env` or paste keys into the repo.
- **Client bundle** only exposes `NEXT_PUBLIC_*` (see `lib/env.ts`); all API keys, DB, and `AUTH_SECRET` are server-only.
- **API errors** return generic 500 messages to the browser; details stay in server logs (`lib/api-response.ts`).
- **Production** refuses weak or default `AUTH_SECRET` values and requires length ≥ 32.
- **OAuth** callback does not put internal error text in the redirect URL.
- **Headers** in `next.config.mjs` set `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `Permissions-Policy` (review if you need embeds or camera).
- For higher assurance later: add rate limiting on auth routes, a CSRF policy for state-changing Server Actions, and tighten `images.remotePatterns` if you do not need arbitrary image hosts.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui primitives |
| ORM | Prisma 5 |
| Database | PostgreSQL |
| Auth | JWT cookies (swap-ready for NextAuth / Clerk) |
| Charts | Recharts |
| Deployment | Vercel |

---

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in at minimum:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string (pooled) |
| `DIRECT_URL` | Postgres direct URL (for migrations) |
| `AUTH_SECRET` | Random 32+ char string |

### 3. Run database migrations

```bash
npm run prisma:migrate
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project structure

```
.
├── app/
│   ├── (auth)/          # Sign-in / sign-up pages (no sidebar)
│   ├── (app)/           # Protected app shell (sidebar + topnav)
│   │   ├── dashboard/
│   │   ├── portfolio/
│   │   │   ├── [id]/    # Portfolio detail view
│   │   │   └── upload/  # CSV + screenshot import
│   │   ├── advisor/     # AI chat advisor
│   │   ├── markets/     # Placeholder — market data
│   │   └── settings/
│   ├── api/
│   │   ├── auth/        # sign-in, sign-up, sign-out
│   │   ├── portfolio/   # CRUD + upload-csv + upload-image
│   │   └── advisor/     # chat endpoint
│   ├── layout.tsx       # Root layout (fonts, theme provider)
│   └── page.tsx         # Landing page
│
├── components/
│   ├── ui/              # shadcn-style primitives
│   ├── layout/          # Sidebar + Topnav
│   ├── dashboard/       # StatCard
│   └── charts/          # Recharts wrappers
│
├── lib/
│   ├── prisma.ts        # Singleton PrismaClient
│   ├── auth.ts          # JWT session helpers
│   ├── env.ts           # Type-safe env vars
│   ├── errors.ts        # Typed app errors
│   ├── api-response.ts  # JSON envelope + error handler
│   ├── mock-data.ts     # Mock holdings / charts
│   └── utils.ts         # cn(), formatCurrency(), formatPercent()
│
├── server/
│   ├── repositories/    # Data-access layer (Prisma queries)
│   ├── services/        # Business logic
│   └── validators/      # Zod schemas for request bodies
│
├── types/               # Shared TypeScript types
│
└── prisma/
    └── schema.prisma    # DB schema (User, Portfolio, Holdings, Asset, AIReport)
```

---

## Key API routes

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/sign-up` | Register a new user |
| POST | `/api/auth/sign-in` | Login, sets session cookie |
| GET / POST | `/api/auth/sign-out` | Destroy session |
| GET | `/api/portfolio` | List portfolios for current user |
| POST | `/api/portfolio` | Create portfolio |
| POST | `/api/portfolio/upload-csv` | Upload & parse CSV (multipart) |
| POST | `/api/portfolio/upload-image` | Upload & OCR screenshot (multipart) |
| POST | `/api/advisor/chat` | AI chat endpoint |

All API responses follow the envelope:

```json
{ "ok": true, "data": { ... } }
{ "ok": false, "error": { "code": "...", "message": "..." } }
```

---

## Database models

- **User** — authentication and profile
- **Portfolio** — a collection of holdings, linked to a user
- **PortfolioHolding** — a single position (asset + quantity + avg cost)
- **Asset** — reference data (ticker, name, sector, exchange)
- **AIReport** — generated analysis, stored as JSON

---

## Deployment (Vercel)

You need a **Git** remote (e.g. GitHub), a **hosted PostgreSQL** database, and env vars in Vercel. The repo includes `vercel.json` so production builds run `npm run vercel-build` (migrations, then Prisma client, then `next build`).

### Steps (do in order)

1. **Commit and push** this project to GitHub (or GitLab / Bitbucket). Include `prisma/migrations/` (initial schema migration is in the repo).

2. **Create a PostgreSQL database** (pick one):
   - [Neon](https://neon.tech) (free tier, works well with Vercel), or
   - [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres), or any Postgres with a connection string.

3. **Create a Vercel account** at [vercel.com](https://vercel.com) and sign in with GitHub.

4. **Import the repo**: Vercel Dashboard → Add New → Project → select your repo → Import.  
   Framework preset: **Next.js**. Root directory: repo root (default).  
   Build command is read from `vercel.json` (`npm run vercel-build`).

5. **Environment variables** (Vercel → Project → Settings → Environment Variables).  
   Add at least these for **Production** (copy names from `.env.example`):

   | Variable | Notes |
   |----------|--------|
   | `DATABASE_URL` | Pooled connection string from Neon/Vercel Postgres (often ends with `?sslmode=require`). |
   | `DIRECT_URL` | Non-pooled URL for migrations (Neon provides both; Vercel Postgres docs show both). |
   | `AUTH_SECRET` | Long random string (e.g. `openssl rand -base64 32`). **Required in production.** |
   | `NEXT_PUBLIC_APP_URL` | Your live site URL, e.g. `https://your-project.vercel.app` (set after first deploy or use your custom domain). |
   | `NEXT_PUBLIC_APP_NAME` | e.g. `Terminal001` |

   Optional but common: `OPENAI_API_KEY`, `ANALYSIS_PROVIDER=openai`, `NEWS_PROVIDER` / `NEWS_API_KEY`, `FILINGS_PROVIDER=sec`, etc.

6. **Deploy** (first deploy or Redeploy). The build runs `prisma migrate deploy` against `DATABASE_URL`, so the database should be **empty** on first deploy, or already managed by Prisma migrations.

7. **Set `NEXT_PUBLIC_APP_URL`** to your final URL (Vercel gives you `https://<project>.vercel.app`) and redeploy if you had to guess the URL on the first try.

8. **Custom domain** (optional): Project → Settings → Domains → add your domain and follow DNS instructions.

### Local vs production

- `npm run build` runs `prisma generate` + `next build` (no migrate), so you can build locally without applying migrations.
- On Vercel, `npm run vercel-build` runs `prisma migrate deploy` first.

`postinstall` runs `prisma generate` after `npm install` on Vercel as well.

---

## Next steps

- [ ] Implement CSV parser (`papaparse`) in `portfolioImportService.importCsv`
- [ ] Implement screenshot OCR in `portfolioImportService.importImage` (OpenAI Vision)
- [ ] Wire real LLM call in `advisorService.chat`
- [ ] Add middleware to redirect unauthenticated users
- [ ] Add real market-data quotes (Polygon.io, Yahoo Finance, etc.)
- [ ] Implement transactional holding writes in `portfolioService.createFromImport`
- [ ] Add email verification flow
