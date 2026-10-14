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

  // Discord intents. No privileged intents: member lookups use guild.members.fetch(id), a REST
  // call. There are no prefix commands, so no GuildMessages and no MessageContent: bringing prefix
  // commands back needs both, plus a messageCreate handler that calls ensureUserExists.
  intents: [IntentsBitField.Flags.Guilds],

  // Debug logs are disabled in silent mode
  silent: false,
});
