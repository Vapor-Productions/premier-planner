/** biome-ignore-all assist/source/organizeImports: Annoying warnings */
import { Category } from '@discordx/utilities';
import {
  ButtonComponent,
  Discord,
  ModalComponent,
  SelectMenuComponent,
  Slash,
  SlashGroup,
  SlashOption,
} from 'discordx';
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  EmbedBuilder,
  GuildMember,
  LabelBuilder,
  MentionableSelectMenuBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionsBitField,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  type AutocompleteInteraction,
  type ButtonInteraction,
  type CommandInteraction,
  type MentionableSelectMenuInteraction,
  type ModalSubmitInteraction,
} from 'discord.js';
import { prisma } from '../../../utils/prisma.js';
import {
  fetchPremierRosterLookup,
  fetchPremierTeamByNameAndTag,
} from '../../../utils/premierApi.js';
import { tWithUser } from '../../../utils/localization.js';
import { ensureUserExists } from '../../../utils/userManager.js';

type TeamCreationState = {
  hasData: boolean;
  hasMembers: boolean;
  teamName?: string;
  teamTag?: string;
  ownerId?: string;
  memberIds?: string[];
};

const teamCreationState = new Map<string, TeamCreationState>();

/** Matches `findFirst` below; avoids `TeamGetPayload` + nested `select` inferring `memberLinks` as `never`. */
type TeamViewResult = {
  name: string;
  teamTag: string;
  createdAt: Date;
  leader: { username: string; riotPuuid: string | null } | null;
  memberLinks: Array<{
    user: { username: string; riotPuuid: string | null; discordId: string };
  }>;
};

function getTeamCreationState(userId: string): TeamCreationState {
  const existing = teamCreationState.get(userId);
  if (existing) return existing;
  const initial: TeamCreationState = { hasData: false, hasMembers: false };
  teamCreationState.set(userId, initial);
  return initial;
}

@Discord()
@Category('Valorant')
@SlashGroup({ name: 'team', description: 'Manage Valorant teams' })
@SlashGroup('team')
export class TeamCommands {
  @Slash({
    description: 'Create a new Premier team in this server',
    defaultMemberPermissions: [PermissionsBitField.Flags.Administrator],
  })
  async create(interaction: CommandInteraction): Promise<void> {
    if (!interaction.guildId) {
      await interaction.reply({
        content: await tWithUser('commands.setup.guildNotFound', interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    teamCreationState.delete(interaction.user.id);
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

    await interaction.reply({
      components: [createTeamContainer],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    });
  }

  @Slash({ description: 'View a specific team' })
  async view(
    @SlashOption({
      name: 'team-name',
      description: 'The name of the team to view',
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: async (auto: AutocompleteInteraction) => {
        const focused = auto.options.getFocused(true).value.toString();

        const guildId = auto.guildId;
        if (!guildId) {
          await auto.respond([]);
          return;
        }

        const teams = await prisma.team.findMany({
          where: {
            guildId,
            name: focused
              ? {
                  contains: focused,
                  mode: 'insensitive',
                }
              : undefined,
          },
          take: 25,
        });

        await auto.respond(
          teams.map((team) => ({
            name: `${team.name}#${team.teamTag ?? 'TAG'}`,
            value: team.id,
          }))
        );
      },
    })
    teamId: string,
    interaction: CommandInteraction
  ): Promise<void> {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({
        content: 'This command can only be used in a guild.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const teamRow = await prisma.team.findFirst({
      where: {
        id: teamId,
        guildId,
      },
      include: {
        leader: { select: { username: true, riotPuuid: true } },
      },
    });
    if (!teamRow) {
      await interaction.reply({ content: 'Team not found', flags: MessageFlags.Ephemeral });
      return;
    }

    const memberLinks = await prisma.teamMember.findMany({
      where: { teamId: teamRow.id },
      include: {
        user: { select: { username: true, riotPuuid: true, discordId: true } },
      },
    });

    const team: TeamViewResult = {
      name: teamRow.name,
      teamTag: teamRow.teamTag,
      createdAt: teamRow.createdAt,
      leader: teamRow.leader,
      memberLinks,
    };

    const userId = interaction.user.id;
    let premierNote: string;
    let roster: Set<string> | null = null;
    try {
      const lookup = await fetchPremierRosterLookup(team.name, team.teamTag ?? '');
      if (lookup.kind === 'ok') {
        roster = lookup.roster;
        premierNote = 'Premier team verified via API.';
      } else if (lookup.kind === 'team_not_found') {
        premierNote = await tWithUser('commands.setup.premierTeamNotFound', userId);
      } else {
        premierNote = await tWithUser('commands.team.premierRosterNotExposed', userId);
      }
    } catch {
      premierNote = 'Premier lookup failed (API error).';
      roster = null;
    }

    const formatMemberLine = async (
      username: string,
      riotPuuid: string | null
    ): Promise<string> => {
      if (roster === null) {
        return username;
      }
      if (!riotPuuid) {
        return `${username} — ${await tWithUser('commands.team.memberNoRiotLink', userId)}`;
      }
      const on = roster.has(riotPuuid.trim().toLowerCase());
      return `${username} — ${await tWithUser(
        on ? 'commands.team.memberOnPremierRoster' : 'commands.team.memberNotOnPremierRoster',
        userId
      )}`;
    };

    const captainDisplay = team.leader
      ? await formatMemberLine(team.leader.username, team.leader.riotPuuid)
      : 'N/A';
    const rosterUsers = team.memberLinks.map((l) => l.user);
    const membersDisplay = rosterUsers.length
      ? (await Promise.all(rosterUsers.map((m) => formatMemberLine(m.username, m.riotPuuid)))).join(
          '\n'
        )
      : 'N/A';

    const embed = new EmbedBuilder()
      .setTitle(`Team ${team.name}#${team.teamTag ?? 'TAG'}`)
      .setDescription(`Team ${team.name} information`)
      .addFields([
        {
          name: 'Team Members',
          value: membersDisplay.slice(0, 1024),
        },
        {
          name: 'Team Captain',
          value: captainDisplay.slice(0, 1024),
        },
        { name: 'Premier Status', value: premierNote },
        { name: 'Team Created At', value: team.createdAt.toLocaleString() },
      ])
      .setColor(0x0099ff);

    await interaction.reply({ embeds: [embed] });
  }

  @ButtonComponent({ id: 'add_team_members' })
  async handleAddTeamMembers(interaction: ButtonInteraction): Promise<void> {
    const membersSelectMenu = new MentionableSelectMenuBuilder()
      .setCustomId('add_team_members_select_menu')
      .setPlaceholder('Select members to add')
      .setMaxValues(6)
      .setRequired(true);
    const membersSelectActionRow =
      new ActionRowBuilder<MentionableSelectMenuBuilder>().addComponents(membersSelectMenu);

    const membersSelectDescriptionHeader = new TextDisplayBuilder().setContent(
      [
        '### 🆕 **Add team members**',
        '',
        '> Select up to 6 members to add',
        "> This is due to Valorant's limitations",
      ].join('\n')
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

    const tagInput = new LabelBuilder()
      .setLabel('Enter the Premier team tag')
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId('create_team_tag_input')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder('TAG')
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

    nameModal.addLabelComponents(nameInput, tagInput, ownerInput);

    await interaction.showModal(nameModal);
  }

  @ButtonComponent({ id: 'create_team_confirm' })
  async handleCreateTeamConfirm(interaction: ButtonInteraction): Promise<void> {
    const state = getTeamCreationState(interaction.user.id);
    if (
      !state.hasData ||
      !state.hasMembers ||
      !state.teamName ||
      !state.teamTag ||
      !state.ownerId ||
      !state.memberIds?.length
    ) {
      await interaction.reply({
        content: await tWithUser('commands.setup.completeAllSteps', interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const teamName = state.teamName;
    const teamTag = state.teamTag;
    const ownerId = state.ownerId;
    const memberIds = state.memberIds;

    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({
        content: await tWithUser('commands.setup.guildNotFound', interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const existingTeam = await prisma.team.findUnique({
      where: {
        name_teamTag: {
          name: teamName,
          teamTag: teamTag,
        },
      },
    });
    if (existingTeam) {
      await interaction.reply({
        content: await tWithUser('commands.setup.teamAlreadyExists', interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({
        content: await tWithUser('commands.setup.guildNotFound', interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const ownerMember = await guild.members.fetch(ownerId).catch(() => null);
    if (!ownerMember) {
      await interaction.reply({
        content: await tWithUser('commands.setup.completeAllFields', interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await ensureUserExists(ownerMember.id, ownerMember.user.username);

    await Promise.all(
      memberIds.map(async (memberId) => {
        const gm = await guild.members.fetch(memberId).catch(() => null);
        if (gm) {
          await ensureUserExists(gm.user.id, gm.user.username);
        }
      })
    );

    try {
      await prisma.$transaction(async (tx) => {
        const team = await tx.team.create({
          data: {
            name: teamName,
            teamTag,
            guildId,
            leaderId: ownerId,
          },
        });

        const uniqueDiscordIds = [...new Set(memberIds)];
        const rosterUsers = await tx.user.findMany({
          where: { discordId: { in: uniqueDiscordIds } },
          select: { id: true, discordId: true },
        });

        if (rosterUsers.length !== uniqueDiscordIds.length) {
          throw new Error('Roster users not found');
        }

        const idByDiscord = new Map(rosterUsers.map((u) => [u.discordId, u.id]));
        await tx.teamMember.createMany({
          data: uniqueDiscordIds.map((discordId) => {
            const userId = idByDiscord.get(discordId);
            if (userId === undefined) {
              throw new Error('Roster user id missing');
            }
            return { teamId: team.id, userId };
          }),
        });
      });
    } catch {
      await interaction.reply({
        content: await tWithUser('commands.setup.completeAllFields', interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    teamCreationState.delete(interaction.user.id);

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

    await interaction.update({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    await interaction.followUp({
      content: await tWithUser('commands.setup.teamCreated', interaction.user.id),
      flags: MessageFlags.Ephemeral,
    });
  }

  @ModalComponent({ id: 'create_team_name_modal' })
  async handleCreateTeamNameModal(interaction: ModalSubmitInteraction): Promise<void> {
    const name = interaction.fields.getTextInputValue('create_team_name_input');
    const rawTag = interaction.fields.getTextInputValue('create_team_tag_input');
    const ownerCollection = interaction.fields.getSelectedMembers('create_team_owner_input');
    const rawOwner = ownerCollection?.first();
    const owner = rawOwner instanceof GuildMember ? rawOwner : null;

    if (!name || !rawTag || !owner) {
      await interaction.reply({
        content: await tWithUser('commands.setup.completeAllFields', interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const teamTag = rawTag.trim();

    await ensureUserExists(owner.id, owner.user.username);

    const premierTeam = await fetchPremierTeamByNameAndTag(name, teamTag);
    if (!premierTeam) {
      await interaction.reply({
        content: await tWithUser('commands.setup.premierTeamNotFound', interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const state = getTeamCreationState(interaction.user.id);
    state.hasData = true;
    state.teamName = name;
    state.teamTag = teamTag;
    state.ownerId = owner.id;
    teamCreationState.set(interaction.user.id, state);

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
  async handleAddTeamMembersSelect(interaction: MentionableSelectMenuInteraction): Promise<void> {
    const members = interaction.values;
    if (members.length === 0) {
      await interaction.reply({
        content: await tWithUser('commands.setup.completeAllFields', interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
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

    const alreadyRostered = await prisma.teamMember.findFirst({
      where: {
        user: { discordId: { in: members } },
      },
    });
    if (alreadyRostered) {
      await interaction.reply({
        content: await tWithUser('commands.setup.alreadyInTeam', interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const state = getTeamCreationState(interaction.user.id);
    if (state.ownerId && members.includes(state.ownerId)) {
      await interaction.reply({
        content: await tWithUser('commands.setup.teamLeaderCannotBeAdded', interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

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
