-- Cloneusly foundation migration
-- Generated for PostgreSQL. Apply with: npm run db:migrate:deploy

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "UserRole" AS ENUM ('MEMBER', 'TESTER');
CREATE TYPE "PointBucket" AS ENUM ('GIVING', 'RECEIVED');
CREATE TYPE "PointTransactionKind" AS ENUM ('RECOGNITION', 'CONVERSION', 'MONTHLY_GRANT', 'TEST_TOP_UP');
CREATE TYPE "NotificationType" AS ENUM ('RECOGNITION_RECEIVED', 'RECOGNITION_REACTION', 'RECOGNITION_COMMENT');
CREATE TYPE "ReactionType" AS ENUM ('CLAP', 'HEART', 'CELEBRATE');

-- CreateTable user (Better Auth + custom fields)
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "handle" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_email_key" ON "user"("email");
CREATE UNIQUE INDEX "user_handle_key" ON "user"("handle");
CREATE INDEX "user_status_idx" ON "user"("status");
CREATE UNIQUE INDEX "user_email_lower_key" ON "user"(LOWER("email"));
CREATE UNIQUE INDEX "user_handle_lower_key" ON "user"(LOWER("handle"));

-- CreateTable session
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "session_token_key" ON "session"("token");
CREATE INDEX "session_userId_idx" ON "session"("userId");
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable account
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "account_userId_idx" ON "account"("userId");
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable verification
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateTable point_account
CREATE TABLE "point_account" (
    "userId" TEXT NOT NULL,
    "givingBalance" INTEGER NOT NULL DEFAULT 0,
    "receivedBalance" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "point_account_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "point_account_givingBalance_check" CHECK ("givingBalance" >= 0),
    CONSTRAINT "point_account_receivedBalance_check" CHECK ("receivedBalance" >= 0)
);

ALTER TABLE "point_account" ADD CONSTRAINT "point_account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable point_transaction
CREATE TABLE "point_transaction" (
    "id" TEXT NOT NULL,
    "kind" "PointTransactionKind" NOT NULL,
    "actorUserId" TEXT,
    "idempotencyScope" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "point_transaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "point_transaction_idempotencyScope_kind_idempotencyKey_key" ON "point_transaction"("idempotencyScope", "kind", "idempotencyKey");
CREATE INDEX "point_transaction_actorUserId_createdAt_idx" ON "point_transaction"("actorUserId", "createdAt");
ALTER TABLE "point_transaction" ADD CONSTRAINT "point_transaction_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable point_entry
CREATE TABLE "point_entry" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bucket" "PointBucket" NOT NULL,
    "delta" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "point_entry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "point_entry_delta_check" CHECK ("delta" <> 0)
);

CREATE INDEX "point_entry_userId_bucket_createdAt_id_idx" ON "point_entry"("userId", "bucket", "createdAt", "id");
CREATE INDEX "point_entry_transactionId_idx" ON "point_entry"("transactionId");
ALTER TABLE "point_entry" ADD CONSTRAINT "point_entry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "point_transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "point_entry" ADD CONSTRAINT "point_entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable recognition
CREATE TABLE "recognition" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "pointsPerRecipient" INTEGER NOT NULL,
    "text" TEXT,
    "gifUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recognition_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "recognition_pointsPerRecipient_check" CHECK ("pointsPerRecipient" > 0)
);

CREATE UNIQUE INDEX "recognition_transactionId_key" ON "recognition"("transactionId");
CREATE INDEX "recognition_createdAt_id_idx" ON "recognition"("createdAt" DESC, "id" DESC);
CREATE INDEX "recognition_senderId_createdAt_id_idx" ON "recognition"("senderId", "createdAt" DESC, "id" DESC);
ALTER TABLE "recognition" ADD CONSTRAINT "recognition_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "point_transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recognition" ADD CONSTRAINT "recognition_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable recognition_recipient
CREATE TABLE "recognition_recipient" (
    "recognitionId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recognition_recipient_pkey" PRIMARY KEY ("recognitionId","recipientId")
);

CREATE INDEX "recognition_recipient_recipientId_createdAt_recognitionId_idx" ON "recognition_recipient"("recipientId", "createdAt" DESC, "recognitionId");
CREATE INDEX "recognition_recipient_recognitionId_idx" ON "recognition_recipient"("recognitionId");
ALTER TABLE "recognition_recipient" ADD CONSTRAINT "recognition_recipient_recognitionId_fkey" FOREIGN KEY ("recognitionId") REFERENCES "recognition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recognition_recipient" ADD CONSTRAINT "recognition_recipient_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable hashtag
CREATE TABLE "hashtag" (
    "id" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hashtag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "hashtag_normalizedName_key" ON "hashtag"("normalizedName");
CREATE UNIQUE INDEX "hashtag_normalizedName_lower_key" ON "hashtag"(LOWER("normalizedName"));

-- CreateTable recognition_hashtag
CREATE TABLE "recognition_hashtag" (
    "recognitionId" TEXT NOT NULL,
    "hashtagId" TEXT NOT NULL,
    CONSTRAINT "recognition_hashtag_pkey" PRIMARY KEY ("recognitionId","hashtagId")
);

CREATE INDEX "recognition_hashtag_hashtagId_recognitionId_idx" ON "recognition_hashtag"("hashtagId", "recognitionId");
ALTER TABLE "recognition_hashtag" ADD CONSTRAINT "recognition_hashtag_recognitionId_fkey" FOREIGN KEY ("recognitionId") REFERENCES "recognition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recognition_hashtag" ADD CONSTRAINT "recognition_hashtag_hashtagId_fkey" FOREIGN KEY ("hashtagId") REFERENCES "hashtag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable conversion
CREATE TABLE "conversion" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "conversion_amount_check" CHECK ("amount" > 0)
);

CREATE UNIQUE INDEX "conversion_transactionId_key" ON "conversion"("transactionId");
CREATE INDEX "conversion_userId_createdAt_idx" ON "conversion"("userId", "createdAt");
ALTER TABLE "conversion" ADD CONSTRAINT "conversion_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "point_transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conversion" ADD CONSTRAINT "conversion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable monthly_grant
CREATE TABLE "monthly_grant" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantMonth" DATE NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "monthly_grant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "monthly_grant_amount_check" CHECK ("amount" > 0)
);

CREATE UNIQUE INDEX "monthly_grant_transactionId_key" ON "monthly_grant"("transactionId");
CREATE UNIQUE INDEX "monthly_grant_userId_grantMonth_key" ON "monthly_grant"("userId", "grantMonth");
CREATE INDEX "monthly_grant_grantMonth_idx" ON "monthly_grant"("grantMonth");
ALTER TABLE "monthly_grant" ADD CONSTRAINT "monthly_grant_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "point_transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "monthly_grant" ADD CONSTRAINT "monthly_grant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable test_top_up
CREATE TABLE "test_top_up" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "beneficiaryUserId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "test_top_up_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "test_top_up_amount_check" CHECK ("amount" > 0),
    CONSTRAINT "test_top_up_actor_beneficiary_check" CHECK ("actorUserId" = "beneficiaryUserId")
);

CREATE UNIQUE INDEX "test_top_up_transactionId_key" ON "test_top_up"("transactionId");
CREATE INDEX "test_top_up_beneficiaryUserId_createdAt_idx" ON "test_top_up"("beneficiaryUserId", "createdAt");
ALTER TABLE "test_top_up" ADD CONSTRAINT "test_top_up_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "point_transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "test_top_up" ADD CONSTRAINT "test_top_up_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "test_top_up" ADD CONSTRAINT "test_top_up_beneficiaryUserId_fkey" FOREIGN KEY ("beneficiaryUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable comment
CREATE TABLE "comment" (
    "id" TEXT NOT NULL,
    "recognitionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "comment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "comment_recognitionId_createdAt_id_idx" ON "comment"("recognitionId", "createdAt", "id");
ALTER TABLE "comment" ADD CONSTRAINT "comment_recognitionId_fkey" FOREIGN KEY ("recognitionId") REFERENCES "recognition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comment" ADD CONSTRAINT "comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable reaction
CREATE TABLE "reaction" (
    "id" TEXT NOT NULL,
    "recognitionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reactionType" "ReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reaction_recognitionId_userId_reactionType_key" ON "reaction"("recognitionId", "userId", "reactionType");
CREATE INDEX "reaction_recognitionId_idx" ON "reaction"("recognitionId");
ALTER TABLE "reaction" ADD CONSTRAINT "reaction_recognitionId_fkey" FOREIGN KEY ("recognitionId") REFERENCES "recognition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reaction" ADD CONSTRAINT "reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable notification
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "recognitionId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_userId_type_eventKey_key" ON "notification"("userId", "type", "eventKey");
CREATE INDEX "notification_userId_createdAt_id_idx" ON "notification"("userId", "createdAt" DESC, "id" DESC);
CREATE INDEX "notification_userId_unread_idx" ON "notification"("userId") WHERE "readAt" IS NULL;
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification" ADD CONSTRAINT "notification_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification" ADD CONSTRAINT "notification_recognitionId_fkey" FOREIGN KEY ("recognitionId") REFERENCES "recognition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
