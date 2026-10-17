/**
 * Comma-separated Discord user IDs with extra bot privileges (same pattern as `DEV_GUILD_IDS`).
 * Used for dev-only commands such as `/riot link-backup` and `/riot link-verify`.
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
