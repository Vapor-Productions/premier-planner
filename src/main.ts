import { dirname, importx } from '@discordx/importer';
import { config } from 'dotenv';

import { bot } from './bot.js';
import { errorHandler, setupGlobalErrorHandlers } from './utils/errorHandler.js';
import { startRiotLinkServer } from './utils/riot/linkServer.js';
import { registerGracefulShutdown } from './utils/shutdown.js';

// Load environment variables from .env file
config();

// Allow JSON.stringify to handle BigInt values safely
(BigInt.prototype as unknown as { toJSON?: () => string }).toJSON ??= function (this: bigint) {
  return this.toString();
};

async function run() {
  // Setup global error handlers
  setupGlobalErrorHandlers();

  // The following syntax should be used in the commonjs environment
  //
  // await importx(__dirname + "/{events,commands}/**/*.{ts,js}");

  // The following syntax should be used in the ECMAScript environment
  await importx(`${dirname(import.meta.url)}/{events,commands}/**/*.{ts,js}`);

  // Let's start the bot
  if (!process.env.DISCORD_TOKEN) {
    throw Error('Could not find DISCORD_TOKEN in your environment');
  }

  // Handle graceful shutdown (Riot link server, client destroy, Prisma disconnect, exit)
  registerGracefulShutdown(bot);

  // Log in with your bot token
  await bot.login(process.env.DISCORD_TOKEN);

  startRiotLinkServer();

  // Delete global commands on startup
  await bot.clearApplicationCommands(...bot.guilds.cache.map((g) => g.id));

  // Set the client for error reporting
  errorHandler.setClient(bot);

}

void run();
