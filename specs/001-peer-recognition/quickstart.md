# Quickstart and Validation: Peer Recognition and Points

This guide defines the expected clean-checkout setup, verification, and deployment path for the implementation. Commands become runnable as the corresponding implementation tasks add the documented scripts.

## Prerequisites

- Node.js 22 LTS
- npm
- A non-production Prisma Postgres database for local development
- A separate Prisma Postgres database or branch for integration tests
- Access to the existing Vercel project serving `https://cloneusly.vercel.app/` for deployment validation

Do not use the production database for local development, preview deployments, seed data, or automated tests.

## 1. Install and Configure

```bash
git clone https://github.com/newtrat/cloneusly.git
cd cloneusly
npm ci
cp .env.example .env.local
```

Populate `.env.local` with development-only values:

```dotenv
DATABASE_URL=
DIRECT_URL=
TEST_DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
COMPANY_TIME_ZONE=America/Los_Angeles
CRON_SECRET=
ENABLE_TEST_TOPUPS=true
MAX_TEST_TOPUP_POINTS=1000
ALLOWED_GIF_HOSTS=media.giphy.com,media.tenor.com
SEED_USER_PASSWORD=
```

Configuration rules:

- Use strong random values for `BETTER_AUTH_SECRET`, `CRON_SECRET`, and seeded passwords.
- Never commit `.env.local` or downloaded Vercel environment files.
- `DATABASE_URL` and `TEST_DATABASE_URL` must point to different non-production databases.
- Production and preview environments must not share a database.
- Set `ENABLE_TEST_TOPUPS=false` in production unless the demo explicitly requires tester top-ups.

## 2. Prepare the Database

```bash
npm run db:generate
npm run db:migrate:dev
npm run db:seed
```

Expected seed outcome:

- At least three active company users exist for local recognition testing.
- At least one user has role `TESTER`.
- Seeded accounts authenticate with the locally supplied `SEED_USER_PASSWORD`.
- Initial points are represented by ordinary monthly-grant or labeled test-top-up journal records; the seed does not silently alter balance columns.

## 3. Run Locally

```bash
npm run dev
```

Open `http://localhost:3000`.

Expected result:

- Signed-out visitors are redirected to `/login`.
- A provisioned account can sign in.
- The authenticated shell shows the current giving and received balances.
- No server secret or database field outside the documented view models appears in browser responses.

## 4. Automated Verification

Run the complete local quality gate:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:integration
npm run build
npm run test:e2e
```

Required unit coverage:

- Multi-recipient total-cost calculation
- Positive whole-point validation and overflow rejection
- Hashtag normalization and deduplication
- Company-local month calculation
- Rolling 24-hour, 7-day, and 30-day window boundaries
- Dense-rank tie behavior
- GIF URL and host validation

Required PostgreSQL integration coverage:

- A valid two-recipient recognition deducts twice the per-recipient value and credits each recipient once.
- Insufficient funds roll back recognition, journal entries, recipients, and notifications.
- Concurrent sends cannot make a giving balance negative.
- Retrying the same request ID returns one result and one set of point entries.
- Reusing a request ID with changed input is rejected.
- Conversion updates both balances and two journal entries atomically.
- Repeated monthly reconciliation creates one grant per active user and month.
- Test top-ups require both test mode and tester authorization.
- Database checks reject negative projected balances and invalid amounts.

Required Playwright journeys:

- Login and logout with a provisioned account
- Search for multiple recipients and send text/hashtag recognition
- Attach and render an allowed GIF URL; reject a disallowed host
- Browse and filter the feed
- Convert received points and observe both balances
- Compare overall and hashtag leaderboards for each period
- React, comment, receive a notification, and mark it read
- Use a test top-up as a tester and confirm ordinary members cannot

## 5. Manual End-to-End Demo

### Recognition and Feed

1. Sign in as a seeded sender with 100 giving points.
2. Compose `+10` recognition for two other seeded users with text and `#teamwork`.
3. Confirm the UI shows a 20-point total before submission.
4. Submit once and verify the sender has 80 giving points.
5. Sign in as each recipient and verify each has 10 additional received points.
6. Confirm one feed card shows both recipients, 10 points each, text, hashtag, and timestamp.
7. Filter the feed by `#TEAMWORK` and confirm case-insensitive matching.

### Failure and Retry Safety

1. Attempt a recognition whose total exceeds the sender's giving balance.
2. Confirm no message, point entry, balance, or notification is created.
3. Run the integration test that submits the same request ID concurrently.
4. Confirm the database contains one completed recognition transaction.

### Conversion

1. Open `/settings/points` as a recipient with at least 10 received points.
2. Convert 5 points.
3. Confirm received decreases by 5, giving increases by 5, and one conversion appears in history.
4. Attempt to convert more than the remaining received balance and confirm neither balance changes.

### Leaderboards

1. Open `/leaderboard?period=day`.
2. Verify the two recipients appear with expected points and tied rank.
3. Apply the `teamwork` hashtag filter and verify only matching recognition contributes.
4. Run the seeded boundary fixture test to verify exclusions just outside 24 hours, 7 days, and 30 days.

### Social Interaction

1. React and comment on the recognition from another account.
2. Confirm point balances do not change.
3. Sign in as the sender, confirm unread notifications, and mark them read.

## 6. Validate Monthly Grants

Run the local application, then invoke the cron route with the local secret:

```bash
curl --fail-with-body \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  http://localhost:3000/api/cron/monthly-grants
```

Invoke it a second time.

Expected result:

- First run grants 100 giving points to each active user missing the current company-local month.
- Second run reports those users as already granted and changes no balances.
- Inactive users receive nothing.
- Every grant has one MonthlyGrant, one PointTransaction, and one positive giving PointEntry.
- Calling without the authorization header returns `401`.

## 7. Validate Test Top-Ups

1. With `ENABLE_TEST_TOPUPS=true`, sign in as the seeded tester.
2. Add a valid amount no greater than `MAX_TEST_TOPUP_POINTS`.
3. Confirm the balance history labels it as test activity.
4. Repeat as an ordinary member and confirm it is forbidden.
5. Restart with `ENABLE_TEST_TOPUPS=false` and confirm the control is hidden and direct invocation is rejected.

## 8. Vercel Preview Deployment

Link the checkout to the existing project if needed:

```bash
npx vercel link
npx vercel env pull .env.local
npx vercel
```

Before preview deployment:

- Confirm preview `DATABASE_URL` targets non-production Prisma Postgres.
- Confirm preview authentication URL/trusted origins include the generated preview origin.
- Apply migrations to the preview database.
- Do not seed shared passwords into production.

Smoke-test the preview login, one recognition, conversion, feed filter, and leaderboard before production promotion.

## 9. Production Deployment

Production normally deploys from `main` through the connected Vercel Git integration. A deliberate CLI deployment may use:

```bash
npx vercel --prod
```

Production readiness checks:

- Production Prisma Postgres is connected and backed up.
- Production migrations are reviewed, additive, and compatible with the currently running deployment.
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=https://cloneusly.vercel.app`, `COMPANY_TIME_ZONE`, and `CRON_SECRET` are configured as production secrets.
- Public signup is disabled.
- `ENABLE_TEST_TOPUPS` has an explicit production value.
- Vercel Cron lists `/api/cron/monthly-grants` with the daily schedule.
- The deployment passes login, feed-read, controlled recognition, balance-history, and unauthorized-cron smoke checks.

## 10. Rollback

For an application-only regression:

```bash
npx vercel rollback <previous-deployment-url-or-id>
npx vercel rollback status
```

Important:

- Vercel rollback changes production routing; it does not reverse database migrations or data mutations.
- On Vercel Hobby, rollback is limited to the immediately previous production deployment.
- Prefer backward-compatible migrations so both the old and new application can run during rollback.
- For a data problem, stop point mutations if necessary and use a forward repair or the Prisma Postgres recovery process; do not improvise destructive SQL.

## Known Hackathon Limitations

- Email/password accounts are provisioned manually; company SSO, self-service signup, password reset email, and automated offboarding are deferred.
- Vercel Hobby cron is best-effort within its scheduled hour. Daily idempotent reconciliation ensures eventual monthly grants rather than exact midnight execution.
- GIF support accepts configured remote URLs; there is no GIF search, upload, proxy, or moderation service.
- Leaderboards query raw recognition facts and do not use precomputed aggregates.
- Application rollback does not imply database rollback.
