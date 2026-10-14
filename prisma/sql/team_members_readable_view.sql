-- Readable roster rows for DBeaver: explicit TeamMember + names. IDs kept for matching.
-- Table: public."TeamMember" (from Prisma model TeamMember)
--
-- Apply after migrate/push:
--   psql "$DATABASE_URL" -f prisma/sql/team_members_readable_view.sql

CREATE OR REPLACE VIEW public."TeamMembers_readable" AS
SELECT
  tm."id" AS "membershipId",
  tm."teamId",
  tm."userId",
  t."name" AS "teamName",
  t."teamTag" AS "teamTag",
  t."guildId" AS "guildId",
  u."username" AS "memberUsername",
  u."discordId" AS "memberDiscordId"
FROM public."TeamMember" tm
INNER JOIN public."Team" t ON tm."teamId" = t."id"
INNER JOIN public."User" u ON tm."userId" = u."id";
