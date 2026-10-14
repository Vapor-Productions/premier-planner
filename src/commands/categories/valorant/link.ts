import { Category } from '@discordx/utilities';
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  type CommandInteraction,
  MessageFlags,
} from 'discord.js';
import { Discord, Slash, SlashGroup, SlashOption } from 'discordx';
import { isBotDevUser } from '../../../utils/botDev.js';
import { getDefaultLocale, type Locale, t, tWithUser } from '../../../utils/localization.js';
import { isCommandInMaintenance, MaintenanceCommandId } from '../../../utils/maintenance.js';
import { fetchValorantAccountByRiotId } from '../../../utils/premierApi.js';
import { isNonRsoLinkAllowed } from '../../../utils/riot/compliance.js';
import { createRiotLinkSession } from '../../../utils/riot/linkServer.js';
import {
  clearLinkedRiotAccount,
  ensureUserExists,
  getUserByDiscordId,
  saveLinkedRiotAccount,
} from '../../../utils/userManager.js';

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

    if (isCommandInMaintenance(MaintenanceCommandId.riotLink)) {
      await interaction.reply({
        content: await tWithUser('bot.maintenance', userId),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const session = createRiotLinkSession(userId);
    if ('error' in session) {
      await interaction.reply({
        content: await tWithUser('commands.riot.link.notConfigured', userId),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // One language lookup for all strings: each tWithUser is a database round trip, and
    // the reply has to go out within Discord's 3-second window
    const user = await getUserByDiscordId(userId);
    const locale = (user?.language as Locale | undefined) ?? getDefaultLocale();
    const button = new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setURL(session.authorizeUrl)
      .setLabel(t('commands.riot.link.openAuthorize', locale));
    await interaction.reply({
      content: [
        `**${t('commands.riot.link.title', locale)}**`,
        t('commands.riot.link.disclaimer', locale),
        t('commands.riot.link.instructions', locale),
        t('commands.riot.link.privacyUrl', locale),
      ].join('\n\n'),
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)],
      flags: MessageFlags.Ephemeral,
    });
  }

  @Slash({
    name: 'unlink',
    description: 'Unlink your Riot account from Premier Planner',
  })
  async unlink(interaction: CommandInteraction): Promise<void> {
    const userId = interaction.user.id;

    if (isCommandInMaintenance(MaintenanceCommandId.riotUnlink)) {
      await interaction.reply({
        content: await tWithUser('bot.maintenance', userId),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await clearLinkedRiotAccount(userId);
    if (result === 'ok') {
      await interaction.editReply({
        content: await tWithUser('commands.riot.unlink.success', userId),
      });
      return;
    }

    await interaction.editReply({
      content: await tWithUser('commands.riot.unlink.notLinked', userId),
    });
  }

  @Slash({
    name: 'link-backup',
    description: 'Dev-only emergency: link via Riot ID (disabled in production)',
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

    if (!isNonRsoLinkAllowed() || !isBotDevUser(userId)) {
      await interaction.reply({
        content: await tWithUser('commands.riot.linkBackup.disabled', userId),
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
