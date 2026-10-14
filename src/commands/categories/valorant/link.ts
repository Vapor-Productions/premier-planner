import { Category } from '@discordx/utilities';
import { ApplicationCommandOptionType, type CommandInteraction, MessageFlags } from 'discord.js';
import type { Client } from 'discordx';
import { Discord, Slash, SlashGroup, SlashOption } from 'discordx';
import { canUseAdminOrBotDev } from '../../../utils/botDev.js';
import { tWithUser } from '../../../utils/localization.js';
import { isCommandInMaintenance, MaintenanceCommandId } from '../../../utils/maintenance.js';
import { fetchValorantAccountByRiotId } from '../../../utils/premierApi.js';
import { ensureUserExists, saveLinkedRiotAccount } from '../../../utils/userManager.js';
import { getSlashCommandMention } from '../../../utils/util.js';

@Discord()
@Category('Valorant')
@SlashGroup({ name: 'riot', description: 'Riot account (RSO)' })
@SlashGroup('riot')
export class RiotLinkCommands {
  @Slash({
    description: 'Link your Riot account via Riot Sign-On',
  })
  async link(interaction: CommandInteraction): Promise<void> {
    const userId = interaction.user.id;

    if (!canUseAdminOrBotDev(interaction)) {
      await interaction.reply({
        content: await tWithUser('commands.riot.noPrivilegedAccess', userId),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (isCommandInMaintenance(MaintenanceCommandId.riotLink)) {
      await interaction.reply({
        content: await tWithUser('bot.maintenance', userId),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const mention = await getSlashCommandMention(
      interaction.client as Client,
      'riot',
      'link-backup'
    );
    await interaction.reply({
      content: await tWithUser('commands.riot.link.redirectToBackup', userId, { mention }),
      flags: MessageFlags.Ephemeral,
    });
  }

  @Slash({
    name: 'link-backup',
    description: 'Backup: link Riot account using Riot ID (HenrikDev API)',
  })
  async linkBackup(
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

    if (!canUseAdminOrBotDev(interaction)) {
      await interaction.reply({
        content: await tWithUser('commands.riot.noPrivilegedAccess', userId),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (isCommandInMaintenance(MaintenanceCommandId.riotLinkBackup)) {
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

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    await ensureUserExists(userId, interaction.user.username);

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
      userId,
      {
        puuid: account.puuid,
        gameName: resolvedName,
        tagLine: resolvedTag,
      },
      interaction.user.username
    );

    if (result === 'puuid_taken') {
      await interaction.editReply({
        content: await tWithUser('commands.riot.linkBackup.puuidTaken', userId),
      });
      return;
    }

    await interaction.editReply({
      content: await tWithUser('commands.riot.linkBackup.success', userId, {
        name: resolvedName,
        tag: resolvedTag,
      }),
    });
  }
}
