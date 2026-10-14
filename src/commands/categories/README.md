# Command Categories

This directory contains organized slash commands using discordx's `@Category` decorator from `@discordx/utilities` for better command organization.

## Structure

```plaintext
categories/
├── admin/          # Administrator setup flows
│   └── setup.ts
├── owner/          # BOT_DEV_IDS-only owner tools
│   └── riotOwner.ts
├── utility/        # Help, info, language, ping, profile
└── valorant/       # Riot linking and Premier team workflows
    ├── link.ts
    └── team.ts
```

## Current Categories

- **Admin**: `/setup` opens the setup center and points administrators at team settings commands.
- **Owner**: `/riot link-verify` manually links another user's Riot account and requires `BOT_DEV_IDS`.
- **Utility**: `/help`, `/info`, `/language`, `/ping`, and `/profile`.
- **Valorant**: `/riot link`, `/riot link-backup`, `/team create`, and `/team view`.

Grouped commands use `@SlashGroup` and can share a slash root across files. The `riot` group is split between Valorant user-facing commands and Owner verification commands.

## Adding New Commands

1. **Choose a category** (or create a new one)
2. **Create a new file** in the appropriate category folder
3. **Use the `@Category` decorator** to group commands:

```typescript
import type { CommandInteraction } from "discord.js";
import { Discord, Slash } from "discordx";
import { Category } from "@discordx/utilities";

@Discord()
@Category("CategoryName")
export class YourCommand {
  @Slash({ description: "Your command description" })
  async yourCommand(interaction: CommandInteraction): Promise<void> {
    // Your command logic here
  }
}
```

## Available Categories

- **Admin**: Server administrator workflows.
- **Owner**: Bot developer-only operational commands.
- **Utility**: General utility commands.
- **Valorant**: Riot account and Premier team workflows.

## Discord Guidelines

- Category names can use proper capitalization (e.g., "Utility", "Admin")
- Use descriptive names that match the command's purpose
- Keep commands organized and well-documented
- Prefer ephemeral replies for setup, linking, and other user-specific or privileged flows.
- When a command writes user-owned data, rely on `interactionCreate` or call `ensureUserExists` for target users before creating related records.
