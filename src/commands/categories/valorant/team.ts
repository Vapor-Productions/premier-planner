import { Category } from '@discordx/utilities';
import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  type AutocompleteInteraction,
  type CommandInteraction,
} from 'discord.js';
import { Discord, Slash, SlashGroup, SlashOption } from 'discordx';
import { prisma } from '../../../utils/prisma';
import { fetchPremierTeamByNameAndTag } from '../../../utils/premierApi';

@Discord()
@Category('Valorant')
@SlashGroup({ name: 'team', description: 'Manage Valorant teams' })
@SlashGroup("team")
export class TeamCommands {
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
            name: `${team.name} [${(team as any).teamTag ?? 'TAG'}]`,
            value: team.id,
          })),
        );
      },
    })
    teamId: string,
    interaction: CommandInteraction,
  ): Promise<void> {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ content: 'This command can only be used in a guild.', ephemeral: true });
      return;
    }

    const team = (await prisma.team.findFirst({
      where: {
        id: teamId,
        guildId,
      },
    })) as any;
    if (!team) {
      await interaction.reply({ content: 'Team not found', ephemeral: true });
      return;
    }

    // Fetch live Premier data for this team (if available)
    let premierNote = 'Premier team could not be verified.';
    try {
      const premier = await fetchPremierTeamByNameAndTag(team.name, team.teamTag ?? '');
      if (premier) {
        premierNote = 'Premier team verified via HenrikDev API.';
      }
    } catch {
      premierNote = 'Premier lookup failed (API error).';
    }

    const embed = new EmbedBuilder()
      .setTitle(`Team ${team.name} [${team.teamTag ?? 'TAG'}]`)
      .setDescription(`Team ${team.name} information`)
      .addFields([
        {
          name: 'Team Members',
          value:
            team.members?.length && Array.isArray(team.members)
              ? (team.members as any[]).map((member) => member.username).join(', ')
              : 'N/A',
        },
        {
          name: 'Team Captain',
          value: team.leader?.username ?? 'N/A',
        },
        { name: 'Premier Status', value: premierNote },
        { name: 'Team Created At', value: team.createdAt.toLocaleString() },
      ])
      .setColor(0x0099ff);

    await interaction.reply({ embeds: [embed] });
  }
}