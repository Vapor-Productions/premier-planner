import { Category } from '@discordx/utilities';
import type { CommandInteraction } from 'discord.js';
import { Discord, Slash } from 'discordx';

@Discord()
@Category('Valorant')
export class Team {
  @Slash({ description: 'Describe what team does' })
  async team(interaction: CommandInteraction): Promise<void> {
   // TODO: implement team command using multiple subcommands and options
   await interaction.reply({ content: 'TODO: implement team command' });
}
}