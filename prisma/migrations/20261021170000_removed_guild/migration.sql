-- Servers Premier Planner was removed from; their teams are deleted 30 days later.
-- CreateTable
CREATE TABLE "RemovedGuild" (
    "guildId" TEXT NOT NULL,
    "removedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RemovedGuild_pkey" PRIMARY KEY ("guildId")
);

-- CreateIndex
CREATE INDEX "RemovedGuild_removedAt_idx" ON "RemovedGuild"("removedAt");
