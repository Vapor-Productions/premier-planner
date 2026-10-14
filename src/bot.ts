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

  // Discord intents: every non-privileged intent. The privileged ones (GuildMembers,
  // GuildPresences, MessageContent) stay off because nothing uses them: member lookups use
  // guild.members.fetch(id), a REST call, and there are no prefix commands. Enabling one once the
  // app reaches 10,000+ unique users requires Discord's Privileged Intent Review (since 2026-06-10).
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildModeration,
    IntentsBitField.Flags.GuildExpressions,
    IntentsBitField.Flags.GuildIntegrations,
    IntentsBitField.Flags.GuildWebhooks,
    IntentsBitField.Flags.GuildInvites,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildMessageTyping,
    IntentsBitField.Flags.GuildMessagePolls,
    IntentsBitField.Flags.DirectMessages,
    IntentsBitField.Flags.DirectMessageReactions,
    IntentsBitField.Flags.DirectMessageTyping,
    IntentsBitField.Flags.DirectMessagePolls,
    IntentsBitField.Flags.GuildScheduledEvents,
    IntentsBitField.Flags.AutoModerationConfiguration,
    IntentsBitField.Flags.AutoModerationExecution,
  ],

  // Debug logs are disabled in silent mode
  silent: false,
});
