import {
  ButtonComponent,
  Discord,
  ModalComponent,
  SelectMenuComponent,
  Slash,
} from 'discordx';
import { Category } from '@discordx/utilities';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ButtonInteraction,
  ContainerBuilder,
  type CommandInteraction,
  MessageFlags,
  ModalBuilder,
  type ModalSubmitInteraction,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  type StringSelectMenuInteraction,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  LabelBuilder,
  MentionableSelectMenuBuilder,
  type MentionableSelectMenuInteraction,
  PermissionsBitField, GuildMember,
} from 'discord.js';
import { tWithUser } from '../../../utils/localization.js';
import { ensureUserExists } from '../../../utils/userManager.js';
import { prisma } from '../../../utils/prisma.js';

type TeamCreationState = {
  hasData: boolean;
  hasMembers: boolean;
  teamName?: string;
  ownerId?: string;
  memberIds?: string[];
};

const teamCreationState = new Map<string, TeamCreationState>();

function getTeamCreationState(userId: string): TeamCreationState {
  const existing = teamCreationState.get(userId);
  if (existing) return existing;
  const initial: TeamCreationState = { hasData: false, hasMembers: false };
  teamCreationState.set(userId, initial);
  return initial;
}

@Discord()
@Category('Admin')
export class Setup {
  @Slash({ description: 'Setup the bot for usage in your server.', defaultMemberPermissions: [PermissionsBitField.Flags.Administrator] })
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
  async handleSetupMenu(
    interaction: StringSelectMenuInteraction
  ): Promise<void> {
    const value = interaction.values[0];
    if (value !== 'general_settings') {
      await interaction.reply({
        content: await tWithUser('commands.setup.invalidSelection', interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const teamDescriptionHeader = new TextDisplayBuilder().setContent(
      ['### 👥 Team Settings', '', '> Setup your premier team(s)'].join('\n')
    );
    const teamSelectMenu = new StringSelectMenuBuilder()
      .setCustomId('team_select_menu')
      .setPlaceholder('Choose an option to continue')
      .addOptions(
        { label: 'Create a new team', value: 'create_team' },
        { label: 'Manage existing teams', value: 'manage_teams' },
        { label: 'Delete a team', value: 'delete_team' }
      );
    const teamSelectActionRow =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(teamSelectMenu);
    const teamSelectContainer = new ContainerBuilder()
      .addTextDisplayComponents(teamDescriptionHeader)
      .addActionRowComponents(teamSelectActionRow)
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large));

    try {
      await interaction.update({
        components: [teamSelectContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch {
      // Ignore Unknown Message errors if the original message no longer exists
    }
  }

  @SelectMenuComponent({ id: 'team_select_menu' })
  async handleTeamSelect(interaction: StringSelectMenuInteraction): Promise<void> {
    const value = interaction.values[0];
    switch (value) {
      case 'create_team': {
        const state = getTeamCreationState(interaction.user.id);
        const createTeamDescriptionHeader = new TextDisplayBuilder().setContent(
          ['### 🆕 **Create a new team**', '', '> Select your action'].join('\n')
        );
        const nameButton = new ButtonBuilder()
          .setCustomId('create_team_data')
          .setLabel('Team Data')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🔤');
        const membersButton = new ButtonBuilder()
          .setCustomId('add_team_members')
          .setLabel('Add Members')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('👥')
          .setDisabled(!state.hasData);
        const confirmButton = new ButtonBuilder()
          .setCustomId('create_team_confirm')
          .setLabel('Confirm')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅')
          .setDisabled(!(state.hasData && state.hasMembers));
        const createTeamActionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          nameButton,
          membersButton,
          confirmButton
        );
        const createTeamContainer = new ContainerBuilder()
          .addTextDisplayComponents(createTeamDescriptionHeader)
          .addActionRowComponents(createTeamActionRow)
          .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large));

        try {
          await interaction.update({
            components: [createTeamContainer],
            flags: MessageFlags.IsComponentsV2,
          });
        } catch {
          // Ignore Unknown Message errors if the original message no longer exists
        }
        break;
      }
      case 'manage_teams':
        await interaction.reply({ content: 'Manage existing teams selected.', flags: MessageFlags.Ephemeral });
        break;
      case 'delete_team':
        await interaction.reply({ content: 'Delete a team selected.', flags: MessageFlags.Ephemeral });
        break;
      default:
        await interaction.reply({
          content: await tWithUser('commands.setup.invalidSelection', interaction.user.id),
          flags: MessageFlags.Ephemeral,
        });
    }
  }

  @ButtonComponent({ id: 'add_team_members' })
  async handleAddTeamMembers(interaction: ButtonInteraction): Promise<void> {
    const membersSelectMenu = new MentionableSelectMenuBuilder()
      .setCustomId('add_team_members_select_menu')
      .setPlaceholder('Select members to add')
      .setMaxValues(6)
      .setRequired(true);
    const membersSelectActionRow = new ActionRowBuilder<MentionableSelectMenuBuilder>().addComponents(membersSelectMenu);
    
    const membersSelectDescriptionHeader = new TextDisplayBuilder().setContent(
      ['### 🆕 **Add team members**', '', '> Select up to 6 members to add', '> This is due to Valorant\'s limitations'].join('\n')
    );
    const membersSelectContainer = new ContainerBuilder()
      .addTextDisplayComponents(membersSelectDescriptionHeader)
      .addActionRowComponents(membersSelectActionRow)
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large));
    try {
      await interaction.update({
        components: [membersSelectContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch {
      // Ignore Unknown Message errors if the original message no longer exists
    }
  }

  @ButtonComponent({ id: 'create_team_data' })
  async handleCreateTeamData(interaction: ButtonInteraction): Promise<void> {
    const nameModal = new ModalBuilder()
      .setCustomId('create_team_name_modal')
      .setTitle('Create a new team');

    const nameInput = new LabelBuilder()
      .setLabel('Enter the name of the team')
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId('create_team_name_input')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder('Name')
          .setValue('')
      );

      const ownerInput = new LabelBuilder()
      .setLabel('Enter the owner of the team')
      .setMentionableSelectMenuComponent(
        new MentionableSelectMenuBuilder()
          .setCustomId('create_team_owner_input')
          .setPlaceholder('Owner')
          .setRequired(true)
          .setMaxValues(1)
      );

    nameModal.addLabelComponents(nameInput, ownerInput);

    await interaction.showModal(nameModal);
  }

  @ButtonComponent({ id: 'create_team_confirm' })
  async handleCreateTeamConfirm(interaction: ButtonInteraction): Promise<void> {
    const state = getTeamCreationState(interaction.user.id);
    if (!state.hasData || !state.hasMembers || !state.teamName || !state.ownerId || !state.memberIds?.length) {
      await interaction.reply({
        content: await tWithUser('commands.setup.completeAllSteps', interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({
        content: await tWithUser('commands.setup.guildNotFound', interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Check if a team with this name already exists in this guild
    const existingTeam = await prisma.team.findFirst({
      where: {
        guildId,
        name: state.teamName,
      },
    });
    if (existingTeam) {
      await interaction.reply({
        content: await tWithUser('commands.setup.teamAlreadyExists', interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Persist the team and members in a single transaction
    await prisma.team.create({
      data: {
        name: state.teamName,
        guildId,
        leader: {
          connect: {
            discordId: state.ownerId,
          },
        },
        members: {
          connect: state.memberIds.map((memberId) => ({ discordId: memberId })),
        },
      },
    });

    teamCreationState.delete(interaction.user.id);

    // Update the original message to lock the flow (all buttons disabled)
    const summaryHeader = new TextDisplayBuilder().setContent(
      ['### ✅ **Team created**', '', '> This setup is now complete.'].join('\n')
    );
    const nameButton = new ButtonBuilder()
      .setCustomId('create_team_data')
      .setLabel('Team Data')
      .setStyle(ButtonStyle.Success)
      .setDisabled(true)
      .setEmoji('🔤');
    const membersButton = new ButtonBuilder()
      .setCustomId('add_team_members')
      .setLabel('Add Members')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('👥')
      .setDisabled(true);
    const confirmButton = new ButtonBuilder()
      .setCustomId('create_team_confirm')
      .setLabel('Confirm')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅')
      .setDisabled(true);
    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      nameButton,
      membersButton,
      confirmButton
    );
    const container = new ContainerBuilder()
      .addTextDisplayComponents(summaryHeader)
      .addActionRowComponents(actionRow)
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large));

    // Try to update the original message UI; if it no longer exists, just skip
    await interaction.update({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    await interaction.reply({
      content: await tWithUser('commands.setup.teamCreated', interaction.user.id),
      flags: MessageFlags.Ephemeral,
    });
  }

  @ModalComponent({ id: 'create_team_name_modal' })
  async handleCreateTeamNameModal(interaction: ModalSubmitInteraction): Promise<void> {
    const name = interaction.fields.getTextInputValue('create_team_name_input');
    const ownerCollection = interaction.fields.getSelectedMembers('create_team_owner_input');
    const rawOwner = ownerCollection?.first();
    const owner = rawOwner instanceof GuildMember ? rawOwner : null;

    if (!name || !owner) {
      await interaction.reply({
        content: await tWithUser('commands.setup.completeAllFields', interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const state = getTeamCreationState(interaction.user.id);
    state.hasData = true;
    state.teamName = name;
    state.ownerId = owner.id;
    teamCreationState.set(interaction.user.id, state);

    // Update the original message to reflect the new state (enable Add Members, keep Confirm disabled)
    const createTeamDescriptionHeader = new TextDisplayBuilder().setContent(
      ['### 🆕 **Create a new team**', '', '> Select your action'].join('\n')
    );
    const nameButton = new ButtonBuilder()
      .setCustomId('create_team_data')
      .setLabel('Team Data')
      .setStyle(ButtonStyle.Success)
      .setDisabled(true)
      .setEmoji('🔤');
    const membersButton = new ButtonBuilder()
      .setCustomId('add_team_members')
      .setLabel('Add Members')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('👥')
      .setDisabled(!state.hasData);
    const confirmButton = new ButtonBuilder()
      .setCustomId('create_team_confirm')
      .setLabel('Confirm')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅')
      .setDisabled(!(state.hasData && state.hasMembers));
    const createTeamActionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      nameButton,
      membersButton,
      confirmButton
    );
    const createTeamContainer = new ContainerBuilder()
      .addTextDisplayComponents(createTeamDescriptionHeader)
      .addActionRowComponents(createTeamActionRow)
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large));

    await interaction.reply({
      components: [createTeamContainer],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    });

    await interaction.followUp({
      content: await tWithUser('commands.setup.dataSaved', interaction.user.id),
      flags: MessageFlags.Ephemeral,
    });
  }

  @SelectMenuComponent({ id: 'add_team_members_select_menu' })
  async handleAddTeamMembersSelect(
    interaction: MentionableSelectMenuInteraction
  ): Promise<void> {
    const members = interaction.values;
    if (members.length === 0) {
      await interaction.reply({
        content: await tWithUser('commands.setup.completeAllFields', interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    // ensure all selected members exist in the database
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({
        content: await tWithUser('commands.setup.guildNotFound', interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await Promise.all(
      members.map(async (memberId) => {
        const gm = await guild.members.fetch(memberId).catch(() => null);
        if (gm) {
          await ensureUserExists(gm.user.id, gm.user.username);
        }
      })
    );

    // check if the members are already in a team
    const teams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            discordId: { in: members },
          },
        },
      },
    });
    if (teams.length > 0) {
      await interaction.reply({
        content: await tWithUser('commands.setup.alreadyInTeam', interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    // check if the team leader is selected
    const teamLeader = await prisma.user.findFirst({
      where: {
        teams: {
          some: {
            leaderId: interaction.user.id,
          },
        },
      },
    });
    if (teamLeader && teamLeader.id === interaction.user.id) {
      await interaction.reply({
        content: await tWithUser('commands.setup.teamLeaderCannotBeAdded', interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const state = getTeamCreationState(interaction.user.id);
    state.hasMembers = true;
    state.memberIds = members;
    teamCreationState.set(interaction.user.id, state);

    const membersSelectDescriptionHeader = new TextDisplayBuilder().setContent(
      ['### 🆕 **Add team members**', '', '> Select your action'].join('\n')
    );

    const nameButton = new ButtonBuilder()
      .setCustomId('create_team_data')
      .setLabel('Team Data')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true)
      .setEmoji('🔤');
    const membersButton = new ButtonBuilder()
      .setCustomId('add_team_members')
      .setLabel('Add Members')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('👥')
      .setDisabled(true);
    const confirmButton = new ButtonBuilder()
      .setCustomId('create_team_confirm')
      .setLabel('Confirm')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅')
      .setDisabled(!(state.hasData && state.hasMembers));

    const membersSelectActionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      nameButton,
      membersButton,
      confirmButton
    );
    const membersSelectContainer = new ContainerBuilder()
      .addTextDisplayComponents(membersSelectDescriptionHeader)
      .addActionRowComponents(membersSelectActionRow)
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large));

    await interaction.update({
      components: [membersSelectContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}
