-- Case-insensitive email (citext ships with PostgreSQL contrib; hosted
-- databases must allow this extension).
CREATE EXTENSION IF NOT EXISTS citext;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" SET DATA TYPE CITEXT;

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
