import { ActivityType } from 'discord.js';
import { Discord, Once } from 'discordx';
import { bot } from '../bot.js';
import { debugLog } from '../utils/debug.js';
import { startGuildPurgeJob } from '../utils/guildRemoval.js';
import { getDefaultLocale, t } from '../utils/localization.js';

@Discord()
export class Ready {
  @Once()
  async clientReady(): Promise<void> {
    // Make sure all guilds are cached
    debugLog('clientReady', 'guilds.fetch');
    const guilds = await bot.guilds.fetch();
    debugLog('clientReady', 'guilds.fetch ->', { count: guilds.size });

    // Clear the scope that is not in use, so no command shows up twice. Production registers
    // globally and clears guild commands left over from dev; dev (DEV_GUILD_IDS) registers per
    // guild and clears globals. Awaited so it finishes before registration starts: main.ts used
    // to run the guild clear right after login, racing the registration. A failure must not
    // block registration.
    try {
      if (bot.botGuilds.length > 0) {
        await bot.clearApplicationCommands();
      } else if (bot.guilds.cache.size > 0) {
        // Guarded: called with no ids, this clears the global commands instead
        await bot.clearApplicationCommands(...bot.guilds.cache.map((g) => g.id));
      }
    } catch (error) {
      console.error('Could not clear stale application commands:', error);
    }

    // Synchronize application commands with Discord
    try {
      await bot.initApplicationCommands();
    } catch (error) {
      console.error('Could not register application commands:', error);
    }

    // Set the client status that rotates every minute with a status from an array of statuses
    const defaultLocale = getDefaultLocale();
    const statuses = [
      { type: ActivityType.Playing, name: t('bot.status.website', defaultLocale) },
      { type: ActivityType.Playing, name: t('bot.status.madeby', defaultLocale) },
    ];
    setInterval(() => {
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      bot.user?.setActivity(randomStatus.name, { type: randomStatus.type });
    }, 60000);

    startGuildPurgeJob(bot);

    // Pterodactyl node.js generic egg marks the server online when console matches
    // config_startup.done (currently "Discord bot logged" / "Logged in on").
    console.log(`Discord bot logged in as ${bot.user?.username}`);
  }
}
