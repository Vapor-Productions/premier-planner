import { Category } from '@discordx/utilities';
import type { AutocompleteInteraction, CommandInteraction } from 'discord.js';
import { ApplicationCommandOptionType, MessageFlags } from 'discord.js';
import { Discord, Slash, SlashOption } from 'discordx';
import {
  type Locale,
  getAvailableLanguages,
  getLanguageName,
  t,
  tWithUser,
} from '../../../utils/localization.js';
import { ensureUserExists, updateUserLanguage } from '../../../utils/userManager.js';

@Discord()
@Category('Utility')
export class Language {
  @Slash({ description: 'Change your language preference.' })
  async language(
    @SlashOption({
      name: 'language',
      description: 'The language to switch to.',
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: (interaction: AutocompleteInteraction) => {
        const focused = interaction.options.getFocused(true).value.toLowerCase();
        const languages = getAvailableLanguages();
        const filtered = focused
          ? languages.filter(
              (lang) =>
                lang.name.toLowerCase().includes(focused) ||
                lang.value.toLowerCase().includes(focused)
            )
          : languages;
        interaction.respond(
          filtered.slice(0, 25).map((lang) => ({ name: lang.name, value: lang.value }))
        );
      },
    })
    languageCode: string,
    interaction: CommandInteraction
  ): Promise<void> {
    const locale = languageCode as Locale;
    const validLocales: Locale[] = ['nl', 'en'];
    if (!validLocales.includes(locale)) {
      await interaction.reply({
        content: await tWithUser('bot.error', interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await ensureUserExists(interaction.user.id, interaction.user.username);
      await updateUserLanguage(interaction.user.id, locale);
      const languageName = getLanguageName(locale);
      await interaction.reply({
        content: t('commands.language.success', locale, { language: languageName }),
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error('Error updating language:', error);
      await interaction.reply({
        content: await tWithUser('bot.error', interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
