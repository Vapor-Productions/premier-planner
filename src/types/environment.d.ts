declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Discord
      DISCORD_TOKEN: string;

      // Database
      DATABASE_URL: string;

      // Optional: channel that receives error reports
      ERROR_LOG_CHANNEL_ID?: string;

      // Environment
      NODE_ENV: 'development' | 'production' | 'test';
      DEBUG_MODE?: string;
      /** Comma-separated Discord user IDs (extra privileges; see `getBotDevUserIds`). */
      BOT_DEV_IDS?: string;
      /** Comma-separated guild IDs for dev command registration (non-production). */
      DEV_GUILD_IDS?: string;

      // Riot Sign-On (account linking)
      RIOT_CLIENT_ID?: string;
      /** Falls back to `RIOT_API_KEY` when unset. */
      RIOT_CLIENT_SECRET?: string;
      RIOT_API_KEY?: string;
      /** Public callback URL; its port and path are where the link server listens. */
      RIOT_REDIRECT_URI?: string;
      /** Interface the link server binds to (default `0.0.0.0`). */
      RIOT_LINK_BIND_HOST?: string;

      /** HenrikDev Valorant API key. */
      VAL_API_KEY?: string;

      // Maintenance
      /** `1`, `true`, `yes` or `on` pauses every command that checks maintenance. */
      MAINTENANCE_MODE?: string;
      /** Comma-separated command ids, e.g. `riot.link,riot.link-backup`. */
      MAINTENANCE_COMMANDS?: string;

      // Add other environment variables as needed
      [key: string]: string | undefined;
    }
  }
}

export {};
