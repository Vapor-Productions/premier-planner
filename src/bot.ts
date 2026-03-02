import 'dotenv/config';
import { IntentsBitField } from 'discord.js';
import { Client } from 'discordx';

// Comma-separated list of dev guild IDs, e.g. "123,456"
const devGuildIds =
  process.env.DEV_GUILD_IDS?.split(',').map((id) => id.trim()).filter(Boolean) ?? [];

// Treat everything except production as dev
const isDev = process.env.NODE_ENV !== 'production';

const botGuilds = isDev && devGuildIds.length > 0 ? [() => devGuildIds] : [];

export const bot = new Client({
  // To use only guild command
  botGuilds: botGuilds,

  // Discord intents
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.MessageContent,
  ],

  // Debug logs are disabled in silent mode
  silent: false,

  // Configuration for @SimpleCommand
  simpleCommand: {
    prefix: '!',
  },
});
