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

      /** Riot Sign-On client id (production RSO). */
      RIOT_CLIENT_ID?: string;
      /** Riot Sign-On client secret. */
      RIOT_CLIENT_SECRET?: string;
      /** Optional alias for RSO client secret. */
      RIOT_API_KEY?: string;
      /** Public HTTPS callback URL registered with Riot. */
      RIOT_REDIRECT_URI?: string;
      /** Bind host for the local RSO callback listener. */
      RIOT_LINK_BIND_HOST?: string;
      /** HenrikDev key for Premier roster lookup (not production account linking). */
      VAL_API_KEY?: string;
      /** Dev-only: allow non-RSO link commands when not production. */
      ALLOW_NON_RSO_LINK?: string;

      // Add other environment variables as needed
      [key: string]: string | undefined;
    }
  }
}

export {};
