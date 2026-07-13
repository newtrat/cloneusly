# Data Model: Peer Recognition and Points

**Date**: 2026-07-13  
**Database**: PostgreSQL through Prisma ORM and Prisma Postgres

## Modeling Principles

1. Every point balance change has one immutable transaction header and one or more immutable signed entries.
2. Current balances are stored projections updated in the same database transaction as their journal entries.
3. Recognition facts, not balances, are the source for feeds and leaderboards.
4. Idempotency and business uniqueness are enforced in the database, not only in application checks.
5. Historical point and recognition records use restricted deletion. Users are deactivated instead of deleted.
6. Timestamps are stored in UTC. Company-local month calculation uses `COMPANY_TIME_ZONE` before persisting a canonical month.

## Enumerations

### UserStatus

- `ACTIVE`
- `INACTIVE`

### UserRole

- `MEMBER`
- `TESTER`

### PointBucket

- `GIVING`
- `RECEIVED`

### PointTransactionKind

- `RECOGNITION`
- `CONVERSION`
- `MONTHLY_GRANT`
- `TEST_TOP_UP`

### NotificationType

- `RECOGNITION_RECEIVED`
- `RECOGNITION_REACTION`
- `RECOGNITION_COMMENT`

## Authentication Entities

Better Auth owns the authentication-facing shape of `User`, `Session`, `Account`, and `Verification`. The implementation must generate or reconcile the exact adapter fields against the installed stable Better Auth version before creating the initial migration.

### User

Represents one company employee and is the stable identity referenced by all application data.

| Field | Type | Rules |
|---|---|---|
| `id` | string identifier | Primary key |
| `email` | normalized string | Unique, required |
| `emailVerified` | boolean | Managed by Better Auth |
| `name` | string | Required, 1–100 characters |
| `image` | HTTPS URL or null | Optional |
| `handle` | normalized string | Unique, required, case-insensitive lookup |
| `status` | UserStatus | Defaults to `ACTIVE` |
| `role` | UserRole | Defaults to `MEMBER` |
| `createdAt` | timestamp | Immutable |
| `updatedAt` | timestamp | Updated for profile or status changes |

Relationships:

- Has one `PointAccount`.
- Has authentication sessions and provider/password accounts.
- Sends and receives recognition.
- Owns comments, reactions, notifications, conversions, grants, and top-ups.

Deletion rule: restrict deletion while historical records exist. Set `status = INACTIVE` to offboard a user.

### Session

Database-backed Better Auth session associated with one user. Session expiry, token uniqueness, IP address, and user-agent fields follow the adapter's current schema.

### Account

Better Auth credential/provider account associated with one user. Public signup remains disabled; trusted seed or administration code provisions initial users.

### Verification

Better Auth verification record retained if required by the installed authentication configuration.

## Point Ledger Entities

### PointAccount

Stores the current balance projection for one user.

| Field | Type | Rules |
|---|---|---|
| `userId` | string identifier | Primary key and foreign key to User |
| `givingBalance` | integer | Required, defaults to 0, database check `>= 0` |
| `receivedBalance` | integer | Required, defaults to 0, database check `>= 0` |
| `updatedAt` | timestamp | Updated with every balance mutation |

Invariant: each balance equals the sum of all `PointEntry.delta` values for that user and bucket. A reconciliation check reports any mismatch; ordinary application code never edits a balance without journal entries in the same transaction.

### PointTransaction

Immutable header for one completed balance-changing business command.

| Field | Type | Rules |
|---|---|---|
| `id` | string identifier | Primary key |
| `kind` | PointTransactionKind | Required |
| `actorUserId` | string identifier or null | User who initiated the command; null only for system grant reconciliation |
| `idempotencyScope` | string | Required; for example `user:<id>` or `system:monthly-grants` |
| `idempotencyKey` | string | Required client or system operation key |
| `requestHash` | string | Hash of canonical command input |
| `createdAt` | timestamp | Immutable |

Constraints:

- Unique `(idempotencyScope, kind, idempotencyKey)`.
- Reusing a key with the same request hash returns the prior completed result.
- Reusing a key with a different request hash is rejected as an idempotency conflict.

### PointEntry

Immutable signed change to one balance bucket.

| Field | Type | Rules |
|---|---|---|
| `id` | string identifier | Primary key |
| `transactionId` | string identifier | Required foreign key to PointTransaction |
| `userId` | string identifier | Required foreign key to User |
| `bucket` | PointBucket | Required |
| `delta` | integer | Required, non-zero |
| `createdAt` | timestamp | Copied from transaction time |

Indexes:

- `(userId, bucket, createdAt, id)` for balance history and reconciliation.
- `(transactionId)` for transaction detail.

Deletion and update rules: deny ordinary updates or deletes. Migration-level protection may use database permissions or an immutability trigger if practical for the hackathon environment.

## Recognition Entities

### Recognition

Immutable parent message created by a successful point transaction.

| Field | Type | Rules |
|---|---|---|
| `id` | string identifier | Primary key |
| `transactionId` | string identifier | Unique foreign key to PointTransaction |
| `senderId` | string identifier | Required active User at creation time |
| `pointsPerRecipient` | integer | Positive whole number |
| `text` | string or null | Trimmed, maximum 2,000 characters |
| `gifUrl` | HTTPS URL or null | Maximum 2,048 characters; host allowlist |
| `createdAt` | timestamp | Immutable |

Indexes:

- `(createdAt DESC, id DESC)` for the global feed.
- `(senderId, createdAt DESC, id DESC)` for sent activity.

### RecognitionRecipient

Associates each distinct recipient with one recognition.

| Field | Type | Rules |
|---|---|---|
| `recognitionId` | string identifier | Foreign key to Recognition |
| `recipientId` | string identifier | Foreign key to User |
| `createdAt` | timestamp | Same logical time as Recognition |

Constraints:

- Composite primary or unique key `(recognitionId, recipientId)`.
- Recipient must differ from the recognition sender.
- Recipient must be active when the recognition transaction executes.

Indexes:

- `(recipientId, createdAt DESC, recognitionId)` for received activity and leaderboard windows.
- `(recognitionId)` for message rendering.

### Hashtag

Canonical company-wide hashtag.

| Field | Type | Rules |
|---|---|---|
| `id` | string identifier | Primary key |
| `normalizedName` | string | Unique lowercase value without `#`; 1–50 allowed characters |
| `displayName` | string | First accepted readable form |
| `createdAt` | timestamp | Immutable |

### RecognitionHashtag

Join between recognition and hashtag.

Constraints:

- Composite primary or unique key `(recognitionId, hashtagId)`.
- Repeating the same normalized hashtag in one input produces one row.

Indexes:

- `(hashtagId, recognitionId)` for filtered feeds and leaderboards.

## Balance-Changing Domain Records

### Conversion

Records a completed one-way movement from received to giving points.

| Field | Type | Rules |
|---|---|---|
| `id` | string identifier | Primary key |
| `transactionId` | string identifier | Unique foreign key to PointTransaction |
| `userId` | string identifier | Required |
| `amount` | integer | Positive whole number |
| `createdAt` | timestamp | Immutable |

Transaction entries:

- User `RECEIVED`: `-amount`
- User `GIVING`: `+amount`

### MonthlyGrant

Records one additive monthly allowance for one active user.

| Field | Type | Rules |
|---|---|---|
| `id` | string identifier | Primary key |
| `transactionId` | string identifier | Unique foreign key to PointTransaction |
| `userId` | string identifier | Required |
| `grantMonth` | date | First day of the company-local calendar month |
| `amount` | integer | Positive; 100 for this feature |
| `createdAt` | timestamp | Immutable |

Constraint: unique `(userId, grantMonth)`.

Transaction entry:

- User `GIVING`: `+amount`

### TestTopUp

Records a visibly non-production-style self top-up.

| Field | Type | Rules |
|---|---|---|
| `id` | string identifier | Primary key |
| `transactionId` | string identifier | Unique foreign key to PointTransaction |
| `actorUserId` | string identifier | Required tester |
| `beneficiaryUserId` | string identifier | Must equal actor |
| `amount` | integer | Positive and within configured maximum |
| `createdAt` | timestamp | Immutable |

Creation requires `ENABLE_TEST_TOPUPS = true` and `User.role = TESTER`.

Transaction entry:

- Beneficiary `GIVING`: `+amount`

## Social Entities

### Comment

| Field | Type | Rules |
|---|---|---|
| `id` | string identifier | Primary key |
| `recognitionId` | string identifier | Required |
| `authorId` | string identifier | Required active User |
| `body` | string | Trimmed, 1–1,000 characters |
| `createdAt` | timestamp | Immutable |

Index: `(recognitionId, createdAt, id)`.

### Reaction

| Field | Type | Rules |
|---|---|---|
| `id` | string identifier | Primary key |
| `recognitionId` | string identifier | Required |
| `userId` | string identifier | Required active User |
| `reactionType` | string | Value from a small application allowlist |
| `createdAt` | timestamp | Immutable |

Constraint: unique `(recognitionId, userId, reactionType)`.

### Notification

| Field | Type | Rules |
|---|---|---|
| `id` | string identifier | Primary key |
| `userId` | string identifier | Notification recipient |
| `type` | NotificationType | Required |
| `recognitionId` | string identifier | Required |
| `actorUserId` | string identifier | User who caused the event |
| `eventKey` | string | Stable deduplication key |
| `createdAt` | timestamp | Immutable |
| `readAt` | timestamp or null | Null means unread |

Constraints and indexes:

- Unique `(userId, type, eventKey)`.
- `(userId, createdAt DESC, id DESC)` for the notification list.
- Partial unread index on `userId` where `readAt IS NULL`, added with migration SQL if needed.

Do not create a notification when actor and recipient are the same.

## Relationships Summary

- One User has one PointAccount and many PointEntries.
- One PointTransaction has many PointEntries and exactly one domain record appropriate to its kind.
- One Recognition belongs to one sender and has one or more RecognitionRecipients.
- Recognition and Hashtag have a many-to-many relationship through RecognitionHashtag.
- Recognition has many Comments, Reactions, and Notifications.
- Conversion, MonthlyGrant, and TestTopUp each reference one PointTransaction.

## Transaction Workflows

### Send Recognition

1. Canonicalize recipients and hashtags; reject duplicate recipients before opening a transaction.
2. Open a short serializable transaction and claim the idempotency key.
3. Re-read the sender, point account, and all recipients; require active users and no self-recipient.
4. Conditionally decrement `givingBalance` by `pointsPerRecipient × recipientCount`; require exactly one updated account.
5. Create Recognition, RecognitionRecipient, normalized Hashtag associations, and the PointTransaction.
6. Add one negative sender giving entry and one positive received entry per recipient.
7. Increment every recipient's `receivedBalance`.
8. Create deduplicated recipient notifications and commit.
9. Retry the complete workflow on serialization conflict only.

### Convert Received Points

1. Claim idempotency key in a serializable transaction.
2. Conditionally decrement the caller's `receivedBalance`; reject if insufficient.
3. Increment the same account's `givingBalance` by the identical amount.
4. Create Conversion, PointTransaction, and two opposite PointEntries.
5. Commit and return both resulting balances.

### Reconcile Monthly Grants

1. Compute canonical `grantMonth` from UTC now and `COMPANY_TIME_ZONE`.
2. Load active users missing a MonthlyGrant for that month.
3. Process each user in a short independent transaction.
4. Insert MonthlyGrant under the unique `(userId, grantMonth)` constraint.
5. Increment giving balance, append the PointTransaction and PointEntry, and commit.
6. Treat a uniqueness conflict as already granted and continue.

### Apply Test Top-Up

1. Authenticate a tester and require test mode.
2. Validate the configured amount limit and actor-equals-beneficiary rule.
3. Claim idempotency key, increment giving balance, and create TestTopUp plus journal rows in one transaction.

## State Transitions

### User

- `ACTIVE → INACTIVE`: account can no longer sign in, receive recognition, comment, react, convert, or top up; history remains visible.
- `INACTIVE → ACTIVE`: allowed through trusted administration; future monthly reconciliation grants the current month if missing.

### Notification

- `UNREAD (readAt = null) → READ (readAt set)`.
- Re-marking a read notification is idempotent.

### Point and Recognition Records

- Created only as part of a successful transaction.
- No ordinary update or delete transition.

## Leaderboard Projection

For each request:

1. Capture one `asOf` timestamp.
2. Derive `windowStart` as 24 hours, 7 days, or 30 days before `asOf`.
3. Filter Recognition rows to `[windowStart, asOf]`.
4. Join RecognitionRecipient and sum `pointsPerRecipient` by recipient.
5. If filtering by hashtag, join the single normalized RecognitionHashtag association.
6. Apply dense rank by total points descending.
7. Return ties in stable `User.id` order.

No aggregate table is required at the target scale. Add time-bucket rollups only after measured query performance fails the plan's goal.

## Migration-Level Constraints

The initial reviewed migration must supplement the Prisma schema where needed:

- Non-negative checks for both PointAccount balances.
- Positive checks for recognition, conversion, grant, and top-up amounts.
- Non-zero check for PointEntry delta.
- Self-recipient and actor-equals-beneficiary checks where expressible.
- Case-insensitive uniqueness strategy for email, handle, and normalized hashtag.
- Partial unread notification index.
- Restrictive foreign-key deletion behavior for historical records.

Migration rollback documentation must distinguish application rollback from schema/data recovery. Production migrations should be additive and backward-compatible whenever possible.
