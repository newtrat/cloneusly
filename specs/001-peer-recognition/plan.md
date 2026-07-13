# Implementation Plan: Peer Recognition and Points

**Branch**: `main` | **Date**: 2026-07-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-peer-recognition/spec.md`

## Summary

Build a small internal recognition application where authenticated company users award points to one or more colleagues, browse a public feed, convert received points into giving points, receive monthly allowances, and compare rolling leaderboards. Implement it as one TypeScript Next.js App Router project deployed to the existing Vercel application at `https://cloneusly.vercel.app/`, with Prisma ORM and Prisma Postgres providing an atomic point ledger and relational read model.

The design keeps the hackathon architecture intentionally small: Server Components for reads, Server Actions for authenticated user mutations, Better Auth for provisioned internal accounts, a secured Vercel Cron reconciliation route for monthly grants, and PostgreSQL-backed transactions for every balance change. Feed and leaderboard views are computed from indexed immutable recognition facts; no cache, queue, media storage, or separate API service is introduced.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 24 LTS

**Primary Dependencies**: Next.js App Router, React, Prisma ORM, Prisma Postgres, Better Auth with Prisma adapter, Zod, and Tailwind CSS; use current stable releases when scaffolding

**Storage**: Prisma Postgres for application, authentication, immutable point journal, and read-model data; separate production, preview, and test environments

**Testing**: Vitest for unit/domain tests, PostgreSQL-backed integration tests for Prisma transactions and constraints, and Playwright for critical end-to-end flows

**Target Platform**: Vercel Node.js runtime serving `https://cloneusly.vercel.app/`; responsive support for current desktop and mobile browsers

**Project Type**: Single full-stack web application using hybrid Jamstack delivery

**Performance Goals**: User-visible feed, balance, notification, and leaderboard updates within 2 seconds; first feed page and leaderboard queries complete within 1 second at expected scale

**Constraints**: Balance-changing actions are atomic, idempotent, and never produce negative balances; secrets remain server-only; Vercel Cron runs in UTC and may be delayed; production rollback must not assume database rollback; plain-text recognition remains available when GIF content fails

**Scale/Scope**: One company workspace, up to 250 active users, 10,000 recognition messages, approximately 8 primary pages, one application deployment, and one PostgreSQL database per environment

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Gate

- **Readable by default — PASS**: Domain terms are defined in the data model; authenticated commands and HTTP routes receive explicit contracts. Non-obvious balance, idempotency, month-boundary, and ranking decisions are recorded in [research.md](./research.md).
- **Small, collaborative change — PASS**: User stories remain independently demonstrable. Implementation can proceed in slices for foundation/authentication, recognition, feed, conversion, leaderboards, grants, and social interaction. There is no existing application interface to preserve.
- **Deployable without drama — PASS**: The plan defines one Vercel application, environment-scoped Prisma Postgres credentials, an `.env.example`, repeatable npm scripts, migrations, seed data, production deployment, and routing-level rollback. Database migrations must be backward-compatible because Vercel rollback does not reverse them.
- **Verification — PASS**: Unit tests cover calculations and normalization; PostgreSQL integration tests cover atomicity, idempotency, uniqueness, and concurrency; Playwright covers primary user journeys. [quickstart.md](./quickstart.md) defines the manual demo path.
- **Simplest working design — PASS**: One Next.js application and one PostgreSQL database are sufficient. Better Auth avoids custom security code; Zod validates boundaries; Tailwind accelerates a small responsive UI; Vitest and Playwright cover distinct test levels. Cache, queue, separate API, SSO, GIF provider, object storage, and precomputed leaderboards are deferred.

### Post-Design Gate

- **Readable by default — PASS**: Source boundaries, model invariants, command results, and route ownership are explicit in the generated artifacts.
- **Small, collaborative change — PASS**: The selected structure supports feature-oriented implementation without creating multiple packages or services.
- **Deployable without drama — PASS**: Environment variables, migration order, seed path, Vercel linking, cron configuration, smoke checks, and rollback limitations are documented.
- **Verification — PASS**: Every balance mutation has transaction-level tests, and each P1/P2 journey has an end-to-end or quickstart scenario.
- **Simplest working design — PASS**: No constitution exceptions or unjustified infrastructure remain after design.

## Project Structure

### Documentation (this feature)

```text
specs/001-peer-recognition/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   ├── server-actions.md
│   └── http-endpoints.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (app)/
│   │   ├── feed/
│   │   ├── leaderboard/
│   │   ├── notifications/
│   │   ├── people/[userId]/
│   │   └── settings/points/
│   └── api/
│       ├── auth/[...all]/
│       └── cron/monthly-grants/
├── components/
│   ├── recognition/
│   ├── feed/
│   ├── leaderboard/
│   └── ui/
└── lib/
    ├── auth/
    ├── dal/
    ├── domain/
    │   ├── points/
    │   ├── recognition/
    │   └── leaderboard/
    ├── validation/
    ├── env.ts
    └── prisma.ts

prisma/
├── schema.prisma
├── migrations/
└── seed.ts

tests/
├── unit/
├── integration/
├── e2e/
└── fixtures/

public/
├── icons/
└── placeholders/

.env.example
next.config.ts
playwright.config.ts
prisma.config.ts
vercel.json
vitest.config.ts
package.json
README.md
```

**Structure Decision**: Use one Next.js project with `src/app` route groups separating unauthenticated and authenticated experiences. Keep authenticated commands thin and place authorization, transactions, and query shaping in server-only `src/lib` modules. Keep Prisma schema and migrations at the repository root so local, test, and Vercel deployment workflows use the same data definition.

## Implementation Boundaries

- **UI layer**: Renders safe view models, manages pending/error states, and never imports Prisma or secrets.
- **Server Actions and Route Handlers**: Parse Zod inputs, authenticate the caller, invoke one domain command, and return the documented result shape.
- **Data access/domain layer**: Owns authorization, point arithmetic, idempotency, transactions, retries, feed queries, and leaderboard ranking. Mark modules server-only.
- **Database layer**: Enforces uniqueness, relationships, non-negative balances, and immutable historical references through Prisma schema plus reviewed migration SQL where Prisma cannot express a constraint.
- **Deployment layer**: Vercel builds `main` for production and other branches for preview. Production cron invokes only the secured monthly-grant route.

## Delivery Sequence

1. Scaffold the single Next.js application, quality scripts, environment validation, Prisma connection, and Vercel project configuration.
2. Add Prisma models, migrations, constraints, seed fixtures, and reconciliation helpers.
3. Add Better Auth, provisioned account seeding, protected layout, and server-only authorization helpers.
4. Deliver the P1 recognition composer and atomic multi-recipient transaction with balance history.
5. Deliver the feed, user activity, normalized hashtag filtering, and cursor pagination.
6. Deliver received-to-giving conversion and its transaction history.
7. Deliver rolling overall and hashtag leaderboards.
8. Deliver daily monthly-grant reconciliation and test-mode self top-ups.
9. Deliver reactions, comments, notifications, responsive polish, end-to-end verification, and deployment documentation.

## Deployment and Rollback

- Connect the repository to the existing Vercel `cloneusly` project and keep `main` as the production branch.
- Provision Prisma Postgres through the Vercel Marketplace or attach an existing Prisma Postgres database. Scope credentials separately for development, preview, test, and production.
- Configure `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `COMPANY_TIME_ZONE`, `CRON_SECRET`, `ENABLE_TEST_TOPUPS`, and GIF host allowlist settings as documented server-only environment variables.
- Apply reviewed production migrations before or during a compatible application rollout. Prefer additive schema changes and expand/migrate/contract sequencing.
- Verify the production URL with login, feed read, one controlled recognition, balance history, and cron authorization smoke checks.
- For an application regression, use Vercel Instant Rollback to the previous known-good deployment. Do not roll back a destructive database migration; deploy a forward fix or restore through the documented database recovery process.

## Complexity Tracking

No constitution violations require exceptions. All selected dependencies support a direct requirement and all additional services have been deferred.
