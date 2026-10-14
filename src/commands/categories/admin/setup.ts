/** biome-ignore-all assist/source/organizeImports: Annoying warnings */
import { Discord, SelectMenuComponent, Slash } from 'discordx';
import type { Client } from 'discordx';
import { Category } from '@discordx/utilities';
import {
  ActionRowBuilder,
  ContainerBuilder,
  MessageFlags,
  PermissionsBitField,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
  type CommandInteraction,
  type StringSelectMenuInteraction,
} from 'discord.js';
import { tWithUser } from '../../../utils/localization.js';
import { getSlashCommandMention } from '../../../utils/util.js';

@Discord()
@Category('Admin')
export class Setup {
  @Slash({
    description: 'Setup the bot for usage in your server.',
    defaultMemberPermissions: [PermissionsBitField.Flags.Administrator],
  })
  async setup(interaction: CommandInteraction): Promise<void> {
    const userId = interaction.user.id;
    const [header, intro, menuTitle, menuDescription, selectPlaceholder, optionGeneral] =
      await Promise.all([
        tWithUser('commands.setup.header', userId),
        tWithUser('commands.setup.intro', userId),
        tWithUser('commands.setup.menuTitle', userId),
        tWithUser('commands.setup.menuDescription', userId),
        tWithUser('commands.setup.selectPlaceholder', userId),
        tWithUser('commands.setup.optionGeneral', userId),
      ]);

    const headerText = new TextDisplayBuilder().setContent(
      [`## 🔧 **${header}**`, '', `> **${intro}**`].join('\n')
    );
    const descriptionText = new TextDisplayBuilder().setContent(
      [`### 📋 **${menuTitle}**`, '', `> **${menuDescription}**`].join('\n')
    );

    const setupMenu = new StringSelectMenuBuilder()
      .setCustomId('setup_menu')
      .setPlaceholder(selectPlaceholder)
      .addOptions({ label: optionGeneral, value: 'general_settings' })
      .setMaxValues(1);

    const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(setupMenu);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(headerText)
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
      .addTextDisplayComponents(descriptionText)
      .addActionRowComponents(actionRow)
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large));

    await interaction.reply({
      components: [container],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    });
  }

  @SelectMenuComponent({ id: 'setup_menu' })
  async handleSetupMenu(interaction: StringSelectMenuInteraction): Promise<void> {
    const value = interaction.values[0];
    if (value !== 'general_settings') {
      await interaction.reply({
        content: await tWithUser('commands.setup.invalidSelection', interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const [teamCreate, teamView] = await Promise.all([
      getSlashCommandMention(interaction.client as Client, 'team', 'create'),
      getSlashCommandMention(interaction.client as Client, 'team', 'view'),
    ]);
    const hint = await tWithUser('commands.setup.teamSettingsHint', interaction.user.id, {
      teamCreate,
      teamView,
    });
    const teamSettingsHeader = new TextDisplayBuilder().setContent(
      ['### 👥 Team Settings', '', `> ${hint}`].join('\n')
    );
    const teamSettingsContainer = new ContainerBuilder()
      .addTextDisplayComponents(teamSettingsHeader)
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large));

    try {
      await interaction.update({
        components: [teamSettingsContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch {
      // Ignore Unknown Message errors if the original message no longer exists
    }
  }
}
