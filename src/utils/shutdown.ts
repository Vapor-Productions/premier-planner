import type { Client } from 'discord.js';
import { stopRiotLinkServer } from './riot/linkServer.js';
import { closePrismaConnection } from './userManager.js';

let shuttingDown = false;

/**
 * Registers the one SIGINT/SIGTERM path: stop the Riot link server, destroy the Discord client,
 * disconnect Prisma, then exit. Nothing else may call `process.exit` on a signal: the error
 * handler used to, synchronously, and that exit won the race so the Prisma disconnect never ran.
 */
export function registerGracefulShutdown(client: Client): void {
  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.log(`Received ${signal}, shutting down...`);
    try {
      await stopRiotLinkServer();
    } catch (error) {
      console.error('Error stopping the Riot link server:', error);
    }
    try {
      await client.destroy();
    } catch (error) {
      console.error('Error destroying the client:', error);
    }
    try {
      await closePrismaConnection();
    } catch (error) {
      console.error('Error disconnecting Prisma:', error);
    }
    process.exit(0);
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}
