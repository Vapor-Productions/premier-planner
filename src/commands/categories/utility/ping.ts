import { Category } from '@discordx/utilities';
import type { CommandInteraction } from 'discord.js';
import { Discord, Slash } from 'discordx';
import { bot } from '../../../bot.js';

@Discord()
@Category('Utility')
export class Ping {
  @Slash({ description: "Ping the bot to check if it's online" })
  async ping(interaction: CommandInteraction): Promise<void> {
    const response = await interaction.reply({ content: 'Pinging...', withResponse: true });
    const sent = response.resource?.message;
    const latency = sent ? sent.createdTimestamp - interaction.createdTimestamp : bot.ws.ping;

    await interaction.editReply(`🏓 Pong! Latency is ${latency}ms.`);
  }
}
