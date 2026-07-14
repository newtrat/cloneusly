-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_userId_key" ON "account"("providerId", "userId");
