# Feature Specification: Peer Recognition and Points

**Feature Branch**: `N/A (no branch hook configured)`

**Created**: 2026-07-13

**Status**: Draft

**Input**: User description: "Build a small internal Bonusly clone where company users give points to one or more colleagues in messages, track separate giving and received balances, convert received points into giving points, receive monthly allowances, and view overall or hashtag leaderboards."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recognize Colleagues with Points (Priority: P1)

As an employee, I can send a recognition message with one positive point value to one or more colleagues so that each recipient receives the stated amount and my giving balance reflects the full cost.

**Why this priority**: Peer-to-peer recognition is the core value of the product; without a trustworthy transfer flow, no other feature is useful.

**Independent Test**: Give `+10` to two distinct colleagues from an account with 100 giving points and verify that the sender has 80 giving points, each recipient gains 10 received points, and one recognition message records both recipients.

**Acceptance Scenarios**:

1. **Given** a user has 100 giving points, **When** they send `+10 @UserB @UserC Great teamwork! #teamwork`, **Then** 20 points are deducted from the sender, 10 received points are added to each recipient, and the message displays its text, recipients, value, and hashtag.
2. **Given** the sender lacks enough giving points for the point value multiplied by the number of recipients, **When** they try to send the recognition, **Then** no balances or messages change and the sender sees the required and available totals.
3. **Given** a recognition contains a GIF and multiple hashtags, **When** it is sent successfully, **Then** the GIF and normalized hashtags appear with the message.
4. **Given** a user composes a recognition, **When** they search for recipients, **Then** they can find active colleagues by display name or account identifier.

---

### User Story 2 - Browse the Recognition Feed (Priority: P2)

As an employee, I can browse a company-wide feed of recent recognition so that good work is visible and celebrated across the company.

**Why this priority**: A shared recognition feed turns point transfers into public appreciation and captures a central part of the Bonusly experience.

**Independent Test**: Send recognition from multiple users and verify that an authenticated colleague can browse the newest messages first, inspect their content, and filter the feed by user or hashtag.

**Acceptance Scenarios**:

1. **Given** multiple recognition messages exist, **When** a user opens the feed, **Then** they see messages newest first with sender, recipients, per-recipient points, text, GIF, hashtags, and time sent.
2. **Given** messages use several hashtags, **When** a user selects one hashtag, **Then** only messages containing that hashtag are shown.
3. **Given** a user selects a colleague, **When** they view that colleague's activity, **Then** they can see recognition sent and received by that colleague.

---

### User Story 3 - Convert Received Points (Priority: P2)

As an employee, I can convert some or all of my received points into giving points at a one-to-one rate so that I can pass recognition onward without automatic conversion.

**Why this priority**: Separate balances and deliberate conversion are explicit product rules and encourage users to choose when to pay recognition forward.

**Independent Test**: Start with 40 received points and 10 giving points, convert 25, and verify the balances become 15 received and 35 giving with a visible conversion record.

**Acceptance Scenarios**:

1. **Given** a user has enough received points, **When** they confirm conversion of a positive whole-point amount, **Then** that amount is deducted from received points and added to giving points exactly once.
2. **Given** a user has fewer received points than requested, **When** they attempt a conversion, **Then** both balances remain unchanged and the available amount is shown.
3. **Given** a user receives points, **When** they take no conversion action, **Then** those points remain only in the received balance.

---

### User Story 4 - Compare Recognition Leaderboards (Priority: P2)

As an employee, I can see who received the most points over recent time periods, overall or for a selected hashtag, so that contributions and company values can be celebrated.

**Why this priority**: Leaderboards provide the requested summary view and make hashtags meaningful beyond individual messages.

**Independent Test**: Create timestamped recognition across several users and hashtags, then verify totals and ranks for rolling 24-hour, 7-day, and 30-day windows in overall and hashtag-filtered views.

**Acceptance Scenarios**:

1. **Given** recognition was sent at different times, **When** a user chooses day, week, or month, **Then** rankings use only points received within the corresponding rolling 24-hour, 7-day, or 30-day window.
2. **Given** recognition contains hashtags, **When** a user selects a hashtag leaderboard, **Then** rankings count only recognition messages carrying that hashtag.
3. **Given** two users have equal qualifying totals, **When** the leaderboard is displayed, **Then** they share the same rank and are shown in a stable order.
4. **Given** no recognition qualifies for a selected period and filter, **When** the leaderboard is displayed, **Then** an empty state explains that no points were received in that view.

---

### User Story 5 - Receive and Test Giving Allowances (Priority: P3)

As an employee, I receive 100 new giving points at the beginning of each month, and as an authorized tester I can top up my own giving balance in a clearly marked test mode.

**Why this priority**: Recurring points keep recognition usable over time, while controlled top-ups make a hackathon demo practical.

**Independent Test**: Apply the monthly grant twice for the same month and verify only one 100-point grant is recorded; then enable test mode, perform a self top-up, and verify it is marked as test activity.

**Acceptance Scenarios**:

1. **Given** an active account has not received the current month's grant, **When** the monthly grant is processed, **Then** 100 giving points are added and a grant record is visible.
2. **Given** the current month's grant was already applied, **When** grant processing runs again, **Then** no duplicate points are added.
3. **Given** test mode is enabled and a user is authorized as a tester, **When** they request a valid self top-up, **Then** their giving balance increases and the record is visibly labeled as test activity.
4. **Given** test mode is disabled or the user is not authorized, **When** they attempt a test top-up, **Then** no balance changes.

---

### User Story 6 - Celebrate Recognition (Priority: P4)

As an employee, I can react to and comment on recognition messages and receive in-app notifications when I am recognized or someone interacts with my recognition.

**Why this priority**: Lightweight social interaction is a relevant Bonusly-style enhancement, but the points ledger and discovery experiences are useful without it.

**Independent Test**: Add a reaction and a comment to an existing recognition and verify that the interaction appears once, does not change point balances, and notifies the relevant user.

**Acceptance Scenarios**:

1. **Given** a recognition message exists, **When** a user adds or removes a reaction, **Then** the visible reaction count updates without changing any point balance.
2. **Given** a recognition message exists, **When** a user posts a non-empty comment, **Then** the comment appears with its author and time.
3. **Given** a user is recognized, **When** the message is sent, **Then** the recipient receives an unread in-app notification.

### Edge Cases

- Recipient mentions in one recognition must be unique; a duplicate recipient is rejected rather than charged twice.
- A sender cannot recognize themselves, inactive users, or unknown users.
- Point values, conversions, monthly grants, and test top-ups use positive whole points only; zero, negative, fractional, or malformed values are rejected.
- Sending recognition is all-or-nothing: concurrent requests cannot overspend a giving balance or partially credit recipients.
- Repeating or refreshing a completed send or conversion cannot apply its balance changes twice.
- Hashtags are matched without regard to letter case, and repeating the same hashtag in one message does not multiply leaderboard credit.
- A recognition with several hashtags contributes its full received-point amount to each applicable hashtag leaderboard; hashtag views are independent and are not intended to sum to the overall total.
- Monthly grants preserve existing giving points, including converted points, and add 100 rather than replacing the balance.
- Recognition messages and balance-affecting records are immutable after completion so historical balances and leaderboard totals remain explainable.
- Unavailable or invalid GIF content does not create a broken recognition; the user can remove it or retry before sending.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The product MUST require a company user account before any user can view or perform internal recognition activity.
- **FR-002**: Each active user MUST have a display identity, a giving-points balance, and a received-points balance.
- **FR-003**: Users MUST be able to find active colleagues by display name or account identifier when choosing recipients.
- **FR-004**: A recognition message MUST have one sender, one positive whole-point value, and one or more distinct active recipients.
- **FR-005**: A recognition message MAY include plain text, one GIF, and zero or more hashtags.
- **FR-006**: The product MUST show the total cost of a recognition as its per-recipient point value multiplied by its number of recipients before final confirmation.
- **FR-007**: On a successful send, the product MUST deduct the total cost from the sender's giving balance and add the per-recipient value to every recipient's received balance as one indivisible operation.
- **FR-008**: The product MUST reject a recognition if the sender has insufficient giving points, is included as a recipient, or names an inactive, unknown, or duplicate recipient.
- **FR-009**: Failed or repeated recognition submissions MUST NOT cause partial credits, partial deductions, or duplicate balance changes.
- **FR-010**: A user's received points MUST remain separate from giving points until that user explicitly converts an amount.
- **FR-011**: Users MUST be able to convert a positive whole-point amount up to their full received balance into giving points at a one-to-one rate.
- **FR-012**: A conversion MUST deduct and credit the same amount exactly once and MUST NOT be reversible.
- **FR-013**: Every active user MUST receive a 100-point giving grant once per calendar month, based on the company's configured month boundary.
- **FR-014**: Monthly grants MUST add to, rather than replace, existing giving balances and MUST NOT be duplicated for the same user and month.
- **FR-015**: Authorized testers MUST be able to add a positive whole-point amount to their own giving balance only while an explicit test mode is enabled.
- **FR-016**: Test top-ups MUST be visibly distinguishable from ordinary grants, conversions, and recognition activity.
- **FR-017**: Users MUST be able to browse a company-wide recognition feed ordered newest first.
- **FR-018**: Each feed item MUST show its sender, recipients, per-recipient point value, text and GIF when present, hashtags, and time sent.
- **FR-019**: Users MUST be able to filter recognition activity by user and by hashtag.
- **FR-020**: Hashtags MUST be normalized for case-insensitive matching while retaining a readable display form.
- **FR-021**: Users MUST be able to view recipient rankings for rolling 24-hour, 7-day, and 30-day periods.
- **FR-022**: Each leaderboard MUST show qualifying points received per user and MUST support both an overall view and a view restricted to one hashtag.
- **FR-023**: Hashtag leaderboards MUST count a recognition once for that hashtag even if the hashtag is repeated in its message.
- **FR-024**: Users with equal qualifying totals MUST share the same rank, with ties displayed in a stable order.
- **FR-025**: The product MUST retain an understandable, immutable history of every balance-affecting recognition, conversion, monthly grant, and test top-up.
- **FR-026**: Completed recognition messages and balance-affecting records MUST NOT be editable or deletable by ordinary users.
- **FR-027**: Users MUST be able to react to an existing recognition, remove their own reaction, and comment on recognition without changing point balances.
- **FR-028**: Users MUST receive in-app notifications when they are recognized and when another user comments on or reacts to recognition they sent.
- **FR-029**: Users MUST be able to mark notifications as read.
- **FR-030**: The product MUST provide clear, actionable feedback when validation, balance, GIF, or account-state problems prevent an action.

### Collaboration & Delivery Requirements *(mandatory)*

- **Clarity**: Account roles, point calculations, monthly grant behavior, conversion rules, hashtag normalization, leaderboard windows, and all configuration needed for GIFs, test mode, and company time boundaries MUST be documented in plain language.
- **Verification**: Automated checks MUST cover balance arithmetic, multi-recipient atomicity, duplicate submission protection, conversion limits, monthly grant uniqueness, access to test top-ups, hashtag normalization, and leaderboard window boundaries. A documented manual demo MUST cover account access, composing recognition with rich content, feed browsing, social interactions, notifications, conversion, and each leaderboard filter.
- **Deployment**: A collaborator MUST be able to start the product from a clean checkout using documented repeatable commands. Required runtime settings MUST be listed without secrets, safe local defaults or explicit validation MUST be provided, and rollback guidance MUST explain how balance records remain intact.
- **Complexity**: The initial design MUST favor the fewest services and dependencies that satisfy these requirements. Any external GIF provider, scheduled grant mechanism, or other new infrastructure MUST include a written justification and a documented simpler fallback.

### Key Entities *(include if feature involves data)*

- **Company User**: An authenticated employee represented by an account identity, display information, active status, tester authorization, giving balance, and received balance.
- **Recognition Message**: An immutable act of recognition linking one sender to one or more distinct recipients with one per-recipient point value, optional text, optional GIF, hashtags, and a sent time.
- **Hashtag**: A normalized label attached to recognition messages for discovery and value-specific leaderboards.
- **Balance Record**: An immutable explanation of a giving or received balance change, including its user, amount, type, time, and related recognition or grant when applicable.
- **Conversion**: A user-confirmed one-to-one movement from that user's received balance to their giving balance.
- **Monthly Grant**: The once-per-user, once-per-calendar-month addition of 100 giving points.
- **Reaction and Comment**: Non-balance-affecting social interactions associated with a recognition and their author.
- **Notification**: An in-app alert associated with a user and relevant recognition interaction, with read or unread state.
- **Leaderboard View**: A derived ranking of received recognition points for a selected rolling period and optional hashtag.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of first-time test users can find colleagues and send a valid recognition message in under 90 seconds without assistance.
- **SC-002**: For 100% of tested multi-recipient recognitions, the sender deduction equals the per-recipient value multiplied by the distinct recipient count and every recipient receives exactly the stated value.
- **SC-003**: No tested failed, concurrent, retried, or refreshed action produces a partial or duplicate point change.
- **SC-004**: Users can determine both their giving and received balances and complete a valid conversion in under 30 seconds.
- **SC-005**: For a reference set of recognition activity at time-window boundaries, 100% of overall and hashtag leaderboard totals and tied ranks match independently calculated expected results.
- **SC-006**: Every active test account receives exactly one 100-point grant when monthly processing is repeated for the same month.
- **SC-007**: New recognition, balance, feed, notification, and leaderboard results are visible to users within 2 seconds for a hackathon-sized company of up to 250 active users and 10,000 recognition messages.
- **SC-008**: A collaborator can start the product from a clean checkout, create test accounts, enable test points, and complete the primary recognition demo by following the documentation in under 15 minutes.
- **SC-009**: At least 80% of pilot users rate the recognition feed and point-giving flow as easy to understand after one unaided use.

## Assumptions

- The first release serves one closed company workspace with up to 250 active users; multi-company tenancy is out of scope.
- All ordinary employees have the same recognition permissions. Tester authorization and account activation are managed outside the ordinary employee flows.
- Monthly grants use one company-configured time zone and month boundary. An account becomes eligible while active; the grant does not expire and unused giving points carry forward.
- Points are whole, non-monetary recognition units. A rewards catalog, cash value, purchasing, and redemption are out of scope.
- Received totals and leaderboards are based only on points awarded through recognition messages; conversions, grants, test top-ups, comments, and reactions do not increase them.
- A recognition message may contain text, a GIF, both, or neither, provided it has a valid point value and recipient.
- GIF availability may depend on an external content source; plain-text recognition remains usable if GIF content is unavailable.
- Recognition is public to all authenticated users in the single company workspace. Private or anonymous recognition is out of scope.
- Completed recognition and conversion actions are immutable for this hackathon version; administrative corrections and moderation workflows are out of scope.
- Email, push, and chat-platform notifications, rewards redemption, organizational teams, budgets by department, and analytics beyond the specified leaderboards are out of scope.
