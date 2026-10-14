import { type ColorResolvable, EmbedBuilder, type Message } from 'discord.js';
import type { Client } from 'discordx';

import { debugLog } from './debug.js';

/**
 * Capitalises the first letter of each word in a string.
 * @param str - The string to be capitalised.
 * @returns The capitalised string.
 */
export const capitalise = (str: string): string => str.replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Deletes a message after a specified delay if it's deletable.
 * @param message - The message to delete.
 * @param time - The delay before deletion, in milliseconds.
 */
export function deletableCheck(message: Message, time: number): void {
  setTimeout(() => {
    message.delete().catch((error) => console.error('Error deleting message:', error));
  }, time);
}

export enum ResponseType {
  Info = 0,
  Success = 1,
  Permission = 2,
  Error = 3,
}

export function responseEmbed(type: ResponseType, content: string) {
  let color: ColorResolvable;
  let title: string;
  switch (type) {
    case ResponseType.Info:
      title = '🔷 Info';
      color = 'Blue';
      break;
    case ResponseType.Success:
      title = '✅ Success';
      color = 'Green';
      break;
    case ResponseType.Permission:
      title = '⚠️ Insufficient Permissions';
      color = 'Yellow';
      break;
    case ResponseType.Error:
      title = '❌ Error';
      color = 'Red';
      break;
  }

  return [new EmbedBuilder().setTitle(title).setDescription(content).setColor(color).toJSON()];
}

export async function getCommandIds(client: Client): Promise<Record<string, string>> {
  debugLog('util', 'getCommandIds');
  if (!client.application) {
    throw new Error('Client application is not available');
  }

  const commandIds = new Map<string, string>();
  const isGuildOnly = client.botGuilds && client.botGuilds.length > 0;

  // Fetch global commands
  if (!isGuildOnly) {
    try {
      const globalCommands = await client.application.commands.fetch();
      debugLog('util', 'getCommandIds global commands', { count: globalCommands.size });
      for (const cmd of globalCommands.values()) {
        commandIds.set(cmd.name, cmd.id);
      }
    } catch (error) {
      console.warn('Could not fetch global commands:', error);
    }
  }

  // Fetch guild commands
  const guildPromises = Array.from(client.guilds.cache.values()).map(async (guild) => {
    try {
      const guildCommands = await guild.commands.fetch();
      debugLog('util', 'getCommandIds guild commands', {
        guild: guild.name,
        count: guildCommands.size,
      });
      for (const cmd of guildCommands.values()) {
        commandIds.set(cmd.name, cmd.id);
      }
    } catch (error) {
      console.warn(`Could not fetch commands for guild ${guild.name}:`, error);
    }
  });

  await Promise.allSettled(guildPromises);

  const out = Object.fromEntries(commandIds);
  debugLog('util', 'getCommandIds ->', { names: Object.keys(out) });
  return out;
}

/**
 * Builds a Discord slash command mention, e.g. `</riot link-backup:123>` (same pattern as help).
 * Falls back to `/parent sub` if the root command id is not cached yet.
 */
export async function getSlashCommandMention(
  client: Client,
  ...pathSegments: string[]
): Promise<string> {
  debugLog('util', 'getSlashCommandMention', { pathSegments });
  if (pathSegments.length === 0) {
    throw new Error('getSlashCommandMention requires at least one segment');
  }
  const ids = await getCommandIds(client);
  const root = pathSegments[0];
  const id = ids[root];
  if (!id) {
    debugLog('util', 'getSlashCommandMention fallback (no id)');
    return `/${pathSegments.join(' ')}`;
  }
  const mention = `</${pathSegments.join(' ')}:${id}>`;
  debugLog('util', 'getSlashCommandMention ->', mention);
  return mention;
}

/**
 * Parses a duration string into milliseconds.
 * @param duration - The duration string to parse.
 * @returns The duration in milliseconds.
 * @throws An error if the duration format is invalid.
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error('Invalid duration format');

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error('Invalid duration unit');
  }
}
