import { Category } from '@discordx/utilities';
import {
  ApplicationCommandOptionType,
  type CommandInteraction,
  MessageFlags,
  PermissionsBitField,
  type User,
} from 'discord.js';
import { Discord, Slash, SlashGroup, SlashOption } from 'discordx';
import { isBotDevUser } from '../../../utils/botDev.js';
import { tWithUser } from '../../../utils/localization.js';
import { isCommandInMaintenance, MaintenanceCommandId } from '../../../utils/maintenance.js';
import { fetchValorantAccountByRiotId } from '../../../utils/premierApi.js';
import { isNonRsoLinkAllowed } from '../../../utils/riot/compliance.js';
import { ensureUserExists, saveLinkedRiotAccount } from '../../../utils/userManager.js';

/**
 * Owner category: dev-only Riot subcommands (`BOT_DEV_IDS` at runtime; default Administrator so Discord hides
 * the command from non-admins; same `/riot` group; hidden from `/help`).
 * Non-RSO linking is disabled in production (Riot VALORANT opt-in policy).
 */
@Discord()
@Category('Owner')
@SlashGroup({ name: 'riot', description: 'Riot account (RSO)' })
@SlashGroup('riot')
export class RiotOwnerCommands {
  @Slash({
    name: 'link-verify',
    description: 'Manually link another user Riot account (BOT_DEV_IDS only)',
    defaultMemberPermissions: [PermissionsBitField.Flags.Administrator],
  })
  async linkVerify(
    @SlashOption({
      name: 'member',
      description: 'Discord user to link',
      type: ApplicationCommandOptionType.User,
      required: true,
    })
    targetUser: User,
    @SlashOption({
      name: 'game-name',
      description: 'Valorant in-game name (before #)',
      type: ApplicationCommandOptionType.String,
      required: true,
    })
    gameName: string,
    @SlashOption({
      name: 'tag',
      description: 'Riot tag (after #)',
      type: ApplicationCommandOptionType.String,
      required: true,
    })
    tag: string,
    interaction: CommandInteraction
  ): Promise<void> {
    const userId = interaction.user.id;

    if (!isNonRsoLinkAllowed() || !isBotDevUser(interaction.user.id)) {
      await interaction.reply({
        content: await tWithUser('commands.riot.linkVerify.disabled', userId),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (isCommandInMaintenance(MaintenanceCommandId.riotLinkVerify)) {
      await interaction.reply({
        content: await tWithUser('bot.maintenance', userId),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!process.env.VAL_API_KEY?.trim()) {
      await interaction.reply({
        content: await tWithUser('commands.riot.linkBackup.noApiKey', userId),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (targetUser.bot) {
      await interaction.reply({
        content: await tWithUser('commands.riot.linkVerify.targetIsBot', userId),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    await ensureUserExists(targetUser.id, targetUser.username);

    let account: Awaited<ReturnType<typeof fetchValorantAccountByRiotId>>;
    try {
      account = await fetchValorantAccountByRiotId(gameName, tag);
    } catch {
      await interaction.editReply({
        content: await tWithUser('commands.riot.linkBackup.apiError', userId),
      });
      return;
    }

    if (!account) {
      await interaction.editReply({
        content: await tWithUser('commands.riot.linkBackup.notFound', userId),
      });
      return;
    }

    const resolvedName = account.name?.trim() || gameName.trim();
    const resolvedTag = account.tag?.trim() || tag.trim();

    const result = await saveLinkedRiotAccount(
      targetUser.id,
      {
        puuid: account.puuid,
        gameName: resolvedName,
        tagLine: resolvedTag,
      },
      targetUser.username
    );

    if (result === 'puuid_taken') {
      await interaction.editReply({
        content: await tWithUser('commands.riot.linkBackup.puuidTaken', userId),
      });
      return;
    }

    await interaction.editReply({
      content: await tWithUser('commands.riot.linkVerify.success', userId, {
        target: targetUser.toString(),
        name: resolvedName,
        tag: resolvedTag,
      }),
    });
  }
}
