# Research: Peer Recognition and Points

**Date**: 2026-07-13

## Decision 1: Hybrid Jamstack application on Vercel

**Decision**: Build a single TypeScript Next.js App Router application and deploy `main` to the existing `https://cloneusly.vercel.app/` Vercel project. Use Server Components for authenticated reads, Server Actions for user mutations, and Route Handlers only where HTTP endpoints are required.

**Rationale**: The application needs dynamic authentication and atomic database mutations, so it cannot be a static-only export. A single Next.js project retains Jamstack-style prebuilt assets and branch previews while keeping the server-side point logic in the same deployable unit. This is the smallest architecture that meets the requirements.

**Alternatives considered**:

- **Prisma Compute**: It now hosts TypeScript applications, but the user already has a Vercel project and explicitly selected Vercel. Adding or migrating to a second host offers no hackathon benefit.
- **Separate frontend and API services**: Rejected because it adds deployment, authentication, and interface coordination without a scale-driven need.
- **Static export with client-side database access**: Rejected because database credentials and balance mutations must stay server-side.

**Sources**:

- [Next.js deployment](https://nextjs.org/docs/app/getting-started/deploying)
- [Next.js backend-for-frontend guidance](https://nextjs.org/docs/app/guides/backend-for-frontend)
- [Vercel deployment environments](https://vercel.com/docs/deployments/environments)

## Decision 2: Prisma ORM with Prisma Postgres

**Decision**: Use the current stable Prisma ORM with Prisma Postgres provisioned through the Vercel Marketplace. Keep separate production, preview, and test databases or credentials; use the pooled runtime connection and a migration-capable direct connection where required.

**Rationale**: Prisma provides the requested TypeScript data layer, migrations, generated types, and transactions. Prisma Postgres integrates with Vercel environment variables and supports the relational constraints and aggregations needed for the ledger, feed, and leaderboards.

**Alternatives considered**:

- **SQLite**: Simpler locally but rejected because its concurrency and deployment characteristics would not validate production transaction behavior.
- **Non-relational storage**: Rejected because multi-recipient atomic writes, unique monthly grants, ledger relationships, and leaderboard joins fit PostgreSQL directly.
- **Additional cache or search service**: Rejected at the target scale of 250 users and 10,000 messages; indexed PostgreSQL queries are sufficient.

**Sources**:

- [Prisma Postgres on Vercel](https://www.prisma.io/docs/guides/postgres/vercel)
- [Vercel Marketplace storage](https://vercel.com/docs/marketplace-storage)
- [Prisma connection pooling](https://www.prisma.io/docs/postgres/database/connection-pooling)

## Decision 3: Stored balances backed by an immutable point journal

**Decision**: Store current giving and received balances on a one-to-one point account for fast reads and guarded updates. In the same transaction, append an immutable transaction header and signed point entries explaining every balance change. Derive historical totals from the journal when reconciling.

**Rationale**: Calculating balances from the full journal on every request would still require serialized spending protection. Transactional balance projections provide simple reads, while the journal preserves auditability and allows reconciliation.

**Alternatives considered**:

- **Journal-only balances**: Rejected because each spend would need an aggregate plus locking or equivalent serialization.
- **Mutable balances without a journal**: Rejected because failures and leaderboard discrepancies would be difficult to explain or repair.
- **Event-sourcing framework**: Rejected as unnecessary abstraction; ordinary relational rows and transactions provide the needed properties.

## Decision 4: Serializable, idempotent balance commands

**Decision**: Execute recognition, conversion, monthly grants, and test top-ups as short Prisma interactive transactions at PostgreSQL `Serializable` isolation. Each user command carries an idempotency key and canonical request hash. Use conditional balance decrements, database uniqueness constraints, and retry complete transactions up to three times with capped jitter on Prisma `P2034`.

**Rationale**: Multi-recipient gifts must be all-or-nothing, retries must not duplicate credits, and concurrent sends must not overspend. Serializable transactions plus guarded updates and durable unique keys handle these requirements without distributed locks.

**Alternatives considered**:

- **Default `ReadCommitted` only**: Atomic conditional decrements can prevent negative balances, but serializable isolation more clearly protects the whole read/validate/write workflow at this small scale.
- **Application mutex or Redis lock**: Rejected because serverless instances do not share memory and a separate lock service is unnecessary.
- **Long-running transaction containing GIF requests**: Rejected; no network work belongs inside point transactions.

**Sources**:

- [Prisma transactions and idempotency](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- [Prisma error reference](https://www.prisma.io/docs/orm/reference/error-reference)
- [PostgreSQL serialization failures](https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html)

## Decision 5: Better Auth with provisioned email/password accounts

**Decision**: Use Better Auth with its Prisma adapter, database-backed sessions, and email/password authentication. Disable public registration. Provision hackathon users with a trusted seed script and require unique initial passwords. Recheck authentication and authorization in every Server Action and protected Route Handler.

**Rationale**: This avoids building session and password security from scratch and does not require an email provider or company identity integration for the demo. Better Auth is the current maintained successor path around the Auth.js ecosystem and supports Prisma directly.

**Alternatives considered**:

- **Company Google Workspace or Microsoft Entra SSO**: Preferred for a real rollout, but deferred because tenant configuration and credentials were not supplied.
- **Email magic links**: Rejected for the hackathon because it requires an email delivery service.
- **Custom cookie and password implementation**: Rejected due to avoidable security risk.
- **Vercel deployment protection as app auth**: Rejected because the application needs stable user identities for balances and recognition.

**Sources**:

- [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication)
- [Next.js data security guidance](https://nextjs.org/docs/app/guides/data-security)
- [Better Auth Prisma adapter](https://www.better-auth.com/docs/adapters/prisma)
- [Better Auth email and password](https://www.better-auth.com/docs/authentication/email-password)

## Decision 6: Daily reconciliation through Vercel Cron

**Decision**: Configure Vercel Cron to call a secured monthly-grant reconciliation route once per day. The route computes the current company-local month and grants 100 points to each active user missing a unique `(user, grant month)` record. Protect it with `CRON_SECRET`. Provide an authenticated manual invocation path for local and demo validation.

**Rationale**: Vercel cron schedules use UTC, Hobby schedules are best-effort within the scheduled hour, and failed runs are not guaranteed to retry. A daily idempotent reconciliation repairs missed runs and still grants each user exactly once per company month.

**Alternatives considered**:

- **Run only at midnight on the first day**: Rejected because one missed invocation could skip an entire month and company time zones may not align with UTC.
- **External scheduler**: Rejected because Vercel already provides sufficient daily scheduling.
- **Grant lazily only when each user signs in**: Rejected because inactive users would not receive the grant consistently and administration would be harder to verify.

**Sources**:

- [Vercel Cron quickstart](https://vercel.com/docs/cron-jobs/quickstart)
- [Vercel Cron management and security](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- [Vercel Cron behavior](https://vercel.com/docs/cron-jobs)

## Decision 7: Derive feed and leaderboards from recognition facts

**Decision**: Query the feed from immutable recognition rows with cursor pagination. Calculate rolling 24-hour, 7-day, and 30-day leaderboards from recognition-recipient rows, using a single `asOf` timestamp and dense ranking. Join normalized hashtag associations only when a hashtag filter is selected.

**Rationale**: At 10,000 recognition messages, indexed relational queries are simpler and sufficiently fast. Current balances and generic journal entries are not valid leaderboard sources because grants and conversions must not count.

**Alternatives considered**:

- **Precomputed leaderboard tables**: Rejected until measured query performance requires them.
- **Use received balances**: Rejected because balances include all-time recognition minus conversions and do not represent a rolling window.
- **Use journal entries**: Possible, but recognition-recipient facts express the business query more directly and exclude non-recognition credits.

## Decision 8: Direct, allowlisted GIF URLs

**Decision**: Accept one HTTPS GIF URL from an allowlisted host, display a preview, and retain plain-text usability if the image fails. Do not fetch, upload, transform, or proxy arbitrary GIF content in the initial release.

**Rationale**: This supports GIFs without adding an API key, media storage, or server-side request risk.

**Alternatives considered**:

- **Giphy or Tenor search API**: Deferred because it adds an external account, secret, content policy, and failure mode.
- **File uploads**: Rejected because object storage and moderation are outside the hackathon scope.
- **Unrestricted remote URLs**: Rejected due to tracking, inappropriate content, and server-side request risks.

**Source**:

- [Next.js image remote patterns](https://nextjs.org/docs/app/api-reference/components/image)

## Decision 9: Layered validation and testing

**Decision**: Use Zod at every server entry point, a server-only data access/domain layer, Vitest for unit tests, PostgreSQL-backed integration tests for transactions and migrations, and Playwright for critical browser journeys against a production build.

**Rationale**: Point arithmetic and normalization are fast unit-test targets, while concurrency and constraints must be exercised against PostgreSQL. Playwright covers authentication and asynchronous App Router behavior that component tests alone cannot prove.

**Alternatives considered**:

- **SQLite integration tests**: Rejected because they would not test PostgreSQL transaction isolation and constraints.
- **Browser tests only**: Rejected because concurrency and boundary cases would be slow and difficult to diagnose.
- **A second component-test framework**: Rejected initially; add it only if UI complexity makes the browser suite too slow.

**Sources**:

- [Next.js testing guidance](https://nextjs.org/docs/app/guides/testing)
- [Next.js Vitest guidance](https://nextjs.org/docs/app/guides/testing/vitest)
- [Next.js Playwright guidance](https://nextjs.org/docs/app/guides/testing/playwright)
- [Prisma integration testing](https://www.prisma.io/docs/orm/prisma-client/testing/integration-testing)

## Resolved Technical Context

- Application hosting: Vercel project serving `https://cloneusly.vercel.app/`
- Data layer: Prisma ORM and Prisma Postgres
- Application architecture: One hybrid Next.js App Router project
- Authentication: Better Auth, provisioned email/password accounts, no public signup
- Monthly processing: Daily secured Vercel Cron reconciliation
- GIF support: Allowlisted HTTPS URL, no external search provider in v1
- Transaction safety: Serializable Prisma transactions, guarded updates, unique idempotency keys, `P2034` retries
- Testing: Vitest, isolated PostgreSQL integration tests, and Playwright
- Open clarifications: None
