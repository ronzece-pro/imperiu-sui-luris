-- AlterTable: Add postType column to HelpPost
-- "offer" = user offers help, "request" = user requests help
ALTER TABLE "HelpPost" ADD COLUMN "postType" TEXT NOT NULL DEFAULT 'request';
