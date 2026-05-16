# QuickBill

QuickBill is a full-stack retail POS and back-office app for a single shop: catalogue and inventory, point-of-sale checkout, orders and printable invoices, analytics dashboard, Excel reports, and optional AI-powered daily briefings and restock suggestions.

Built as a portfolio-grade Next.js application with real database transactions, server-side validation, and production-minded error handling.

---

## Features

| Area | What you get |
|------|----------------|
| **Auth** | Email/password login (NextAuth), protected dashboard routes |
| **Products** | CRUD, categories, barcode field, low-stock thresholds, restock/adjust with audit trail |
| **POS** | Cart (persisted in browser), tax & discounts, payment methods, stock checks at checkout |
| **Orders** | Immutable completed orders, cancellation restores stock, printable invoices |
| **Dashboard** | KPIs, Recharts trends, low-stock alerts, recent orders |
| **Reports** | Date/category/cashier filters, Excel export |
| **AI** | On-demand daily sales summary and restock planner (OpenAI or Gemini) |

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS 4, [shadcn/ui](https://ui.shadcn.com), Lucide icons |
| State | [Zustand](https://zustand.docs.pmnd.rs) (POS cart, persisted) |
| Charts | [Recharts](https://recharts.org) |
| Auth | [NextAuth.js](https://next-auth.js.org) (Credentials provider) |
| Database | MySQL via [Prisma](https://www.prisma.io) 5 |
| Validation | Zod |
| Forms | React Hook Form |
| Export | ExcelJS |
| AI | OpenAI SDK and/or Google Gemini REST API |
| Password hashing | bcryptjs |

---

## Prerequisites

- **Node.js** 20+
- **npm** (or pnpm/yarn)
- **MySQL** 8+ (local, Docker, or a cloud instance such as TiDB Serverless)

---

## Run locally

### 1. Clone and install

```bash
git clone https://github.com/manalli/quickbill.git
cd quickbill
npm install
```

### 2. Environment variables

Copy the example file and edit values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | MySQL connection string |
| `NEXTAUTH_SECRET` | Yes | Random string (32+ chars). Example: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | `http://localhost:3000` for local dev |
| `DEFAULT_TAX_RATE` | No | Default GST/tax % for POS (default `18`) |
| `OPENAI_API_KEY` | For AI | OpenAI API key |
| `GEMINI_API_KEY` | For AI | Alternative to OpenAI |
| `AI_PROVIDER` | No | `openai` or `gemini` (auto-detected from keys) |
| `AI_MODEL` | No | e.g. `gpt-4o-mini` or `gemini-2.0-flash` |
| `SEED_ADMIN_*` | No | Override default admin seed (see below) |

### 3. Database setup

Create an empty MySQL database, then:

```bash
npx prisma migrate dev
npm run db:seed
```

`db:seed` creates the default **ADMIN** user only. Add products via **Products** in the UI (no sample catalogue is seeded).

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you will be redirected to login.

### Other useful commands

```bash
npm run build          # prisma generate + production build
npm run start          # run production build
npm run lint           # ESLint
npm run db:studio      # Prisma Studio (DB browser)
npm run db:push        # push schema without migration (dev only)
```

---

## Default login credentials

After `npm run db:seed`, sign in with:

| Field | Default value |
|-------|----------------|
| **Email** | `admin@quickbill.local` |
| **Password** | `changeme12345` |

Override via `.env` before seeding:

```env
SEED_ADMIN_EMAIL="admin@quickbill.local"
SEED_ADMIN_PASSWORD="your-secure-password"
SEED_ADMIN_NAME="Administrator"
```

> **Security:** Change the password immediately outside a disposable dev machine. In production, seeding requires `SEED_ADMIN_PASSWORD` to be set explicitly (`NODE_ENV=production`).

The schema supports `ADMIN` and `STAFF` roles; the seed creates an **ADMIN** only. There is no in-app user-management UI yet.

---

## Project structure (high level)

```
app/
  (auth)/login/          # Login page
  (dashboard)/dashboard/ # Dashboard, POS, products, orders, reports
  api/                   # NextAuth, reports export, AI routes
components/              # UI by feature (pos, products, dashboard, ai, …)
lib/
  actions/               # Server actions (products, orders, analytics)
  ai/                    # AI context, prompts, generation, client fetch
  analytics/             # Dashboard/report queries
  orders/                # Totals calculation, serialization
prisma/                  # Schema, migrations, seed
store/cart-store.ts      # POS cart (Zustand + persist)
```

---

## Architecture & design decisions

These choices keep the app maintainable for a single-shop MVP while staying close to real POS behaviour.

### Data & orders

- **MySQL + Prisma** — Familiar relational model; orders, line items, and stock movements fit naturally.
- **Snapshot line items** — `OrderItem` stores `productName`, `productSku`, and `unitPrice` at sale time so invoices stay correct if catalogue prices change later.
- **Transactional checkout** — Checkout and cancellation run in Prisma `$transaction` blocks: stock is deducted or restored atomically; stock cannot go negative.
- **Completed orders are immutable** — Edits are not allowed; only cancellation (with reason) reverses stock.
- **Stock audit trail** — Every restock, adjustment, sale, and cancellation writes a `StockMovement` row.

### POS & client state

- **Cart totals outside Zustand** — Totals are derived in a `useCartTotals` hook via `computeOrderTotals()`, not as a store method. This avoids unstable selectors and “getTotals is not a function” / re-render issues.
- **Persisted cart** — Cart survives refresh; hydration is triggered once at app level.
- **Server actions for mutations** — Product, inventory, and order writes go through validated server actions, not ad-hoc client fetches.

### Auth & security

- **Credentials-based NextAuth** — Simple email/password for a demo shop; no OAuth complexity.
- **Middleware protection** — Dashboard routes require a valid JWT session.
- **bcrypt password hashes** — Never store plain-text passwords.

### Analytics & reports

- **Filter-driven analytics** — Dashboard and reports share date range (required), optional category and cashier filters.
- **Estimated profit** — Period profit uses **current** product `costPrice` × quantity sold, not cost at time of sale (see “Intentionally left out”).
- **Excel export on the server** — Large exports via `app/api/reports/export` with auth check.

### AI features

- **Server-only LLM calls** — API keys never reach the browser; routes are `runtime = "nodejs"`.
- **Structured restock output** — Model response is parsed with Zod; suggestions are filtered to real product IDs from DB context.
- **Retries** — Server `withRetry` plus client retry on 429/5xx for resilient UX.
- **On-demand generation** — No cron/scheduled briefings; user clicks “Generate” on the dashboard.

---

## Intentionally left out (scope boundaries)

Not implemented in this version — by design, to ship a focused MVP:

| Topic | Notes |
|-------|--------|
| **Multi-store / multi-tenant** | Single shop, single database |
| **User management UI** | Only seed admin; no invite/edit users screen |
| **Fine-grained RBAC** | `STAFF` role exists in schema; most UI is not role-gated yet |
| **Payment gateways** | Payment method is recorded (cash/card/UPI/other), not charged via Stripe/Razorpay |
| **Email / SMS receipts** | Printable invoice page only |
| **Barcode hardware** | `barcode` field on products; no scanner SDK integration |
| **Product image uploads** | `imageUrl` field; no built-in file storage (S3, etc.) |
| **Sample product seed** | Seed creates admin only — add products manually |
| **Historical COGS on orders** | Profit KPIs use current cost, not cost at sale time |
| **Offline / PWA POS** | Requires network for checkout |
| **Scheduled AI jobs** | AI summaries are manual, not daily cron emails |
| **i18n / multi-currency** | INR-style tax %; English UI |
| **Customer CRM** | Optional name/phone on orders only |
| **2FA / OAuth** | Credentials login only |

These are natural follow-ups if the product grows beyond a portfolio/demo deployment.

---

## Deployment (brief)

1. Host MySQL (e.g. [TiDB Cloud](https://tidbcloud.com) free tier, Railway, or your own server).
2. Set all env vars on the host (Vercel, Render, etc.).
3. Run `npx prisma migrate deploy` against production `DATABASE_URL`.
4. Run seed once if needed (with `SEED_ADMIN_PASSWORD` in production).
5. Set `NEXTAUTH_URL` to your public URL (e.g. `https://your-app.vercel.app`).

Build command used by the project:

```bash
prisma generate && next build
```

---

## Environment & secrets

- Never commit `.env` — it is gitignored.
- Commit `.env.example` as documentation only.
- AI usage incurs cost on your OpenAI/Google account when features are used.

---

## License

Private / portfolio project — add a license file if you open-source it.

---

## Repository

https://github.com/manalli/quickbill
