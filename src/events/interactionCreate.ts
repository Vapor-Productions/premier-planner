import type { CommandInteraction } from 'discord.js';
import type { ArgsOf } from 'discordx';
import { Discord, On } from 'discordx';
import { bot } from '../bot';
import { errorHandler } from '../utils/errorHandler';
import { ensureUserExists } from '../utils/userManager';

@Discord()
export class InteractionCreate {
  @On()
  async interactionCreate([interaction]: ArgsOf<'interactionCreate'>): Promise<void> {
    try {
      // Ensure user exists in database before executing interaction
      if (interaction.user && !interaction.user.bot) {
        await ensureUserExists(interaction.user.id, interaction.user.username);
      }

      await bot.executeInteraction(interaction);
    } catch (error) {
      const anyError = error as any;
      const code = typeof anyError?.code === 'number' ? (anyError.code as number) : undefined;

      // Ignore Discord "Unknown interaction" and "already acknowledged" errors,
      // as these simply mean the token is no longer valid (e.g. user waited too long).
      if (code === 10062 || code === 40060) {
        // Still log a minimal warning for visibility in development
        // without invoking the full error pipeline.
        // eslint-disable-next-line no-console
        console.warn(
          `[interactionCreate] Ignored Discord interaction error code ${code}: ${anyError?.message ?? 'Unknown error'}`,
        );
        return;
      }

      await errorHandler.handleError(error as Error, interaction as CommandInteraction, {
        command: 'interaction',
        userId: interaction.user?.id,
        guildId: interaction.guildId || undefined,
        channelId: interaction.channelId,
      });
    }
  }
}
