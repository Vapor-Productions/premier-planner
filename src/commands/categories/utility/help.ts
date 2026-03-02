import { Category, type ICategory } from '@discordx/utilities';
import {
  type CommandInteraction,
  ContainerBuilder,
  MessageFlags,
  type SelectMenuComponentOptionData,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  type StringSelectMenuInteraction,
  TextDisplayBuilder,
} from 'discord.js';
import type { Client } from 'discordx';
import {
  type DApplicationCommand,
  Discord,
  MetadataStorage,
  SelectMenuComponent,
  Slash,
} from 'discordx';
import { tWithUser } from '../../../utils/localization.js';
import { capitalise, deletableCheck, getCommandIds } from '../../../utils/util';

// Map categories to their emojis
const categoryEmojis: Record<string, string> = {
  utility: '⚙️',
  moderation: '🔨',
  fun: '🎉',
  information: '💡',
};

/**
 * Get the emoji for a category, defaults to wrench
 */
function getCategoryEmoji(category: string): string {
  return categoryEmojis[category.toLowerCase()] || '🔧';
}

/**
 * Pull all unique categories from registered commands and format them
 */
function getCategoriesAsOptions(): SelectMenuComponentOptionData[] {
  const uniqueCategories = Array.from(
    new Set(
      MetadataStorage.instance.applicationCommands
        .filter((cmd: DApplicationCommand & ICategory) => cmd.category)
        .map((cmd: DApplicationCommand & ICategory) => cmd.category as string)
    )
  );

  return uniqueCategories.map((cat) => ({
    label: `${getCategoryEmoji(cat)} ${cat}`,
    value: `help-${cat.toLowerCase()}`,
  }));
}

/**
 * Build the formatted command list for a specific category
 */
async function buildCommandsList(category: string, client: Client): Promise<string> {
  // Filter commands by category, excluding the help command itself
  const filteredCommands = MetadataStorage.instance.applicationCommands.filter(
    (cmd: DApplicationCommand & ICategory) =>
      cmd.category?.toLowerCase() === category.toLowerCase() && cmd.name?.toLowerCase() !== 'help'
  );

  const commandIds = await getCommandIds(client);
  console.log(commandIds);
  return filteredCommands
    .map((cmd) => {
      const commandId = commandIds[cmd.name];
      console.log(cmd.name, commandId);
      // Use Discord's command mention format if we have the ID, otherwise just capitalize
      const commandMention = commandId ? `</${cmd.name}:${commandId}>` : capitalise(cmd.name);
      console.log(commandMention);
      return `> 🔹 **${commandMention}**\n> \u200b \u200b \u200b *${cmd.description}*`;
    })
    .join('\n');
}

/**
 * The main container builder - handles all three display modes based on what options are passed
 */
async function buildHelpContainer(
  client: Client,
  options: {
    category?: string;
    selectMenu?: StringSelectMenuBuilder;
    showCategorySelector?: boolean;
    userId: string;
  }
): Promise<ContainerBuilder> {
  const { category, selectMenu, showCategorySelector, userId } = options;
  const botName = client.user?.username ?? 'Bot';

  const [commandCenter, welcome, categoriesTitle, categoriesDescription1, categoriesDescription2, categoryCommandsTemplate] =
    await Promise.all([
      tWithUser('commands.help.commandCenter', userId, { botName }),
      tWithUser('commands.help.welcome', userId, { botName }),
      tWithUser('commands.help.categoriesTitle', userId),
      tWithUser('commands.help.categoriesDescription1', userId),
      tWithUser('commands.help.categoriesDescription2', userId),
      tWithUser('commands.help.categoryCommands', userId),
    ]);

  const headerText = new TextDisplayBuilder().setContent(
    [`# 🚀 **${commandCenter}**`, `> 👋 **${welcome}**`].join('\n')
  );

  const container = new ContainerBuilder()
    .addTextDisplayComponents(headerText)
    .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large));

  if (showCategorySelector) {
    const selectText = new TextDisplayBuilder().setContent(
      [
        `## 📂 **${categoriesTitle}**`,
        '',
        `> **${categoriesDescription1}**`,
        `> ${categoriesDescription2}`,
      ].join('\n')
    );

    container
      .addTextDisplayComponents(selectText)
      .addActionRowComponents((row) => {
        if (!selectMenu) {
          throw new Error('Select menu is required for the category selector view');
        }
        return row.addComponents(selectMenu);
      });
  } else if (category) {
    const commandsList = await buildCommandsList(category, client);
    const categoryHeading = categoryCommandsTemplate.replace('{category}', capitalise(category));
    const commandsText = new TextDisplayBuilder().setContent(
      [`## ${getCategoryEmoji(category)} **${categoryHeading}**`, '', commandsList, ''].join('\n')
    );

    container.addTextDisplayComponents(commandsText);

    if (selectMenu) {
      container
        .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small))
        .addActionRowComponents((row) => row.addComponents(selectMenu));
    }
  }

  return container;
}

/**
 * Handle the initial /help command
 */
async function handleHelp(
  interaction: CommandInteraction,
  client: Client,
  selectMenu: StringSelectMenuBuilder
) {
  const cats = getCategoriesAsOptions();

  if (cats.length <= 1) {
    // Single category or no categories
    if (cats.length === 0) {
      return;
    }

    const firstCategory = cats[0];
    if (!firstCategory) {
      return;
    }

    const selectedCategory = firstCategory.value.replace(/^help-/, '').toLowerCase();
    const container = await buildHelpContainer(client, { category: selectedCategory, userId: interaction.user.id });

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  } else {
    const container = await buildHelpContainer(client, {
      selectMenu,
      showCategorySelector: true,
      userId: interaction.user.id,
    });

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}

/**
 * Handle when someone picks a category from the dropdown
 */
async function handleSelectMenu(
  interaction: StringSelectMenuInteraction,
  client: Client,
  selectMenu: StringSelectMenuBuilder
) {
  if (interaction.user.id !== interaction.message.interactionMetadata?.user.id) {
    const [accessDenied, accessDeniedError, accessDeniedHint] = await Promise.all([
      tWithUser('commands.help.accessDenied', interaction.user.id),
      tWithUser('commands.help.accessDeniedError', interaction.user.id),
      tWithUser('commands.help.accessDeniedHint', interaction.user.id),
    ]);
    const errorText = new TextDisplayBuilder().setContent(
      [
        `## ⛔ **${accessDenied}**`,
        '',
        `> **${client.user?.username} - ${capitalise(interaction.message.interaction?.commandName ?? '')}**`,
        `> 🚫 **${accessDeniedError}**`,
        '',
        `*${accessDeniedHint}*`,
      ].join('\n')
    );

    const errorContainer = new ContainerBuilder().addTextDisplayComponents(errorText);
    await interaction.reply({
      components: [errorContainer],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
    return;
  }

  const selectedValue = interaction.values?.[0];
  if (!selectedValue) {
    return deletableCheck(interaction.message, 0);
  }

  // Extract the category name from the dropdown value
  const selectedCategory = selectedValue.replace(/^help-/, '').toLowerCase();
  const container = await buildHelpContainer(client, {
    category: selectedCategory,
    selectMenu,
    userId: interaction.user.id,
  });

  await interaction.update({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}

@Discord()
@Category('Miscellaneous')
export class Help {
  constructor() {
    // Bind methods
    this.help = this.help.bind(this);
    this.handle = this.handle.bind(this);
  }

  /**
   * Create the dropdown menu with current categories and user-localized placeholder.
   */
  private async createSelectMenu(userId: string): Promise<StringSelectMenuBuilder> {
    const placeholder = await tWithUser('commands.help.selectPlaceholder', userId);
    return new StringSelectMenuBuilder()
      .setCustomId('helpSelect')
      .setPlaceholder(`🎯 ${placeholder}`)
      .addOptions(...getCategoriesAsOptions());
  }

  @Slash({ description: 'Display list of commands.' })
  async help(interaction: CommandInteraction, client: Client) {
    if (!interaction.channel) {
      return;
    }

    const selectMenu = await this.createSelectMenu(interaction.user.id);
    await handleHelp(interaction, client, selectMenu);
  }

  @SelectMenuComponent({ id: 'helpSelect' })
  async handle(interaction: StringSelectMenuInteraction, client: Client): Promise<void> {
    const selectMenu = await this.createSelectMenu(interaction.user.id);
    await handleSelectMenu(interaction, client, selectMenu);
  }
}
