# Cloneusly

Internal peer recognition and points app built with Next.js 15, Better Auth, Prisma ORM 6, and PostgreSQL.

## Prerequisites

- Node.js 22 LTS (`asdf install nodejs 22.18.0`)
- npm
- A non-production PostgreSQL database (Prisma Postgres recommended)
- A separate test database for integration tests

## Quick start

```bash
asdf shell nodejs 22.18.0
npm install
cp .env.example .env.local
```

Configure `.env.local`:

```dotenv
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
TEST_DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=<32+ random chars>
BETTER_AUTH_URL=http://localhost:3000
SEED_USER_PASSWORD=<development-only password>
```

Prepare the database:

```bash
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
```

Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Signed-out visitors are redirected to `/login`.

### Seeded accounts

After seeding with `SEED_USER_PASSWORD`:

| Email | Handle | Role | Initial giving points |
|---|---|---|---|
| alice@cloneusly.local | alice | MEMBER | 100 |
| bob@cloneusly.local | bob | MEMBER | 100 |
| carol@cloneusly.local | carol | MEMBER | 100 |
| tester@cloneusly.local | tester | TESTER | 100 |

Initial points are created through labeled test-top-up journal entries, not silent balance edits.

## Verification

```bash
npm run typecheck
npm run test
npm run test:integration   # requires TEST_DATABASE_URL
npm run build
npm run test:e2e           # optional: set E2E_USER_EMAIL and E2E_USER_PASSWORD
```

## Architecture

- **UI**: Server Components and client forms under `src/app` and `src/components`
- **Auth**: Better Auth with Prisma adapter, database sessions, email/password login, public signup disabled
- **Domain**: Server-only modules in `src/lib/domain` own point transactions, idempotency, and retries
- **Data**: Prisma schema in `prisma/schema.prisma`; reviewed constraints in `prisma/migrations/0001_foundation/migration.sql`

## Features

Authenticated users can:

1. **Recognize colleagues** — multi-recipient points, text, hashtags, allowlisted GIFs (US1)
2. **Browse the feed** — cursor pagination, hashtag/user filters, colleague profiles (US2)
3. **Convert points** — move received → giving one-to-one with immutable history (US3)
4. **View leaderboards** — rolling 24h/7d/30d rankings, optional hashtag filter (US4)
5. **Receive monthly grants** — daily cron reconciliation; testers can self top-up in test mode (US5)
6. **Celebrate socially** — reactions, comments, in-app notifications (US6)

## Architecture

- Never point development, test, or seed commands at production databases
- Set `ENABLE_TEST_TOPUPS=false` in production unless the demo requires tester controls
- `CRON_SECRET` is required only for the monthly-grant cron route (User Story 5)

See [specs/001-peer-recognition/quickstart.md](specs/001-peer-recognition/quickstart.md) for the full validation checklist.
