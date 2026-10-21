import type { Client } from 'discord.js';
import { prisma } from './prisma.js';

/** How long a removed server's teams are kept, so a kick by mistake or a quick re-invite loses nothing. */
export const REMOVAL_GRACE_DAYS = 30;
const EVERY_MS = 24 * 60 * 60_000;

/** Marks a server as removed (the bot left or was kicked). Keeps an earlier removal time. */
export async function markGuildRemoved(guildId: string, now = new Date()): Promise<void> {
  await prisma.removedGuild.createMany({
    data: [{ guildId, removedAt: now }],
    skipDuplicates: true,
  });
}

/** Clears the removal mark when the bot is back in the server, which cancels the purge. */
export async function markGuildPresent(guildId: string): Promise<void> {
  await prisma.removedGuild.deleteMany({ where: { guildId } });
}

/**
 * Brings the marks in line with the servers the bot is in at startup: a removal while the bot was
 * offline sends no event, and a re-invite during downtime should cancel the purge.
 *
 * Marks nothing when more than half of the servers with teams would be marked at once. That is not
 * a mass removal but a bot running against another bot's database (a dev bot on the production
 * database), and marking would delete those teams 30 days later.
 */
async function reconcileGuilds(presentIds: Set<string>, now = new Date()): Promise<number> {
  const marked = new Set(
    (await prisma.removedGuild.findMany({ select: { guildId: true } })).map((r) => r.guildId)
  );
  for (const guildId of marked) {
    if (presentIds.has(guildId)) await markGuildPresent(guildId);
  }
  const withTeams = (
    await prisma.team.findMany({ select: { guildId: true }, distinct: ['guildId'] })
  ).map((t) => t.guildId);
  const toMark = withTeams.filter((id) => !presentIds.has(id) && !marked.has(id));
  if (toMark.length > withTeams.length / 2) {
    console.warn(
      `[guildPurge] ${toMark.length} of ${withTeams.length} servers would be marked removed; skipped (wrong database?)`
    );
    return 0;
  }
  for (const guildId of toMark) await markGuildRemoved(guildId, now);
  return toMark.length;
}

/**
 * Deletes the teams (and, by cascade, their rosters) of servers removed more than
 * {@link REMOVAL_GRACE_DAYS} days ago. User rows and Riot links are not per server and stay. A
 * server the bot is still in is unmarked instead, and the mark is checked again inside the
 * transaction so a server that re-added the bot a moment ago is left alone.
 */
async function purgeRemovedGuilds(isPresent: (guildId: string) => boolean): Promise<string[]> {
  const cutoff = new Date(Date.now() - REMOVAL_GRACE_DAYS * 86_400_000);
  const due = await prisma.removedGuild.findMany({
    where: { removedAt: { lt: cutoff } },
    select: { guildId: true },
  });
  const purged: string[] = [];
  for (const { guildId } of due) {
    if (isPresent(guildId)) {
      await markGuildPresent(guildId);
      continue;
    }
    const done = await prisma.$transaction(async (tx) => {
      const still = await tx.removedGuild.findFirst({
        where: { guildId, removedAt: { lt: cutoff } },
      });
      if (!still) return false;
      await tx.team.deleteMany({ where: { guildId } });
      await tx.removedGuild.delete({ where: { guildId } });
      return true;
    });
    if (done) purged.push(guildId);
  }
  return purged;
}

let timer: NodeJS.Timeout | undefined;

/**
 * Daily: deletes the teams of servers the bot left more than 30 days ago (Discord Developer Terms
 * §5b). Reconciles the removal marks with the servers the bot is in first. Safe to call more than
 * once.
 */
export function startGuildPurgeJob(client: Client): void {
  if (timer) return;
  const run = () =>
    purgeRemovedGuilds((id) => client.guilds.cache.has(id))
      .then((purged) => {
        if (purged.length) console.log(`[guildPurge] deleted the teams of ${purged.join(', ')}`);
      })
      .catch((err) => console.error('[guildPurge] purge failed:', err));
  void reconcileGuilds(new Set(client.guilds.cache.keys()))
    .then((marked) => {
      if (marked) console.log(`[guildPurge] marked ${marked} server(s) the bot is no longer in`);
    })
    .catch((err) => console.error('[guildPurge] startup reconcile failed:', err))
    .then(run);
  timer = setInterval(run, EVERY_MS);
  timer.unref();
}
