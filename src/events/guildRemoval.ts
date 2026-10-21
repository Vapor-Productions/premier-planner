import type { ArgsOf } from 'discordx';
import { Discord, On } from 'discordx';
import { markGuildPresent, markGuildRemoved } from '../utils/guildRemoval.js';

/** Marks a server when the bot leaves it, so its teams are deleted 30 days later, and unmarks it on a re-add. */
@Discord()
export class GuildRemoval {
  @On({ event: 'guildCreate' })
  async guildCreate([guild]: ArgsOf<'guildCreate'>): Promise<void> {
    await markGuildPresent(guild.id).catch((error) =>
      console.warn(`[guildPurge] unmarking guild ${guild.id} failed`, error)
    );
  }

  @On({ event: 'guildDelete' })
  async guildDelete([guild]: ArgsOf<'guildDelete'>): Promise<void> {
    // An outage makes a server unavailable without the bot leaving it; that is not a removal.
    if (!guild.available) return;
    await markGuildRemoved(guild.id).catch((error) =>
      console.warn(`[guildPurge] marking guild ${guild.id} removed failed`, error)
    );
  }
}
