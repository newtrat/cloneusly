# Contract: Server Actions and Queries

**Audience**: Next.js UI and server-only domain/data-access modules  
**Transport**: In-process Next.js Server Actions and Server Component queries  
**Authentication**: Every operation requires an active Better Auth session unless explicitly marked system-only

## Shared Rules

- Client input is untrusted and parsed with Zod at the server boundary.
- Every operation rechecks authentication and authorization when invoked.
- Identifiers are opaque strings; clients must not infer authorization from possession of an identifier.
- Balance-changing commands require a client-generated `requestId`. Retrying the same canonical command with the same `requestId` returns its original success. Reusing it with different input returns `IDEMPOTENCY_CONFLICT`.
- Point amounts are positive safe integers.
- Dates returned to the client are ISO 8601 UTC strings.
- Server errors are logged with an internal correlation ID; clients receive safe messages without stack traces, SQL, or secrets.

## Shared Command Result

All mutations use this discriminated result shape:

```ts
type CommandResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: ErrorCode;
        message: string;
        fieldErrors?: Record<string, string[]>;
        correlationId?: string;
      };
    };
```

### ErrorCode

- `UNAUTHENTICATED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `USER_INACTIVE`
- `RECIPIENT_NOT_FOUND`
- `DUPLICATE_RECIPIENT`
- `SELF_RECOGNITION`
- `INSUFFICIENT_GIVING_POINTS`
- `INSUFFICIENT_RECEIVED_POINTS`
- `TEST_MODE_DISABLED`
- `IDEMPOTENCY_CONFLICT`
- `RECOGNITION_NOT_FOUND`
- `GIF_HOST_NOT_ALLOWED`
- `CONFLICT_RETRY_EXHAUSTED`
- `INTERNAL_ERROR`

## `sendRecognition`

Creates one immutable recognition and all point movements atomically.

### Input

```ts
type SendRecognitionInput = {
  requestId: string;
  recipientIds: string[];
  pointsPerRecipient: number;
  text?: string;
  gifUrl?: string;
  hashtags?: string[];
};
```

Validation:

- `recipientIds` contains at least one unique active user and does not contain the caller.
- Duplicate recipient input is rejected rather than silently deduplicated.
- `pointsPerRecipient` is a positive safe integer.
- `totalCost = pointsPerRecipient × recipientIds.length` must be a safe integer no greater than the caller's giving balance.
- `text` is trimmed and at most 2,000 characters.
- `gifUrl`, when supplied, is an HTTPS URL no longer than 2,048 characters whose host is on the configured allowlist.
- Hashtags are trimmed, stripped of one leading `#`, normalized case-insensitively, and must each contain 1–50 allowed characters. Duplicate normalized hashtags are stored once.

### Success

```ts
type SendRecognitionData = {
  recognitionId: string;
  transactionId: string;
  totalCost: number;
  givingBalance: number;
  recipients: Array<{
    userId: string;
    pointsReceived: number;
  }>;
  createdAt: string;
};
```

Transaction behavior:

- All recipient validation, sender deduction, recipient increments, journal entries, recognition rows, hashtags, and recipient notifications commit together.
- No GIF URL is fetched inside the transaction.

## `convertReceivedPoints`

Moves points one-to-one from the caller's received balance to giving balance.

### Input

```ts
type ConvertReceivedPointsInput = {
  requestId: string;
  amount: number;
};
```

Validation:

- `amount` is a positive safe integer.
- `amount` is no greater than the caller's current received balance.

### Success

```ts
type ConvertReceivedPointsData = {
  conversionId: string;
  transactionId: string;
  amount: number;
  givingBalance: number;
  receivedBalance: number;
  createdAt: string;
};
```

The operation is irreversible and commits both balance changes plus the journal in one transaction.

## `createTestTopUp`

Adds test giving points to the caller's own account.

### Input

```ts
type CreateTestTopUpInput = {
  requestId: string;
  amount: number;
};
```

Authorization and validation:

- `ENABLE_TEST_TOPUPS` must be true.
- Caller must be active and have role `TESTER`.
- Beneficiary is always the caller and cannot be supplied by the client.
- `amount` is a positive safe integer no greater than `MAX_TEST_TOPUP_POINTS`.

### Success

```ts
type CreateTestTopUpData = {
  topUpId: string;
  transactionId: string;
  amount: number;
  givingBalance: number;
  createdAt: string;
  testActivity: true;
};
```

## `addComment`

Adds an immutable comment to an existing recognition.

### Input

```ts
type AddCommentInput = {
  recognitionId: string;
  body: string;
};
```

Validation:

- Recognition exists.
- Body is trimmed and contains 1–1,000 characters.

### Success

```ts
type AddCommentData = {
  comment: {
    id: string;
    recognitionId: string;
    author: UserSummary;
    body: string;
    createdAt: string;
  };
};
```

Create one deduplicated comment notification for the recognition sender unless the commenter is the sender.

## `toggleReaction`

Adds or removes the caller's selected reaction on a recognition.

### Input

```ts
type ToggleReactionInput = {
  recognitionId: string;
  reactionType: "CLAP" | "HEART" | "CELEBRATE";
};
```

### Success

```ts
type ToggleReactionData = {
  recognitionId: string;
  reactionType: "CLAP" | "HEART" | "CELEBRATE";
  active: boolean;
  count: number;
};
```

The command is idempotent at the unique `(recognitionId, userId, reactionType)` boundary. Adding a reaction notifies the recognition sender unless they are the reacting user; removing it does not create a notification.

## `markNotificationsRead`

Marks selected notifications belonging to the caller as read.

### Input

```ts
type MarkNotificationsReadInput =
  | { mode: "selected"; notificationIds: string[] }
  | { mode: "all" };
```

### Success

```ts
type MarkNotificationsReadData = {
  updatedCount: number;
  readAt: string;
};
```

Unknown identifiers and notifications owned by another user are not updated. Repeating the command is safe.

## Query View Models

### Shared Types

```ts
type UserSummary = {
  id: string;
  handle: string;
  name: string;
  image: string | null;
};

type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};
```

### `getCurrentAccount`

Input: none beyond authenticated session.

Returns:

```ts
type CurrentAccountView = {
  user: UserSummary;
  role: "MEMBER" | "TESTER";
  givingBalance: number;
  receivedBalance: number;
  unreadNotificationCount: number;
  testTopUpsEnabled: boolean;
};
```

### `searchUsers`

Input:

```ts
type SearchUsersInput = {
  query: string;
  limit?: number; // default 10, maximum 25
};
```

Returns active `UserSummary` matches by case-insensitive name or handle, excluding the caller.

### `getFeed`

Input:

```ts
type GetFeedInput = {
  cursor?: string;
  limit?: number; // default 20, maximum 50
  userId?: string;
  hashtag?: string;
};
```

Returns `CursorPage<RecognitionCardView>` ordered by `(createdAt DESC, id DESC)`.

```ts
type RecognitionCardView = {
  id: string;
  sender: UserSummary;
  recipients: UserSummary[];
  pointsPerRecipient: number;
  text: string | null;
  gifUrl: string | null;
  hashtags: string[];
  createdAt: string;
  reactions: Array<{
    reactionType: "CLAP" | "HEART" | "CELEBRATE";
    count: number;
    reactedByCurrentUser: boolean;
  }>;
  comments: Array<{
    id: string;
    author: UserSummary;
    body: string;
    createdAt: string;
  }>;
};
```

The initial card may include only the latest comments; a later comment-pagination query may be added without changing point behavior.

### `getLeaderboard`

Input:

```ts
type GetLeaderboardInput = {
  period: "day" | "week" | "month";
  hashtag?: string;
  limit?: number; // default 25, maximum 100
};
```

Returns:

```ts
type LeaderboardView = {
  period: "day" | "week" | "month";
  hashtag: string | null;
  asOf: string;
  windowStart: string;
  entries: Array<{
    rank: number;
    user: UserSummary;
    pointsReceived: number;
  }>;
};
```

Period mapping:

- `day`: rolling 24 hours
- `week`: rolling 7 days
- `month`: rolling 30 days

Equal totals use dense rank and stable user-ID ordering.

### `getNotifications`

Input:

```ts
type GetNotificationsInput = {
  cursor?: string;
  limit?: number; // default 20, maximum 50
  unreadOnly?: boolean;
};
```

Returns only notifications owned by the caller in newest-first cursor order.

## Cache and Refresh Contract

- Authenticated balance, feed, leaderboard, user activity, and notification data is dynamic and must not be shared across users through a public cache.
- After a successful mutation, refresh or invalidate the smallest relevant route data: account balances, feed or recognition card, leaderboard, and notifications as applicable.
- Client optimistic UI may be used for reactions only. Point balances and recognition sends display committed server results.
