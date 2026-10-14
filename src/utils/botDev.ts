import { type CommandInteraction, PermissionsBitField } from 'discord.js';

/**
 * Comma-separated Discord user IDs with extra bot privileges (same pattern as `DEV_GUILD_IDS`).
 * Used together with guild Administrator for `/riot link` and `/riot link-backup`, or alone for dev-only commands.
 */
export function getBotDevUserIds(): string[] {
  return (
    process.env.BOT_DEV_IDS?.split(',')
      .map((id) => id.trim())
      .filter(Boolean) ?? []
  );
}

export function isBotDevUser(discordUserId: string): boolean {
  return getBotDevUserIds().includes(discordUserId);
}

function isGuildAdministrator(interaction: CommandInteraction): boolean {
  if (!interaction.inGuild()) {
    return false;
  }
  const m = interaction.member;
  if (!m || typeof m.permissions === 'string') {
    return false;
  }
  return m.permissions.has(PermissionsBitField.Flags.Administrator);
}

/**
 * Guild Administrator or a user ID in `BOT_DEV_IDS` (for `/riot link`, `/riot link-backup`, etc.).
 */
export function canUseAdminOrBotDev(interaction: CommandInteraction): boolean {
  return isBotDevUser(interaction.user.id) || isGuildAdministrator(interaction);
}
