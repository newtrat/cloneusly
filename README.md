# Cloneusly

Internal peer recognition and points app built with Next.js 15, Better Auth, Prisma ORM 6, and PostgreSQL.

## Prerequisites

- Node.js 24 LTS (`asdf install nodejs 24.18.0`)
- npm
- A non-production PostgreSQL database (Prisma Postgres recommended)
- A separate test database for integration tests

## Local PostgreSQL setup

Use separate databases for development and integration tests. Never use a
production database locally.

### Option A: Docker Compose (recommended)

Requires Docker Desktop (or another Docker engine) with Compose.

```bash
docker compose up -d
docker compose ps
```

The compose file starts PostgreSQL 18, creates `cloneusly_dev` and
`cloneusly_test`, and persists data in a `postgres_data` volume. Default
credentials are user `cloneusly` / password `cloneusly`. The database is
published on host port `5433` (not `5432`) so it does not clash with a
Homebrew Postgres already listening on `5432`.

Stop the database when you are done:

```bash
docker compose down
```

Use `docker compose down -v` only if you also want to delete the local data
volume.

### Option B: Homebrew

```bash
brew services start postgresql@14
pg_isready
createdb cloneusly_dev
createdb cloneusly_test
```

`pg_isready` should report `accepting connections`. The `createdb` commands only
need to run once; PostgreSQL will report an error if a database already exists.

For a default Homebrew installation, use your macOS username in the local
connection URLs. Replace `YOUR_MACOS_USERNAME` below with `whoami` output:

```bash
whoami
```

## Quick start

```bash
asdf shell nodejs 24.18.0
npm install
cp .env.example .env.local
```

Configure `.env.local`. If you started the database with Docker Compose:

```dotenv
DATABASE_URL="postgresql://cloneusly:cloneusly@localhost:5433/cloneusly_dev?schema=public"
DIRECT_URL="postgresql://cloneusly:cloneusly@localhost:5433/cloneusly_dev?schema=public"
TEST_DATABASE_URL="postgresql://cloneusly:cloneusly@localhost:5433/cloneusly_test?schema=public"
BETTER_AUTH_SECRET=<generated secret>
BETTER_AUTH_URL=http://localhost:3000
SEED_USER_PASSWORD=<development-only password>
```

If you use Homebrew PostgreSQL instead:

```dotenv
DATABASE_URL="postgresql://YOUR_MACOS_USERNAME@localhost:5432/cloneusly_dev?schema=public"
DIRECT_URL="postgresql://YOUR_MACOS_USERNAME@localhost:5432/cloneusly_dev?schema=public"
TEST_DATABASE_URL="postgresql://YOUR_MACOS_USERNAME@localhost:5432/cloneusly_test?schema=public"
BETTER_AUTH_SECRET=<generated secret>
BETTER_AUTH_URL=http://localhost:3000
SEED_USER_PASSWORD=<development-only password>
```

`DATABASE_URL` and `DIRECT_URL` may be identical for local PostgreSQL. If your
database role has a password, URL-encode it and include it in the URL, for
example: `postgresql://user:encoded-password@localhost:5432/cloneusly_dev`.

Generate a unique Better Auth secret for each environment:

```bash
openssl rand -base64 32
```

Copy the command output into `BETTER_AUTH_SECRET`. Do not commit `.env` /
`.env.local` or reuse the development secret in preview or production.

Prisma CLI loads `DATABASE_URL` and `DIRECT_URL` from `.env` and `.env.local`;
explicit shell or CI values take precedence. Next.js also reads those files for
`npm run dev`. The standalone seed script needs its variables exported from
`.env.local` first:

```bash
set -a
source .env.local
set +a
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

| Email                  | Handle | Role   | Initial giving points |
| ---------------------- | ------ | ------ | --------------------- |
| alice@cloneusly.local  | alice  | MEMBER | 100                   |
| bob@cloneusly.local    | bob    | MEMBER | 100                   |
| carol@cloneusly.local  | carol  | MEMBER | 100                   |
| tester@cloneusly.local | tester | TESTER | 100                   |

Initial points are created through labeled test-top-up journal entries, not silent balance edits.

### Creating additional users

Public signup is disabled. Provision new accounts with the `create-user` script,
which creates the `User`, a credential `Account`, and a `PointAccount`, and (when
`--points` is given) grants initial giving points through a labeled test-top-up
journal entry rather than a silent balance edit.

```bash
set -a; source .env.local; set +a
npm run create-user -- --email dave@cloneusly.local --name "Dave Member" --handle dave --points 100
```

Options:

- `--email`, `--name`, `--handle` are required; email and handle are stored
  lowercased and must be unique (case-insensitive). Handle may include letters,
  numbers, underscores, dots, and hyphens (2–32 chars).
- `--password` sets the login password (min 8 chars). If omitted it falls back to
  `CREATE_USER_PASSWORD`, then `SEED_USER_PASSWORD`.
- `--role MEMBER|TESTER` (default `MEMBER`).
- `--points <n>` grants initial giving points (default `0`).
- `--inactive` provisions the account as `INACTIVE`.
- `--help` prints full usage.

### Self-service first access (Slack-verified)

Colleagues can activate their own account without the CLI. On `/first-access`
they enter their work email; if it belongs to the allowed company domain
(`ALLOWED_SIGNUP_EMAIL_DOMAIN`, default `therealreal.com`) and maps to an
eligible account, a one-time 6-digit code is sent to them over Slack DM. They
enter that code plus a new password to finish. Because the code is delivered to
the matching Slack user, this proves email ownership and closes the
account-takeover gap where anyone could set a password for another person's
email.

- Email domain is enforced on both the code request and the password step.
- The 6-digit code is stored hashed (HMAC) with a 15-minute expiry and is
  single-use; the password step requires a matching code for that email.
- The code is delivered over Slack DM (`SLACK_BOT_TOKEN`). When Slack is not
  configured, the code is logged to the server console (dev fallback).
- Requesting a code always returns a generic response (no account enumeration).
- New accounts receive the current month's giving allowance on activation
  (idempotent with the monthly-grant cron).

## Verification

```bash
npm run typecheck
npm run test
npm run test:integration   # requires TEST_DATABASE_URL
npm run build
npm run test:e2e           # optional: set E2E_USER_EMAIL and E2E_USER_PASSWORD
```

## Vercel preview environments

Preview deployments use a separate database and Better Auth secret from
production. Configure these variables with the **Preview** target in Vercel:

- `DATABASE_URL` and `DIRECT_URL`: direct connection strings for the preview
  database, never the production database.
- `BETTER_AUTH_SECRET`: a dedicated preview secret.
- `COMPANY_TIME_ZONE`: the company time zone, such as `America/Los_Angeles`.

`BETTER_AUTH_URL` is intentionally not required in Vercel previews. The app
uses Vercel's per-deployment `VERCEL_URL` and trusts only this team's
`*.newtrats-projects.vercel.app` preview domains. Production still requires an
explicit `BETTER_AUTH_URL`.

## Architecture

- **UI**: Server Components and client forms under `src/app` and `src/components`
- **Auth**: Better Auth with Prisma adapter, database sessions, email/password login; account activation via email-verified, domain-restricted first access
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
7. **Send thanks from Slack** — `/thanks` slash command and **Send Thanks** shortcut modal

## Slack integration

Slash command and interactivity hit:

- `POST /api/slack/command` — `/thanks @user1 @user2 +10 for being awesome #teamwork`
- `POST /api/slack/interactive` — shortcut `interactive_shortcut` opens a modal; submission creates the same recognition

Configure in `.env.local` / Vercel (never commit real tokens):

```dotenv
SLACK_SIGNING_SECRET=<signing secret>
SLACK_BOT_TOKEN=xoxb-...
```

Bot token scopes: `commands`, `users:read`, `users:read.email`, `chat:write`. Interactivity and the slash command request URLs must point at your deployed app (for example `https://cloneusly.vercel.app/api/slack/command` and `.../api/slack/interactive`). The bot must be in the channel for ephemeral confirmation after the message shortcut.

Users are matched by Slack profile **email** to an active Cloneusly account. Rotate any Slack secrets that were shared outside a password manager.

## Operations

- Never point development, test, or seed commands at production databases
- Set `ENABLE_TEST_TOPUPS=false` in production unless the demo requires tester controls
- `CRON_SECRET` is required only for the monthly-grant cron route (User Story 5)
- `SLACK_SIGNING_SECRET` and `SLACK_BOT_TOKEN` are required only for `/api/slack/*` routes

See [specs/001-peer-recognition/quickstart.md](specs/001-peer-recognition/quickstart.md) for the full validation checklist.
