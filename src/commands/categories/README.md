# Command categories

Slash commands are grouped with discordx decorators and loaded by the import pattern in
`src/main.ts` / `src/dev.ts`. The `@Category` decorator from `@discordx/utilities` drives the
interactive `/help` menu; grouped slash command names come from `@SlashGroup`.

## Current layout

```plaintext
categories/
├── admin/
│   └── setup.ts       # /setup, Administrator-only server setup hints
├── owner/
│   └── riotOwner.ts   # /riot link-verify, BOT_DEV_IDS only, hidden from /help
├── utility/
│   ├── help.ts        # /help category browser
│   ├── info.ts        # /info user information
│   ├── language.ts    # /language preference
│   ├── ping.ts        # /ping latency check
│   └── profile.ts     # /profile view/update
└── valorant/
    ├── link.ts        # /riot link and /riot link-backup
    └── team.ts        # /team create/view plus team creation components
```

## Adding commands

1. Choose an existing category folder, or create a folder when the category is genuinely new.
2. Create a `.ts` file that exports a `@Discord()` class.
3. Add `@Category("...")`; this is how `/help` discovers the command group.
4. Use `@Slash` for top-level commands and `@SlashGroup` for grouped commands such as `/team view`.
5. Keep component handlers (`@ButtonComponent`, `@ModalComponent`, `@SelectMenuComponent`) near the
   slash flow they serve when they depend on local helpers or in-memory state.

```typescript
import type { CommandInteraction } from 'discord.js';
import { Discord, Slash } from 'discordx';
import { Category } from '@discordx/utilities';

@Discord()
@Category('CategoryName')
export class YourCommand {
  @Slash({ description: 'Your command description' })
  async yourCommand(interaction: CommandInteraction): Promise<void> {
    // Your command logic here
  }
}
```

## Category behavior and constraints

- **Admin** commands should set `defaultMemberPermissions` when Discord should hide them from
  regular members.
- **Owner** commands are hidden from `/help` by `HELP_EXCLUDED_CATEGORIES` in `utility/help.ts`.
  Runtime access must still be checked in the command body, usually with `BOT_DEV_IDS`.
- **Valorant** commands may call external HenrikDev/Riot APIs. Guard long or flaky calls with
  ephemeral replies/deferred replies and keep command-specific maintenance IDs in
  `utils/maintenance.ts`.
- **Utility** commands are visible to regular members unless they add their own permission checks.

When adding a new visible category, also update:

- `categoryEmojis` in `utility/help.ts`, if it needs a custom emoji.
- `localization.ts`, if user-facing strings are added.
- `README.md`, if the command introduces a public workflow or operator runbook.
