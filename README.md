# Trading Adv — AI-powered Stock Portfolio Advisor

A **production-ready**, full-stack Next.js application that lets users import
their stock portfolios (CSV or broker screenshot) and get personalised AI
advisory reports.

---

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

1. Push to GitHub and import into Vercel.
2. Add the environment variables from `.env.example` in _Project → Settings → Environment Variables_.
3. Use [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) or [Neon](https://neon.tech) for the database.
4. Run `prisma migrate deploy` as part of your build script (or run it manually after the first deploy).

The `postinstall` script in `package.json` automatically runs `prisma generate`
on every Vercel build so the Prisma client is always in sync.

---

## Next steps

- [ ] Implement CSV parser (`papaparse`) in `portfolioImportService.importCsv`
- [ ] Implement screenshot OCR in `portfolioImportService.importImage` (OpenAI Vision)
- [ ] Wire real LLM call in `advisorService.chat`
- [ ] Add middleware to redirect unauthenticated users
- [ ] Add real market-data quotes (Polygon.io, Yahoo Finance, etc.)
- [ ] Implement transactional holding writes in `portfolioService.createFromImport`
- [ ] Add email verification flow
