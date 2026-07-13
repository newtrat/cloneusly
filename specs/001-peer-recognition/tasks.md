# Tasks: Peer Recognition and Points

**Input**: Design documents from `/specs/001-peer-recognition/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Automated tests are required by the feature specification. Within each user-story phase, create the listed tests first and confirm they fail for the expected missing behavior before implementing the story.

**Organization**: Tasks are grouped by user story so each story can be implemented, verified, and handed off as an independently understandable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel after its phase prerequisites because it changes different files and does not depend on another incomplete task marked in the same group.
- **[Story]**: Maps the task to a user story from spec.md.
- Every task includes exact file paths.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the single TypeScript/Next.js project, quality tooling, environment contract, and Vercel configuration described by the plan.

- [X] T001 Scaffold the Next.js App Router project with TypeScript, Tailwind CSS, Node.js 24 metadata, and the planned `src/` layout in package.json, package-lock.json, tsconfig.json, next-env.d.ts, src/app/layout.tsx, src/app/page.tsx, and src/app/globals.css
- [X] T002 Install current stable Prisma ORM, Better Auth Prisma adapter, Zod, and required runtime packages and add dev/build/typecheck/database/test scripts in package.json and package-lock.json
- [X] T003 [P] Configure linting and formatting with repository scripts in eslint.config.mjs, prettier.config.mjs, and .prettierignore
- [X] T004 [P] Configure unit, integration, and browser test projects in vitest.config.ts, playwright.config.ts, and tests/fixtures/README.md
- [X] T005 [P] Define and document development, test, preview, and production configuration keys without values in .env.example and src/lib/env.ts
- [X] T006 [P] Configure allowed GIF hosts, security defaults, Vercel project behavior, and the Node.js runtime in next.config.ts and vercel.json

**Checkpoint**: The project installs, type-checks, and exposes placeholder scripts from a clean checkout without requiring committed secrets.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the database, authentication, protected application shell, shared command contracts, fixtures, and test harness needed by every story.

**⚠️ CRITICAL**: No user-story implementation begins until this phase is complete.

- [X] T007 Configure Prisma Postgres connections and a reusable server-only Prisma client in prisma.config.ts and src/lib/prisma.ts
- [X] T008 Define Better Auth models, UserStatus/UserRole/PointBucket/PointTransactionKind enums, User, Session, Account, Verification, PointAccount, PointTransaction, and PointEntry with both sides of every relation and required indexes in prisma/schema.prisma
- [X] T009 Generate the initial migration and add reviewed PostgreSQL checks, case-insensitive uniqueness, restrictive foreign keys, and immutable ledger protections in prisma/migrations/0001_foundation/migration.sql
- [X] T010 Configure Better Auth with database sessions, email/password login, disabled public signup, rate limiting, and trusted origins in src/lib/auth/auth.ts, src/lib/auth/client.ts, and src/app/api/auth/[...all]/route.ts
- [X] T011 Implement active-session authorization, safe user view models, shared CommandResult errors, and server-only action guards in src/lib/auth/require-user.ts, src/lib/dal/current-user.ts, and src/lib/domain/result.ts
- [X] T012 Implement login, logout, inactive-account handling, root redirect, and protected route layout in src/app/(auth)/login/page.tsx, src/app/(auth)/login/login-form.tsx, src/app/(app)/layout.tsx, and src/app/page.tsx
- [X] T013 Implement the authenticated navigation shell and current balance summary in src/components/ui/app-shell.tsx, src/components/ui/account-balances.tsx, and src/components/ui/navigation.tsx
- [X] T014 [P] Implement shared server input primitives, canonical hashing, safe-integer checks, serializable transaction retries, and structured operation logging in src/lib/validation/common.ts, src/lib/domain/idempotency.ts, src/lib/domain/transaction-retry.ts, and src/lib/domain/logger.ts
- [X] T015 Create a trusted idempotent seed workflow for at least three active users, one tester, point accounts, and journal-backed initial points in prisma/seed.ts and tests/fixtures/users.ts
- [X] T016 [P] Implement isolated PostgreSQL test database setup, cleanup, factories, and transaction assertions in tests/fixtures/database.ts, tests/fixtures/factories.ts, and tests/fixtures/ledger-assertions.ts
- [X] T017 [P] Add automated tests for environment parsing, authentication guards, inactive-user rejection, and safe view-model shaping in tests/unit/env.test.ts and tests/integration/auth.test.ts
- [X] T018 Add Playwright authentication coverage for provisioned login, logout, protected redirects, and inactive accounts in tests/e2e/auth.spec.ts
- [X] T019 Document clean-checkout installation, Prisma Postgres isolation, seed-account provisioning, and foundational verification commands in README.md

**Checkpoint**: A collaborator can prepare the database, seed users, sign in, see balances, and run the foundational test suite; all later stories can build on stable auth and ledger primitives.

---

## Phase 3: User Story 1 - Recognize Colleagues with Points (Priority: P1) 🎯 MVP

**Goal**: Let an authenticated employee find one or more active colleagues and send one immutable text/GIF/hashtag recognition whose per-recipient points are applied atomically.

**Independent Test**: From a sender with 100 giving points, send `+10` to two colleagues and verify one recognition is created, the sender has 80 giving points, and each recipient gains 10 received points; invalid, insufficient, concurrent, and retried requests cause no partial or duplicate changes.

### Tests for User Story 1

- [X] T020 [P] [US1] Add failing unit tests for recognition input parsing, duplicate recipients, total-cost overflow, hashtag normalization, and GIF host validation in tests/unit/recognition-validation.test.ts
- [X] T021 [P] [US1] Add failing PostgreSQL integration tests for atomic multi-recipient credits, insufficient funds, self/inactive recipients, immutable journal entries, idempotent retries, key conflicts, and concurrent overspending in tests/integration/send-recognition.test.ts
- [X] T022 [P] [US1] Add a failing Playwright journey for recipient search, total-cost preview, text/GIF/hashtag submission, success display, and actionable validation errors in tests/e2e/send-recognition.spec.ts

### Implementation for User Story 1

- [X] T023 [US1] Add Recognition, RecognitionRecipient, Hashtag, and RecognitionHashtag models with both relation sides, feed/activity indexes, uniqueness, and positivity constraints in prisma/schema.prisma and prisma/migrations/0002_recognition/migration.sql
- [X] T024 [P] [US1] Implement SendRecognitionInput validation, hashtag canonicalization, and allowlisted HTTPS GIF validation in src/lib/validation/recognition.ts and src/lib/domain/recognition/normalize-hashtags.ts
- [X] T025 [P] [US1] Implement authenticated active-user search and current account queries in src/lib/dal/users.ts and src/lib/dal/point-accounts.ts
- [X] T026 [US1] Implement the short serializable send-recognition transaction with guarded sender deduction, recipient increments, immutable journal rows, domain rows, idempotency result replay, and bounded P2034 retries in src/lib/domain/recognition/send-recognition.ts
- [X] T027 [US1] Expose the documented sendRecognition command and searchUsers query with safe error mapping and targeted refresh behavior in src/app/(app)/feed/actions.ts
- [X] T028 [P] [US1] Build recipient autocomplete, selected-recipient chips, point input, total-cost preview, text, hashtag, and GIF URL controls in src/components/recognition/recipient-picker.tsx and src/components/recognition/recognition-form.tsx
- [X] T029 [P] [US1] Build the committed recognition result card with sender, recipients, points, text, fallback-safe GIF, hashtags, and timestamp in src/components/recognition/recognition-card.tsx and src/components/recognition/gif-preview.tsx
- [X] T030 [US1] Integrate balances, composer, loading/error states, and the committed result into the authenticated MVP page in src/app/(app)/feed/page.tsx and src/app/(app)/feed/loading.tsx
- [X] T031 [US1] Add operation-safe logging and verify no credentials, session values, GIF fetches, or database details escape the recognition boundary in src/lib/domain/recognition/send-recognition.ts and src/app/(app)/feed/actions.ts
- [X] T032 [US1] Run the US1 unit, integration, and Playwright tests and record the completed recognition demo and known limitations in specs/001-peer-recognition/quickstart.md

**Checkpoint**: User Story 1 is a deployable MVP that demonstrates trustworthy multi-recipient recognition independently of feed browsing, conversion, leaderboards, grants, and social interactions.

---

## Phase 4: User Story 2 - Browse the Recognition Feed (Priority: P2)

**Goal**: Show a newest-first company recognition feed with cursor pagination, user/hashtag filters, and sent/received activity on colleague profiles.

**Independent Test**: Seed recognition from multiple users and verify an authenticated employee can page through newest-first cards, filter case-insensitively by hashtag, filter by user, and inspect one colleague's sent and received activity.

### Tests for User Story 2

- [X] T033 [P] [US2] Add failing PostgreSQL query tests for stable cursor pagination, sender/recipient user filtering, normalized hashtag filtering, card view-model shaping, and query-count bounds in tests/integration/recognition-feed.test.ts
- [X] T034 [P] [US2] Add a failing Playwright journey for browsing, loading another page, applying and clearing hashtag filters, and opening a colleague activity page in tests/e2e/recognition-feed.spec.ts

### Implementation for User Story 2

- [X] T035 [US2] Implement authenticated getFeed and user activity queries with `(createdAt,id)` cursors, safe limits, user/hashtag filters, and minimal view models in src/lib/dal/recognition-feed.ts
- [X] T036 [P] [US2] Extend recognition cards and create empty, error, and paginated feed views in src/components/recognition/recognition-card.tsx, src/components/feed/feed-list.tsx, and src/components/feed/feed-empty.tsx
- [X] T037 [P] [US2] Implement URL-backed hashtag/user filters and progressive cursor loading in src/components/feed/feed-filters.tsx and src/components/feed/load-more-feed.tsx
- [X] T038 [US2] Replace the MVP result-only view with the company feed while preserving the recognition composer and committed refresh behavior in src/app/(app)/feed/page.tsx
- [X] T039 [US2] Implement colleague profile summary plus separate sent and received activity sections in src/lib/dal/user-activity.ts and src/app/(app)/people/[userId]/page.tsx
- [X] T040 [US2] Run feed query and browser tests and record pagination/filter/profile verification in specs/001-peer-recognition/quickstart.md

**Checkpoint**: User Story 2 can be validated against seeded recognition data and does not require conversion, leaderboard, grant, or social features.

---

## Phase 5: User Story 3 - Convert Received Points (Priority: P2)

**Goal**: Let an employee explicitly convert a valid amount of received points into giving points one-to-one while preserving separate balances and immutable history.

**Independent Test**: Start with 40 received and 10 giving points, convert 25, and verify balances become 15 and 35 with one conversion and two journal entries; an excessive or retried request leaves exactly one valid result.

### Tests for User Story 3

- [X] T041 [P] [US3] Add failing unit tests for conversion amount validation and command result mapping in tests/unit/conversion-validation.test.ts
- [X] T042 [P] [US3] Add failing PostgreSQL integration tests for one-to-one atomic conversion, insufficient received points, idempotent replay, conflicting key reuse, concurrent conversion, and journal reconciliation in tests/integration/convert-points.test.ts
- [X] T043 [P] [US3] Add a failing Playwright journey for viewing separate balances, converting points, seeing updated history, and receiving an insufficient-balance error in tests/e2e/convert-points.spec.ts

### Implementation for User Story 3

- [X] T044 [US3] Add the Conversion model, relation sides, positive amount check, and transaction uniqueness in prisma/schema.prisma and prisma/migrations/0003_conversion/migration.sql
- [X] T045 [P] [US3] Implement ConvertReceivedPointsInput validation in src/lib/validation/conversion.ts
- [X] T046 [US3] Implement the serializable one-to-one conversion transaction with guarded received deduction, giving increment, opposite journal entries, idempotency, and retries in src/lib/domain/points/convert-points.ts
- [X] T047 [US3] Expose convertReceivedPoints and authenticated point-history queries in src/app/(app)/settings/points/actions.ts and src/lib/dal/point-history.ts
- [X] T048 [US3] Build conversion confirmation, balance refresh, error states, and immutable history UI in src/components/recognition/conversion-form.tsx, src/components/recognition/point-history.tsx, and src/app/(app)/settings/points/page.tsx
- [X] T049 [US3] Run conversion unit, integration, and browser tests and record successful and rejected conversion checks in specs/001-peer-recognition/quickstart.md

**Checkpoint**: User Story 3 independently proves that received points remain separate until a deliberate, atomic conversion.

---

## Phase 6: User Story 4 - Compare Recognition Leaderboards (Priority: P2)

**Goal**: Rank recipients by recognition points in rolling day, week, or month windows, overall or for one normalized hashtag.

**Independent Test**: Load timestamped recognition around every window boundary and verify overall/hashtag totals, dense tied ranks, stable ordering, and the empty state for rolling 24-hour, 7-day, and 30-day views.

### Tests for User Story 4

- [X] T050 [P] [US4] Add failing unit tests for period-to-window mapping, captured `asOf` semantics, dense ranks, and stable tie ordering in tests/unit/leaderboard.test.ts
- [X] T051 [P] [US4] Add failing PostgreSQL tests for boundary inclusion, recipient sums, repeated hashtags, multi-hashtag independence, overall versus hashtag totals, and 10,000-message query performance in tests/integration/leaderboard.test.ts
- [X] T052 [P] [US4] Add a failing Playwright journey for switching periods, selecting a hashtag, displaying ties, and rendering an empty leaderboard in tests/e2e/leaderboard.spec.ts

### Implementation for User Story 4

- [X] T053 [US4] Implement authenticated getLeaderboard queries from Recognition and RecognitionRecipient facts with one `asOf`, rolling windows, optional hashtag join, dense ranking, stable order, and safe limits in src/lib/dal/leaderboard.ts
- [X] T054 [P] [US4] Build accessible leaderboard rows, rank/tie presentation, period tabs, hashtag selector, loading, and empty states in src/components/leaderboard/leaderboard-list.tsx and src/components/leaderboard/leaderboard-filters.tsx
- [X] T055 [US4] Implement URL-backed overall and hashtag leaderboard rendering in src/app/(app)/leaderboard/page.tsx and src/app/(app)/leaderboard/loading.tsx
- [X] T056 [US4] Run leaderboard unit, integration, performance, and browser tests and record all window-boundary checks in specs/001-peer-recognition/quickstart.md

**Checkpoint**: User Story 4 derives accurate rankings solely from immutable recognition facts without requiring aggregate infrastructure.

---

## Phase 7: User Story 5 - Receive and Test Giving Allowances (Priority: P3)

**Goal**: Add exactly one 100-point giving grant per active user and company-local month through daily Vercel reconciliation, plus a clearly labeled, authorized tester self top-up.

**Independent Test**: Invoke reconciliation twice for the same month and verify one grant per active user, then enable test mode and verify a tester can top up only their own giving balance while ordinary users and disabled mode are rejected.

### Tests for User Story 5

- [X] T057 [P] [US5] Add failing unit tests for company-time-zone month calculation, grant idempotency keys, top-up amount limits, and test-mode authorization in tests/unit/monthly-grants.test.ts and tests/unit/test-topup.test.ts
- [X] T058 [P] [US5] Add failing PostgreSQL integration tests for repeated and concurrent monthly reconciliation, inactive users, partial per-user retry, additive carryover, tester-only self top-ups, idempotency, and history labels in tests/integration/grants-and-topups.test.ts
- [X] T059 [P] [US5] Add failing route tests for missing/invalid CRON_SECRET, safe response counters, configuration failures, and incomplete reconciliation responses in tests/integration/monthly-grant-route.test.ts
- [X] T060 [P] [US5] Add a failing Playwright journey for tester top-up visibility/success and member or disabled-mode rejection in tests/e2e/test-topup.spec.ts

### Implementation for User Story 5

- [X] T061 [US5] Add MonthlyGrant and TestTopUp models with all relation sides, unique `(userId,grantMonth)`, actor-equals-beneficiary and positive amount checks, and history indexes in prisma/schema.prisma and prisma/migrations/0004_grants_topups/migration.sql
- [X] T062 [P] [US5] Implement canonical company-local grant-month calculation and grant/top-up validation in src/lib/domain/points/grant-month.ts and src/lib/validation/topup.ts
- [X] T063 [US5] Implement per-user idempotent monthly grant reconciliation with independent serializable transactions, uniqueness race handling, journal entries, and bounded retries in src/lib/domain/points/reconcile-monthly-grants.ts
- [X] T064 [US5] Implement the secured Vercel Cron GET handler and safe reconciliation counters in src/app/api/cron/monthly-grants/route.ts
- [X] T065 [P] [US5] Configure the daily production cron schedule for `/api/cron/monthly-grants` in vercel.json
- [X] T066 [US5] Implement authorized tester self top-ups with configured limits, idempotency, journal rows, and safe errors in src/lib/domain/points/create-test-topup.ts and src/app/(app)/settings/points/actions.ts
- [X] T067 [US5] Add tester controls and distinct grant/top-up history labels without exposing the control to unauthorized users in src/components/recognition/test-topup-form.tsx, src/components/recognition/point-history.tsx, and src/app/(app)/settings/points/page.tsx
- [X] T068 [US5] Run month, route, concurrency, authorization, and browser tests and record repeated cron and top-up validation in specs/001-peer-recognition/quickstart.md

**Checkpoint**: User Story 5 keeps allowances eventually consistent despite delayed or repeated cron calls and keeps test points explicit and access-controlled.

---

## Phase 8: User Story 6 - Celebrate Recognition (Priority: P4)

**Goal**: Let employees react to and comment on recognition, notify recipients and senders about relevant activity, and manage unread in-app notifications without changing point balances.

**Independent Test**: Add and remove a reaction and add a comment from another user, verify point balances remain unchanged, then verify the relevant recipient/sender receives one unread notification and can mark it read.

### Tests for User Story 6

- [X] T069 [P] [US6] Add failing PostgreSQL integration tests for reaction toggles, unique reaction counts, immutable comments, recipient/comment/reaction notification deduplication, self-notification suppression, ownership checks, and unchanged point balances in tests/integration/social-recognition.test.ts
- [X] T070 [P] [US6] Add a failing Playwright journey for reacting, commenting, seeing the navigation unread badge, filtering notifications, and marking selected/all notifications read in tests/e2e/social-notifications.spec.ts

### Implementation for User Story 6

- [X] T071 [US6] Add Comment, Reaction, ReactionType, Notification, and NotificationType models with all relation sides, uniqueness, restrictive deletion, feed indexes, and partial unread index in prisma/schema.prisma and prisma/migrations/0005_social_notifications/migration.sql
- [X] T072 [P] [US6] Implement comment, reaction, and notification-read validators plus documented error mapping in src/lib/validation/social.ts
- [X] T073 [US6] Implement comment creation and reaction toggle services with active-user authorization, deduplication, and no point-account writes in src/lib/domain/recognition/add-comment.ts and src/lib/domain/recognition/toggle-reaction.ts
- [X] T074 [US6] Implement notification creation/read services and add atomic recipient notifications to recognition sends plus sender notifications for comments/reactions in src/lib/domain/notifications/create-notification.ts, src/lib/domain/notifications/mark-read.ts, and src/lib/domain/recognition/send-recognition.ts
- [X] T075 [US6] Expose addComment and toggleReaction actions and include reaction/comment view models in feed queries in src/app/(app)/feed/actions.ts and src/lib/dal/recognition-feed.ts
- [X] T076 [P] [US6] Build accessible reaction controls, comment form/list, optimistic reaction-only behavior, and pending/error states in src/components/recognition/reaction-bar.tsx and src/components/recognition/comments.tsx
- [X] T077 [US6] Implement notification list queries, selected/all read actions, unread navigation count, and newest-first cursor pagination in src/lib/dal/notifications.ts, src/app/(app)/notifications/actions.ts, src/app/(app)/notifications/page.tsx, and src/components/ui/navigation.tsx
- [X] T078 [US6] Integrate reactions and comments into recognition cards while preserving feed pagination and balance isolation in src/components/recognition/recognition-card.tsx and src/components/feed/feed-list.tsx
- [X] T079 [US6] Run social integration and browser tests and record no-balance-change, deduplication, and notification-read verification in specs/001-peer-recognition/quickstart.md

**Checkpoint**: User Story 6 adds the social layer without changing recognition history or point arithmetic.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Finish usability, security, operational documentation, reconciliation, performance, and clean-checkout validation across all selected stories.

- [X] T080 [P] Audit responsive layout, keyboard navigation, focus management, labels, contrast, loading announcements, and error accessibility across src/app/(app)/, src/components/recognition/, src/components/feed/, and src/components/leaderboard/
- [X] T081 [P] Add security regression coverage for server-only imports, session reauthorization, cross-user identifiers, secret redaction, GIF host restrictions, and auth/top-up rate limits in tests/integration/security-boundaries.test.ts
- [X] T082 [P] Add a deterministic 250-user/10,000-recognition fixture and verify feed and leaderboard performance goals in tests/fixtures/performance-data.ts and tests/integration/performance.test.ts
- [X] T083 Implement and test a read-only ledger-to-balance reconciliation report for collaborator diagnostics in src/lib/domain/points/reconcile-balances.ts and tests/integration/balance-reconciliation.test.ts
- [X] T084 Update environment, architecture rationale, database migration, seed, test, build, Vercel preview/production, and rollback guidance in README.md and .env.example
- [X] T085 Update implementation-specific limitations and exact manual smoke checks for `https://cloneusly.vercel.app/` in specs/001-peer-recognition/quickstart.md
- [X] T086 Run npm run format:check, npm run lint, npm run typecheck, npm run test, npm run test:integration, npm run build, and npm run test:e2e and record the successful quality gate in specs/001-peer-recognition/quickstart.md
- [X] T087 Validate installation, migration, seeding, startup, and the primary demo from a clean checkout and record elapsed setup time and any remaining limitations in specs/001-peer-recognition/quickstart.md

**Checkpoint**: The selected scope is understandable, reproducible, secure enough for internal hackathon use, verifiably deployable, and ready for handoff.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; begin immediately.
- **Foundational (Phase 2)**: Depends on Setup and blocks every user story.
- **US1 (Phase 3)**: Depends only on Foundational and is the MVP.
- **US2 (Phase 4)**: Depends on US1 recognition facts and card primitives.
- **US3 (Phase 5)**: Depends only on Foundational point-account and ledger primitives; it may run in parallel with US1 after Foundation if fixtures create received points directly through journal-backed setup.
- **US4 (Phase 6)**: Depends on US1 recognition facts; it does not depend on US2 UI.
- **US5 (Phase 7)**: Depends only on Foundational point-account and ledger primitives and may run in parallel with US1–US4 after Foundation.
- **US6 (Phase 8)**: Depends on US1 recognition and integrates with the US2 feed; schema and notification work may begin after US1 while UI integration waits for US2.
- **Polish (Phase 9)**: Depends on every user story selected for the release.

### User Story Completion Graph

```text
Setup → Foundation → US1 (MVP) → US2 ─┐
                         └──────→ US4 │
Foundation ────────────────────→ US3 │→ Polish
Foundation ────────────────────→ US5 │
US1 + US2 ─────────────────────→ US6 ┘
```

### Within Each User Story

1. Create the story's tests and confirm expected failures.
2. Add or migrate data models before implementing domain writes.
3. Implement validation and data/domain services before actions or route handlers.
4. Implement UI against documented command/query contracts.
5. Run automated and manual independent tests before marking the story complete.

## Parallel Opportunities

### Setup and Foundation

- After T001–T002, T003, T004, T005, and T006 can proceed in parallel.
- After the foundational schema and migration, T014, T015, T016, and T017 can be divided across different files; T018 waits for authentication UI.

### Parallel Example: User Story 1

```text
T020 recognition validation tests
T021 recognition transaction tests
T022 recognition browser test

After T023:
T024 recognition validation
T025 user/account queries
T028 composer UI
T029 recognition result card
```

### Parallel Example: User Story 2

```text
T033 feed query tests
T034 feed browser test

After T035:
T036 feed/card views
T037 filter and pagination controls
```

### Parallel Example: User Story 3

```text
T041 conversion validation tests
T042 conversion transaction tests
T043 conversion browser test

After T044:
T045 conversion validation
T048 conversion/history UI shell
```

### Parallel Example: User Story 4

```text
T050 leaderboard unit tests
T051 leaderboard integration tests
T052 leaderboard browser test

After T053:
T054 leaderboard components
```

### Parallel Example: User Story 5

```text
T057 grant/top-up unit tests
T058 grant/top-up transaction tests
T059 cron route tests
T060 top-up browser test

After T061:
T062 month and top-up validation
T065 Vercel cron configuration
```

### Parallel Example: User Story 6

```text
T069 social integration tests
T070 social browser test

After T071:
T072 social validation
T076 social UI components
```

### Cross-Story Team Strategy

- Developer A: US1, then US2.
- Developer B: US3, then US4 after US1 data is available.
- Developer C: US5, then US6 after US1/US2 integration points stabilize.
- Keep schema migrations sequential even when story work is parallel; rebase migration numbering before merge.

## Implementation Strategy

### MVP First

1. Complete Setup.
2. Complete Foundational.
3. Complete US1.
4. Stop and run the US1 independent test and quality checks.
5. Deploy the recognition MVP to a Vercel preview before expanding scope.

### Incremental Delivery

1. **MVP**: US1 supplies authenticated, atomic multi-recipient recognition.
2. **Discovery**: US2 adds the company feed and profile activity.
3. **Pay it forward**: US3 adds deliberate received-to-giving conversion.
4. **Celebration**: US4 adds overall and hashtag leaderboards.
5. **Sustainability**: US5 adds recurring allowances and controlled testing points.
6. **Engagement**: US6 adds reactions, comments, and in-app notifications.
7. Finish only the cross-cutting work required by the stories selected for the hackathon demo.

## Independent Test Summary

- **US1**: One `+10` message to two recipients costs 20, credits 10 each, and remains atomic and idempotent under invalid, concurrent, or retried requests.
- **US2**: Seeded recognition appears newest-first with stable pagination and correct user/hashtag filters and profile activity.
- **US3**: Converting 25 from balances 10 giving/40 received yields 35 giving/15 received exactly once with visible history.
- **US4**: Boundary fixtures produce correct rolling day/week/month totals, hashtag subsets, ties, stable ordering, and empty states.
- **US5**: Repeated reconciliation grants each active user once per local month; only enabled testers can self top up and history labels the activity.
- **US6**: Reactions/comments do not move points, relevant notifications appear once, and users can mark only their own notifications read.

## Notes

- `[P]` means different files and no unmet same-group dependency.
- Story labels provide direct traceability to spec.md.
- Never point development, preview, seed, or test commands at production Prisma Postgres.
- Do not commit secrets or generated local Vercel environment files.
- Commit after each task or small logical group; stop at any checkpoint for an independently testable increment.
