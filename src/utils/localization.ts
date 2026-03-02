export const locales = {
  nl: {
    // Bot responses
    bot: {
      ready: 'Bot is klaar en online!',
      shutdown: 'Bot wordt afgesloten...',
      error: 'Er is een fout opgetreden',
      permission:
        'Je hebt niet de juiste rechten om dit commando te gebruiken. (Permissie(s): {permission})',
      status: {
        madeby: 'Made by Vapor',
        website: 'https://premierplanner.eu/docs'
      },
    },

    // Commands
    commands: {
      sendmessage: {
        description: 'Verstuur een bericht naar een kanaal.',
        channel: 'Het kanaal waarin het bericht moet worden verstuurd.',
        message: 'Het bericht dat moet worden verstuurd.',
        success: 'Bericht is verstuurd naar {channel}.',
      },
      ban: {
        description: 'Ban een lid van de server.',
        member: 'Het lid om te bannen.',
        reason: 'De reden voor de ban.',
        success: 'Gebruiker {user} is verbannen van de server.',
        userMessage: 'Je bent verbannen van {guild} door {moderator}.',
        noReason: 'Geen reden opgegeven',
      },
      kick: {
        description: 'Kick een lid van de server.',
        member: 'Het lid om te kicken.',
        reason: 'De reden voor de kick.',
        success: 'Gebruiker {user} is gekickt van de server.',
        userMessage: 'Je bent gekickt van {guild} door {moderator}.',
        noReason: 'Geen reden opgegeven',
      },
      timeout: {
        description: 'Geef een lid een timeout.',
        member: 'Het lid om een timeout te geven.',
        duration: 'De duur van de timeout (bijv. 1h, 30m, 1d).',
        reason: 'De reden voor de timeout.',
        success: 'Gebruiker {user} heeft een timeout van {duration} gekregen.',
        removed: 'Timeout voor {user} is succesvol verwijderd.',
        userMessage: 'Je hebt een timeout van {duration} gekregen in {guild} door {moderator}.',
        noReason: 'Geen reden opgegeven',
      },
      warn: {
        description: 'Waarschuw een lid.',
        member: 'Het lid om te waarschuwen.',
        reason: 'De reden voor de waarschuwing.',
        success: 'Gebruiker {user} is gewaarschuwd.',
        userMessage: 'Je bent gewaarschuwd door {moderator} in {guild}.',
        noReason: 'Geen reden opgegeven',
      },
      help: {
        description: "Toon alle beschikbare commando's.",
        title: "NightMT Bot Commando's",
        category: 'Categorie',
        usage: 'Gebruik',
        commandCenter: '{botName} Command Center',
        welcome: 'Welkom bij het commandohub van {botName}!',
        categoriesTitle: 'Command Categorieën',
        categoriesDescription1: 'Kies hieronder een categorie om beschikbare commando\'s te bekijken.',
        categoriesDescription2: 'Elke categorie bevat gespecialiseerde commando\'s voor verschillende functies.',
        categoryCommands: '{category} Commando\'s',
        accessDenied: 'Toegang geweigerd',
        accessDeniedError: 'Alleen de persoon die het commando heeft uitgevoerd kan dit menu gebruiken!',
        accessDeniedHint: 'Voer het commando zelf uit om het helpmenu te openen.',
        selectPlaceholder: 'Kies een commandocategorie...',
      },
      info: {
        description: 'Toon informatie over de bot.',
        title: 'Bot Informatie',
        version: 'Versie',
        uptime: 'Uptime',
        serverCount: 'Aantal servers',
      },
      ping: {
        description: 'Test de bot latency.',
        response: 'Pong! Latency: {latency}ms',
      },
      profile: {
        description: 'Toon het profiel van een gebruiker.',
        user: 'De gebruiker om informatie over te tonen.',
        title: 'Profiel van {username}',
        joined: 'Lid sinds',
        roles: 'Rollen',
        infractions: 'Overtredingen',
        action: 'Wat wil je doen met je profiel',
      },
      setup: {
        description: 'Stel de bot in voor deze server.',
        title: 'Admin Setup Center',
        header: 'Setup',
        intro: 'Dit commando wordt gebruikt om de bot in te stellen.',
        menuTitle: 'Setup Menu',
        menuDescription: 'Selecteer een optie om door te gaan.',
        selectPlaceholder: 'Selecteer een optie om door te gaan',
        invalidSelection: 'Ongeldige selectie.',
        optionGeneral: 'Team Instellingen',
        alreadySetup: 'Deze server is al ingesteld.',
        success: 'De bot is ingesteld voor deze server.',
        completeAllSteps: 'Voltooi eerst alle stappen voordat je kunt bevestigen.',
        completeAllFields: 'Vul alle verplichte velden in voordat je verder gaat.',
        dataSaved: 'Teaminformatie is opgeslagen. Voeg nu leden toe en bevestig om het team aan te maken.',
        teamCreated: 'Het team is succesvol aangemaakt.',
        guildNotFound: 'Kan de servercontext niet bepalen. Probeer het later opnieuw.',
        alreadyInTeam: 'Een of meer geselecteerde leden zitten al in een team.',
        teamLeaderCannotBeAdded: 'De teamleider kan niet als lid worden toegevoegd.',
        teamAlreadyExists: 'Er bestaat al een team met deze naam in deze server.',
      },
      fetchData: {
        description: 'Haal alle data op uit de SheetDB API.',
        success: 'Fetched {count} rows of data',
      },
      language: {
        description: 'Verander je taalvoorkeur.',
        language: 'De taal om naar te veranderen.',
        success: 'Je taal is veranderd naar {language}.',
        current: 'Je huidige taal is {language}.',
        available: 'Beschikbare talen',
      },
    },

    // Categories
    categories: {
      admin: 'Administratie',
      moderation: 'Moderatie',
      utility: 'Hulpmiddelen',
    },

    // Errors
    errors: {
      userNotFound: 'Gebruiker niet gevonden.',
      invalidDuration: 'Ongeldige duur opgegeven.',
      alreadyBanned: 'Deze gebruiker is al verbannen.',
      alreadyKicked: 'Deze gebruiker is al gekickt.',
      alreadyTimedOut: 'Deze gebruiker heeft al een timeout.',
      cannotBanSelf: 'Je kunt jezelf niet verbannen.',
      cannotKickSelf: 'Je kunt jezelf niet kicken.',
      cannotTimeoutSelf: 'Je kunt jezelf geen timeout geven.',
      botMissingPermission: 'Ik heb niet de juiste rechten om deze actie uit te voeren.',
      embedTitle: '❌ Er is een fout opgetreden',
      embedDescription: 'Er is een onverwachte fout opgetreden bij het verwerken van je verzoek.',
      errorType: 'Fouttype',
      severity: 'Ernst',
      messageLabel: 'Bericht',
      commandLabel: 'Commando',
      stackLabel: 'Stack',
      unknown: 'Onbekend',
      noStack: 'Geen stack trace',
    },
  },
  en: {
    // Bot responses
    bot: {
      ready: 'Bot is ready and online!',
      shutdown: 'Bot is shutting down...',
      error: 'An error has occurred',
      permission:
        'You do not have the correct permissions to use this command. (Permission(s): {permission})',
      status: {
          madeby: 'Made by Vapor',
          website: 'https://premierplanner.eu/docs'
       },
    },

    // Commands
    commands: {
      sendmessage: {
        description: 'Send a message to a channel.',
        channel: 'The channel where the message should be sent.',
        message: 'The message to be sent.',
        success: 'Message sent to {channel}.',
      },
      ban: {
        description: 'Ban a member from the server.',
        member: 'The member to ban.',
        reason: 'The reason for the ban.',
        success: 'User {user} has been banned from the server.',
        userMessage: 'You have been banned from {guild} by {moderator}.',
        noReason: 'No reason provided',
      },
      kick: {
        description: 'Kick a member from the server.',
        member: 'The member to kick.',
        reason: 'The reason for the kick.',
        success: 'User {user} has been kicked from the server.',
        userMessage: 'You have been kicked from {guild} by {moderator}.',
        noReason: 'No reason provided',
      },
      timeout: {
        description: 'Give a member a timeout.',
        member: 'The member to give a timeout to.',
        duration: 'The duration of the timeout (e.g. 1h, 30m, 1d).',
        reason: 'The reason for the timeout.',
        success: 'User {user} has been timed out for {duration}.',
        removed: 'Timeout for {user} has been successfully removed.',
        userMessage: 'You have been timed out for {duration} in {guild} by {moderator}.',
        noReason: 'No reason provided',
      },
      warn: {
        description: 'Warn a member.',
        member: 'The member to warn.',
        reason: 'The reason for the warning.',
        success: 'User {user} has been warned.',
        userMessage: 'You have been warned by {moderator} in {guild}.',
        noReason: 'No reason provided',
      },
      help: {
        description: 'Show all available commands.',
        title: 'NightMT Bot Commands',
        category: 'Category',
        usage: 'Usage',
        commandCenter: '{botName} Command Center',
        welcome: 'Welcome to {botName}\'s command hub!',
        categoriesTitle: 'Command Categories',
        categoriesDescription1: 'Choose a category below to explore available commands.',
        categoriesDescription2: 'Each category contains specialized commands for different features.',
        categoryCommands: '{category} Commands',
        accessDenied: 'Access Denied',
        accessDeniedError: 'Only the command executor can interact with this menu!',
        accessDeniedHint: 'Run the command yourself to access the help menu.',
        selectPlaceholder: 'Choose a command category...',
      },
      info: {
        description: 'Show information about the bot.',
        title: 'Bot Information',
        version: 'Version',
        uptime: 'Uptime',
        serverCount: 'Server Count',
      },
      ping: {
        description: 'Test the bot latency.',
        response: 'Pong! Latency: {latency}ms',
      },
      profile: {
        description: "Show a user's profile.",
        user: 'The user to show information about.',
        title: 'Profile of {username}',
        joined: 'Member since',
        roles: 'Roles',
        infractions: 'Infractions',
        action: 'What do you want to do with your profile',
      },
      setup: {
        description: 'Set up the bot for this server.',
        title: 'Admin Setup Center',
        header: 'Setup',
        intro: 'This command is used to setup the bot.',
        menuTitle: 'Setup Menu',
        menuDescription: 'Select an option to continue.',
        selectPlaceholder: 'Select an option to continue',
        invalidSelection: 'Invalid selection.',
        optionGeneral: 'Team Settings',
        alreadySetup: 'This server is already set up.',
        success: 'The bot has been set up for this server.',
        completeAllSteps: 'Please complete all steps before confirming.',
        completeAllFields: 'Please fill in all required fields before continuing.',
        dataSaved: 'Team data has been saved. Now add members and confirm to create the team.',
        teamCreated: 'Team has been created successfully.',
        guildNotFound: 'Could not determine the server context. Please try again later.',
        alreadyInTeam: 'One or more selected members are already in a team.',
        teamLeaderCannotBeAdded: 'The team leader cannot be added as a member.',
        teamAlreadyExists: 'A team with this name already exists in this server.',
      },
      fetchData: {
        description: 'Fetch all data from the SheetDB API.',
        success: 'Fetched {count} rows of data',
      },
      language: {
        description: 'Change your language preference.',
        language: 'The language to change to.',
        success: 'Your language has been changed to {language}.',
        current: 'Your current language is {language}.',
        available: 'Available languages',
      },
    },

    // Categories
    categories: {
      admin: 'Administration',
      moderation: 'Moderation',
      utility: 'Utilities',
    },

    // Errors
    errors: {
      userNotFound: 'User not found.',
      invalidDuration: 'Invalid duration provided.',
      alreadyBanned: 'This user is already banned.',
      alreadyKicked: 'This user is already kicked.',
      alreadyTimedOut: 'This user already has a timeout.',
      cannotBanSelf: 'You cannot ban yourself.',
      cannotKickSelf: 'You cannot kick yourself.',
      cannotTimeoutSelf: 'You cannot timeout yourself.',
      botMissingPermission: 'I do not have the correct permissions to perform this action.',
      embedTitle: '❌ Error Occurred',
      embedDescription: 'An unexpected error occurred while processing your request.',
      errorType: 'Error Type',
      severity: 'Severity',
      messageLabel: 'Message',
      commandLabel: 'Command',
      stackLabel: 'Stack',
      unknown: 'Unknown',
      noStack: 'No stack trace',
    },
  },
};

export type Locale = keyof typeof locales;
export type LocaleKey = keyof typeof locales.nl;

/** Default locale when no user context is available (e.g. bot startup, process exit) */
export function getDefaultLocale(): Locale {
  return 'en';
}

export function t(key: string, locale: Locale = getDefaultLocale(), params?: Record<string, string>): string {
  const keys = key.split('.');
  let value: unknown = locales[locale];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key; // Return key if translation not found
    }
  }

  if (typeof value === 'string' && params) {
    return value.replace(/\{(\w+)\}/g, (match, param) => params[param] || match);
  }

  return (value as string) || key;
}

/**
 * Get translation with user's language preference from database
 * This function should be used in commands where we have access to the user
 */
export async function tWithUser(
  key: string,
  userId: string,
  params?: Record<string, string>
): Promise<string> {
  try {
    const { getUserByDiscordId } = await import('./userManager');
    const user = await getUserByDiscordId(userId);
    const userLocale = (user?.language as Locale) || getDefaultLocale();
    return t(key, userLocale, params);
  } catch (error) {
    console.error('Error getting user language:', error);
    return t(key, getDefaultLocale(), params);
  }
}

export function getLocale(): Locale {
  return getDefaultLocale();
}

/**
 * Get available language options for autocomplete
 */
export function getAvailableLanguages(): Array<{ name: string; value: string }> {
  return [
    { name: '🇳🇱 Nederlands (Dutch)', value: 'nl' },
    { name: '🇺🇸 English', value: 'en' },
    { name: '🇪🇸 Español (Spanish)', value: 'es' },
  ];
}

/**
 * Get language name by code
 */
export function getLanguageName(code: string): string {
  const languages = getAvailableLanguages();
  const language = languages.find((lang) => lang.value === code);
  return language ? language.name : code;
}
