-- CreateTable
CREATE TABLE "HelpCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HelpCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpPost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "images" TEXT[],
    "location" TEXT,
    "urgency" TEXT NOT NULL DEFAULT 'normal',
    "fromLocation" TEXT,
    "toLocation" TEXT,
    "vehicleType" TEXT,
    "seats" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'open',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HelpPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "images" TEXT[],
    "parentId" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HelpComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HelpLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpOffer" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "helperId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "chatRoomId" TEXT,
    "helperConfirmed" BOOLEAN,
    "requesterConfirmed" BOOLEAN,
    "confirmationNote" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HelpOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    "offerId" TEXT,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HelpReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalHelpsGiven" INTEGER NOT NULL DEFAULT 0,
    "consecutiveHelps" INTEGER NOT NULL DEFAULT 0,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "totalHelpsReceived" INTEGER NOT NULL DEFAULT 0,
    "totalRewardsEarned" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "pendingRewards" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "withdrawnRewards" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "badgeLevel" TEXT NOT NULL DEFAULT 'none',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HelpStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpReward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "offerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'credited',
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HelpReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpWithdrawal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "method" TEXT NOT NULL,
    "walletAddress" TEXT,
    "accountDetails" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "txHash" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HelpWithdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HelpCategory_name_key" ON "HelpCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "HelpCategory_slug_key" ON "HelpCategory"("slug");

-- CreateIndex
CREATE INDEX "HelpCategory_slug_idx" ON "HelpCategory"("slug");

-- CreateIndex
CREATE INDEX "HelpCategory_isActive_idx" ON "HelpCategory"("isActive");

-- CreateIndex
CREATE INDEX "HelpPost_authorId_idx" ON "HelpPost"("authorId");

-- CreateIndex
CREATE INDEX "HelpPost_categoryId_idx" ON "HelpPost"("categoryId");

-- CreateIndex
CREATE INDEX "HelpPost_status_idx" ON "HelpPost"("status");

-- CreateIndex
CREATE INDEX "HelpPost_urgency_idx" ON "HelpPost"("urgency");

-- CreateIndex
CREATE INDEX "HelpPost_location_idx" ON "HelpPost"("location");

-- CreateIndex
CREATE INDEX "HelpPost_createdAt_idx" ON "HelpPost"("createdAt");

-- CreateIndex
CREATE INDEX "HelpComment_postId_idx" ON "HelpComment"("postId");

-- CreateIndex
CREATE INDEX "HelpComment_authorId_idx" ON "HelpComment"("authorId");

-- CreateIndex
CREATE INDEX "HelpComment_parentId_idx" ON "HelpComment"("parentId");

-- CreateIndex
CREATE INDEX "HelpComment_createdAt_idx" ON "HelpComment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "HelpLike_postId_userId_key" ON "HelpLike"("postId", "userId");

-- CreateIndex
CREATE INDEX "HelpLike_postId_idx" ON "HelpLike"("postId");

-- CreateIndex
CREATE INDEX "HelpLike_userId_idx" ON "HelpLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HelpOffer_chatRoomId_key" ON "HelpOffer"("chatRoomId");

-- CreateIndex
CREATE INDEX "HelpOffer_postId_idx" ON "HelpOffer"("postId");

-- CreateIndex
CREATE INDEX "HelpOffer_helperId_idx" ON "HelpOffer"("helperId");

-- CreateIndex
CREATE INDEX "HelpOffer_requesterId_idx" ON "HelpOffer"("requesterId");

-- CreateIndex
CREATE INDEX "HelpOffer_status_idx" ON "HelpOffer"("status");

-- CreateIndex
CREATE INDEX "HelpOffer_chatRoomId_idx" ON "HelpOffer"("chatRoomId");

-- CreateIndex
CREATE INDEX "HelpReport_reporterId_idx" ON "HelpReport"("reporterId");

-- CreateIndex
CREATE INDEX "HelpReport_postId_idx" ON "HelpReport"("postId");

-- CreateIndex
CREATE INDEX "HelpReport_commentId_idx" ON "HelpReport"("commentId");

-- CreateIndex
CREATE INDEX "HelpReport_offerId_idx" ON "HelpReport"("offerId");

-- CreateIndex
CREATE INDEX "HelpReport_status_idx" ON "HelpReport"("status");

-- CreateIndex
CREATE UNIQUE INDEX "HelpStats_userId_key" ON "HelpStats"("userId");

-- CreateIndex
CREATE INDEX "HelpStats_userId_idx" ON "HelpStats"("userId");

-- CreateIndex
CREATE INDEX "HelpStats_badgeLevel_idx" ON "HelpStats"("badgeLevel");

-- CreateIndex
CREATE INDEX "HelpReward_userId_idx" ON "HelpReward"("userId");

-- CreateIndex
CREATE INDEX "HelpReward_type_idx" ON "HelpReward"("type");

-- CreateIndex
CREATE INDEX "HelpReward_status_idx" ON "HelpReward"("status");

-- CreateIndex
CREATE INDEX "HelpWithdrawal_userId_idx" ON "HelpWithdrawal"("userId");

-- CreateIndex
CREATE INDEX "HelpWithdrawal_status_idx" ON "HelpWithdrawal"("status");

-- CreateIndex
CREATE INDEX "HelpWithdrawal_method_idx" ON "HelpWithdrawal"("method");

-- AddForeignKey
ALTER TABLE "HelpPost" ADD CONSTRAINT "HelpPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "HelpCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpPost" ADD CONSTRAINT "HelpPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpComment" ADD CONSTRAINT "HelpComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "HelpPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpComment" ADD CONSTRAINT "HelpComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpComment" ADD CONSTRAINT "HelpComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "HelpComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpLike" ADD CONSTRAINT "HelpLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "HelpPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpLike" ADD CONSTRAINT "HelpLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpOffer" ADD CONSTRAINT "HelpOffer_postId_fkey" FOREIGN KEY ("postId") REFERENCES "HelpPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpOffer" ADD CONSTRAINT "HelpOffer_helperId_fkey" FOREIGN KEY ("helperId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpOffer" ADD CONSTRAINT "HelpOffer_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpReport" ADD CONSTRAINT "HelpReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpReport" ADD CONSTRAINT "HelpReport_postId_fkey" FOREIGN KEY ("postId") REFERENCES "HelpPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpReport" ADD CONSTRAINT "HelpReport_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "HelpComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpReport" ADD CONSTRAINT "HelpReport_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "HelpOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpStats" ADD CONSTRAINT "HelpStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpReward" ADD CONSTRAINT "HelpReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpWithdrawal" ADD CONSTRAINT "HelpWithdrawal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default categories
INSERT INTO "HelpCategory" ("id", "name", "slug", "icon", "description", "color", "sortOrder", "isActive", "isDefault", "updatedAt")
VALUES 
  ('cat_transport', 'Transport', 'transport', '🚗', 'Oferă sau cere o cursă cu mașina', '#3B82F6', 1, true, true, NOW()),
  ('cat_alimente', 'Alimente', 'alimente', '🛒', 'Ajutor cu cumpărături și alimente', '#10B981', 2, true, true, NOW()),
  ('cat_bricolaj', 'Bricolaj', 'bricolaj', '🔧', 'Reparații și lucrări de întreținere', '#F59E0B', 3, true, true, NOW()),
  ('cat_it', 'IT & Tech', 'it-tech', '💻', 'Ajutor cu calculatoare și tehnologie', '#8B5CF6', 4, true, true, NOW()),
  ('cat_educatie', 'Educație', 'educatie', '📚', 'Meditații și ajutor școlar', '#EC4899', 5, true, true, NOW()),
  ('cat_sanatate', 'Sănătate', 'sanatate', '🏥', 'Consiliere și ajutor medical', '#EF4444', 6, true, true, NOW()),
  ('cat_juridic', 'Juridic', 'juridic', '⚖️', 'Consiliere juridică și documente', '#6366F1', 7, true, true, NOW()),
  ('cat_altele', 'Altele', 'altele', '📦', 'Alte tipuri de ajutor', '#6B7280', 8, true, true, NOW());
