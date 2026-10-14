declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Discord Bot Configuration
      DISCORD_TOKEN: string;
      CLIENT_ID: string;

      // Channel IDs
      BUG_REPORT_CHANNEL_ID: string;

      // Database Configuration
      DATABASE_URL: string;

      // Environment
      NODE_ENV: 'development' | 'production' | 'test';
      DEBUG_MODE?: string;
      /** Comma-separated Discord user IDs (extra privileges; see `getBotDevUserIds`). */
      BOT_DEV_IDS?: string;
      /** Comma-separated guild IDs for dev command registration (non-production). */
      DEV_GUILD_IDS?: string;

      // Add other environment variables as needed
      [key: string]: string | undefined;
    }
  }
}

export {};
