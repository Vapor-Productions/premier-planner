import 'dotenv/config';
import { IntentsBitField } from 'discord.js';
import { Client } from 'discordx';

// Comma-separated dev guild IDs (non-prod guild command registration) — see .env.example
const devGuildIds =
  process.env.DEV_GUILD_IDS?.split(',')
    .map((id) => id.trim())
    .filter(Boolean) ?? [];

// Treat everything except production as dev
const isDev = process.env.NODE_ENV !== 'production';

const botGuilds = isDev && devGuildIds.length > 0 ? [() => devGuildIds] : [];

export const bot = new Client({
  // To use only guild command
  botGuilds: botGuilds,

  // Discord intents: only Guilds, which keeps the guild, channel and role caches and sends the
  // guildCreate/guildDelete events the data purge needs. Slash commands and components arrive as
  // interactions, which need no intent, and member lookups use guild.members.fetch(id), a REST
  // call. Asking for intents nothing uses goes against Discord's data minimisation rule.
  intents: [IntentsBitField.Flags.Guilds],

  // Debug logs are disabled in silent mode
  silent: false,
});
