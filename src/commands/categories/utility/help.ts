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
  valorant: '🎮',
  owner: '🔐',
};

/** Categories not shown in /help (owner-only and similar). */
const HELP_EXCLUDED_CATEGORIES = new Set(['owner']);

function isCategoryVisibleInHelp(category: string | undefined): boolean {
  if (!category) {
    return false;
  }
  return !HELP_EXCLUDED_CATEGORIES.has(category.toLowerCase());
}

/**
 * Per-subcommand slash metadata (before grouping). Using grouped {@link MetadataStorage.applicationCommands}
 * merges e.g. `/riot` into one parent and loses mixed categories (Valorant vs Owner).
 */
function flatSlashCommands(): readonly DApplicationCommand[] {
  return MetadataStorage.instance.applicationCommandSlashesFlat;
}

/** Slash mention path: `riot link`, `team create`, or top-level `help`. */
function slashPathForHelp(cmd: DApplicationCommand): string {
  if (cmd.subgroup) {
    return `${cmd.group} ${cmd.subgroup} ${cmd.name}`;
  }
  if (cmd.group) {
    return `${cmd.group} ${cmd.name}`;
  }
  return cmd.name;
}

/** Key for {@link getCommandIds} root id (`riot`, `team`, or `help`). */
function slashRootName(cmd: DApplicationCommand): string {
  return cmd.group ?? cmd.name;
}

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
      flatSlashCommands()
        .filter((cmd: DApplicationCommand & ICategory) => cmd.category)
        .filter((cmd: DApplicationCommand & ICategory) =>
          isCategoryVisibleInHelp(cmd.category as string)
        )
        .map((cmd: DApplicationCommand & ICategory) => cmd.category as string)
    )
  ).sort((a, b) => a.localeCompare(b));

  return uniqueCategories.map((cat) => ({
    label: `${getCategoryEmoji(cat)} ${cat}`,
    value: `help-${cat.toLowerCase()}`,
  }));
}

/**
 * Build the formatted command list for a specific category
 */
async function buildCommandsList(category: string, client: Client): Promise<string> {
  if (!isCategoryVisibleInHelp(category)) {
    return '';
  }
  const filteredCommands = flatSlashCommands().filter(
    (cmd: DApplicationCommand & ICategory) =>
      cmd.category?.toLowerCase() === category.toLowerCase() && cmd.name?.toLowerCase() !== 'help'
  );

  const commandIds = await getCommandIds(client);
  return filteredCommands
    .map((cmd) => {
      const root = slashRootName(cmd);
      const commandId = commandIds[root];
      const path = slashPathForHelp(cmd);
      const commandMention = commandId ? `</${path}:${commandId}>` : capitalise(path);
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

  const [
    commandCenter,
    welcome,
    categoriesTitle,
    categoriesDescription1,
    categoriesDescription2,
    categoryCommandsTemplate,
  ] = await Promise.all([
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

    container.addTextDisplayComponents(selectText).addActionRowComponents((row) => {
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
    const container = await buildHelpContainer(client, {
      category: selectedCategory,
      userId: interaction.user.id,
    });

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
@Category('Utility')
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
