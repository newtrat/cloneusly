# Contract: Routes and HTTP Endpoints

**Application**: Next.js App Router on Vercel  
**Production origin**: `https://cloneusly.vercel.app`

## Browser Routes

| Route | Access | Purpose |
|---|---|---|
| `/login` | Signed-out users | Email/password login for provisioned company accounts |
| `/` | Authenticated | Redirect to `/feed` |
| `/feed` | Authenticated active users | Recognition composer and newest-first company feed |
| `/feed?hashtag=<name>` | Authenticated active users | Feed filtered to one normalized hashtag |
| `/leaderboard?period=<day\|week\|month>&hashtag=<name?>` | Authenticated active users | Overall or hashtag rolling leaderboard |
| `/people/[userId]` | Authenticated active users | User summary and sent/received recognition activity |
| `/notifications` | Authenticated active users | Current user's notification list |
| `/settings/points` | Authenticated active users | Balance history, conversion, and tester top-up when allowed |

Route rules:

- Protected layouts perform an early session check for navigation, but every data query and mutation independently verifies the session.
- Signed-out access to a protected browser route redirects to `/login` with a safe relative return path.
- Inactive users have their sessions rejected and are returned to `/login` with a generic account-disabled message.
- Unknown users and hashtags render an ordinary not-found or empty state without leaking private account data.

## Better Auth Handler

### `/api/auth/[...all]`

**Methods**: Determined by Better Auth's current Next.js handler  
**Access**: Public transport endpoint; authentication rules are enforced by Better Auth  
**Purpose**: Sign-in, sign-out, session, and related authentication operations

Contract constraints:

- Public signup is disabled.
- Application code does not reimplement Better Auth's wire format.
- The installed Better Auth version and generated Prisma adapter schema are the source of truth for subroutes and payloads.
- Trusted origins include the production origin, Vercel preview origins as configured, and the local development origin.
- Cookies are secure in deployed environments and secrets are server-only.

## Monthly Grant Reconciliation

### `GET /api/cron/monthly-grants`

**Access**: System-only  
**Caller**: Vercel Cron in production; an authorized developer may invoke the local route for validation  
**Schedule**: Once daily, proposed `0 5 * * *` in `vercel.json`

Vercel schedules in UTC and may invoke a Hobby cron at any point in the scheduled hour. The endpoint therefore reconciles the current company-local month on every run instead of assuming an exact first-of-month invocation.

### Request Headers

```http
Authorization: Bearer <CRON_SECRET>
```

The endpoint rejects the request if `CRON_SECRET` is missing from server configuration or the authorization header does not exactly match.

Optional Vercel headers such as `x-vercel-cron-schedule` and the Vercel cron user agent may be logged for diagnostics, but they do not replace secret validation.

### Successful Response

Status: `200 OK`

```json
{
  "ok": true,
  "data": {
    "grantMonth": "2026-07-01",
    "eligibleUsers": 12,
    "grantedUsers": 3,
    "alreadyGrantedUsers": 9,
    "failedUsers": 0,
    "durationMs": 125
  }
}
```

Response field rules:

- `grantMonth` is the first day of the month computed in `COMPANY_TIME_ZONE`.
- `eligibleUsers` counts active users examined.
- `grantedUsers` counts newly committed grants.
- `alreadyGrantedUsers` includes users with an existing unique monthly grant, including uniqueness races.
- `failedUsers` counts users whose independent transaction still failed after bounded serialization retries.
- The response contains no user names, emails, secrets, or stack traces.

### Unauthorized Response

Status: `401 Unauthorized`

```json
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Unauthorized"
  }
}
```

### Configuration Error Response

Status: `503 Service Unavailable`

Returned when required server configuration such as `CRON_SECRET` or `COMPANY_TIME_ZONE` is invalid or missing.

### Partial Processing Response

Status: `500 Internal Server Error`

The response uses the successful response counters with `"ok": false` and a safe `INCOMPLETE_RECONCILIATION` error when one or more user grants fail after retries. A later daily run repairs missing grants because `(userId, grantMonth)` is unique and each user is processed independently.

### Idempotency

- Repeating this endpoint any number of times in the same month cannot grant the same user twice.
- The definitive guard is the unique monthly grant record, not an in-memory lock.
- Each user grant and its balance/journal changes commit atomically.

## Vercel Configuration Contract

The implementation adds this logical cron configuration:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/monthly-grants",
      "schedule": "0 5 * * *"
    }
  ]
}
```

Cron jobs execute only for production deployments. Preview and local validation invoke the route explicitly with an environment-specific secret and non-production database.

## HTTP Security Contract

- Never expose `DATABASE_URL`, direct database credentials, authentication secrets, or `CRON_SECRET` to browser code.
- Validate origin and session for state-changing authentication/application requests according to Better Auth and Next.js guidance.
- Do not accept arbitrary URLs for server-side fetching. GIF URLs are stored and rendered only after HTTPS host allowlist validation.
- Return `Cache-Control: private, no-store` for session-specific HTTP responses unless framework behavior already provides a stronger equivalent.
- Apply reasonable sign-in rate limiting through Better Auth's built-in facilities. Test top-ups also require authorization and a configured maximum.
- Log request IDs, operation kinds, durations, and safe error codes; do not log passwords, session tokens, authorization headers, or full database URLs.
