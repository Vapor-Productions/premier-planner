# Premier Planner

Premier Planner is a Discord bot for organizing Valorant Premier teams inside Discord guilds. It uses [discordx](https://discordx.js.org) slash commands, Prisma 7 with PostgreSQL, and HenrikDev/Riot APIs for Riot account and Premier roster lookups.

## What the bot does

- Registers slash commands globally in production, or only in `DEV_GUILD_IDS` when `NODE_ENV !== "production"`.
- Stores Discord users, language preferences, Riot account links, teams, and team memberships in PostgreSQL.
- Lets administrators create Valorant Premier teams and verify team data against HenrikDev's Premier API before saving it.
- Shows saved teams with roster status: linked users are compared with the live Premier roster when HenrikDev exposes roster members.
- Provides Riot linking commands:
  - `/riot link` currently points privileged users to `/riot link-backup`.
  - `/riot link-backup` links the caller by Riot ID through HenrikDev account lookup.
  - `/riot link-verify` lets `BOT_DEV_IDS` manually link another non-bot Discord user.
- Starts an RSO callback HTTP server when Riot OAuth variables are configured. The OAuth session helper exists in `src/utils/riot/linkServer.ts`; the active slash command flow is still the HenrikDev backup path.
- Supports per-user language preferences, optional Discord error reporting, debug logging, and maintenance-mode guards for Riot commands.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```properties
# Discord application
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_GUILD_ID=your_primary_guild_id_here
DISCORD_TOKEN=your_discord_bot_token_here

# PostgreSQL connection used by Prisma
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# Optional Discord channel for error embeds
ERROR_LOG_CHANNEL_ID=123456789012345678

# Runtime mode. Non-production registers commands only to DEV_GUILD_IDS when provided.
NODE_ENV=development

# Development command registration
DEV_GUILD_IDS=123456789012345678,987654321098765432

# Privileged bot operators for /riot link-verify and admin-or-dev Riot commands
BOT_DEV_IDS=501700626690998280

# HenrikDev API key for Valorant account and Premier roster lookups
VAL_API_KEY=your_henrikdev_api_key

# Riot Sign-On callback server configuration
RIOT_CLIENT_ID=your_riot_oauth_client_id
RIOT_CLIENT_SECRET=your_riot_oauth_client_secret
RIOT_API_KEY=optional_riot_client_secret_fallback
RIOT_REDIRECT_URI=https://your-public-host.example.com/riot/callback
RIOT_LINK_BIND_HOST=0.0.0.0

# Optional operational controls
DEBUG_MODE=1
MAINTENANCE_MODE=0
MAINTENANCE_COMMANDS=riot.link,riot.link-backup,riot.link-verify
```

### Environment notes

- `VAL_API_KEY` is required by explicit guards for `/riot link-backup` and `/riot link-verify`; Premier team and roster lookups also send it when present.
- `RIOT_CLIENT_SECRET` may be omitted when `RIOT_API_KEY` is set; `src/utils/riot/rso.ts` accepts `RIOT_API_KEY` as the OAuth client secret fallback.
- `RIOT_REDIRECT_URI` controls the callback server port and path. `RIOT_LINK_BIND_HOST` only controls the listen host.
- `MAINTENANCE_MODE` accepts `1`, `true`, `yes`, or `on`. `MAINTENANCE_COMMANDS` is a comma-separated list of command IDs and currently applies to the Riot command IDs listed above.

## Setup

```bash
# Install dependencies
yarn install

# Generate the Prisma client in src/generated/prisma
yarn prisma:generate

# Push the Prisma schema to the configured PostgreSQL database
yarn prisma:push

# Start the development entry point
yarn dev
```

`yarn setup` runs install, client generation, and `prisma db push`. `yarn setup:prod` does the same with production dependencies.

### Database

The Prisma schema defines:

- `User`: Discord ID, username, language, and optional Riot account fields (`riotPuuid`, game name, tag line, link timestamp).
- `Team`: team name, tag, guild ID, and optional leader relation keyed to the leader's Discord ID.
- `TeamMember`: explicit join rows between `Team` and `User`.

`Team` is indexed by `guildId`, but the current unique constraint is global on `(name, teamTag)`. Two guilds cannot store the same Premier name/tag pair.

For SQL clients, `prisma/sql/team_members_readable_view.sql` creates a `TeamMembers_readable` view with team and member names:

```bash
psql "$DATABASE_URL" -f prisma/sql/team_members_readable_view.sql
```

## Command workflows

### Team setup

1. A server administrator runs `/setup` and chooses **Team Settings** for guidance.
2. A server administrator runs `/team create`.
3. The interactive flow asks for Premier team name, team tag, and owner.
4. The bot validates the name/tag with HenrikDev's Premier endpoint before enabling member selection.
5. The administrator selects up to 6 members. Selected members must not already be rostered in any saved team, and the team leader cannot also be selected as a member.
6. Confirm creates the `Team` and `TeamMember` rows in a Prisma transaction.

Use `/team view` to search saved teams in the current guild. The response includes the saved roster and a Premier status. When HenrikDev exposes roster PUUIDs, linked users are marked as on or not on the live Premier roster.

### Riot account linking

- `/riot link-backup game-name:<name> tag:<tag>` resolves a Riot ID through HenrikDev, prevents reusing the same PUUID across Discord users, and stores the Riot account on the caller's `User` row.
- `/riot link-verify member:<user> game-name:<name> tag:<tag>` performs the same lookup for another user and is restricted to Discord IDs in `BOT_DEV_IDS`.
- `/riot link` currently sends users to `/riot link-backup`. The callback server and PKCE helpers are present, but no command currently creates an RSO session URL.

All Riot linking commands reply ephemerally and require either guild Administrator or `BOT_DEV_IDS`, except `/riot link-verify`, which requires `BOT_DEV_IDS`.

### User registration and language

`ensureUserExists` is called before profile, language, and team-related writes. It creates a user row on demand and refreshes the stored username when Discord's username changes. `/language` stores the user's locale on the same `User` row.

## Operations

### Error handling

`setupGlobalErrorHandlers` installs process-level handlers. Command failures are routed through `errorHandler`, which logs context and optionally sends an embed to `ERROR_LOG_CHANNEL_ID`.

### Maintenance mode

Set `MAINTENANCE_MODE=1` to block commands that call `isCommandInMaintenance`. For a narrower block, set `MAINTENANCE_COMMANDS` to comma-separated command IDs such as:

```properties
MAINTENANCE_COMMANDS=riot.link-backup,riot.link-verify
```

Only commands wired to `MaintenanceCommandId` are affected; team commands are not currently maintenance-gated.

### Discord command registration

- Production (`NODE_ENV=production`): discordx registers commands globally.
- Development: set `DEV_GUILD_IDS` for fast guild-scoped command registration.
- `src/main.ts` calls `bot.clearApplicationCommands(...bot.guilds.cache.map((g) => g.id))` after login, so startup may clear guild commands for guilds already cached by the bot.

## Development and quality

```bash
yarn dev        # run src/dev.ts with tsx
yarn watch      # nodemon wrapper around yarn dev
yarn build      # TypeScript compile
yarn start      # run build/main.js
yarn lint       # Biome check
yarn format     # Biome format check
```

## Docker

```bash
docker-compose up --build
```

The checked-in compose file starts the bot and a local PostgreSQL 16 container. Set `RIOT_REDIRECT_URI` to a public URL that reaches the bot process if you wire the RSO callback flow.

## Project Structure

```plaintext
src/
├── commands/          # Slash commands
│   └── categories/    # Command categories
├── events/           # Discord events
├── generated/        # Prisma client output
├── utils/            # API clients, error handling, localization, Prisma helpers
│   └── riot/         # Riot OAuth and callback server helpers
├── bot.ts            # Bot configuration
├── main.ts           # Entry point
└── dev.ts            # Development entry point
```
