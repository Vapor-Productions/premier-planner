# Premier Planner

Premier Planner is a Discord bot for managing Valorant Premier teams. It uses
[discordx](https://discordx.js.org), Discord.js, TypeScript and Prisma with PostgreSQL.

## Features

- **Premier team workflows** - Admins create teams, choose captains and roster members, then
  verify saved members against the live Premier roster when HenrikDev exposes it.
- **Riot account links** - Stores a Riot PUUID, game name and tag line for each Discord user.
- **Per-user language** - `/language` stores a preferred locale on the `User` row.
- **discordx commands** - Slash commands, grouped subcommands and message components are loaded from
  `src/commands` and `src/events`.
- **Operational controls** - Development guild command registration, maintenance switches, debug logs,
  graceful shutdown and optional Discord error-log embeds.
- **Prisma/PostgreSQL** - Prisma 7 client generation and `db push` are part of setup/build flows.
- **Biome** - Fast linting, formatting and import organization.

## Environment Variables

Copy `.env.example` to `.env` and fill it in. Only `DISCORD_TOKEN` and `DATABASE_URL` are required; the rest switch features on.

| Variable | Required | What it does |
|---|---|---|
| `DISCORD_TOKEN` | yes | Bot token |
| `DATABASE_URL` | yes | PostgreSQL connection string for Prisma |
| `ERROR_LOG_CHANNEL_ID` | no | Channel that receives error reports |
| `NODE_ENV` | no | `production` registers commands globally; anything else uses `DEV_GUILD_IDS` |
| `DEV_GUILD_IDS` | no | Comma-separated guild IDs for command registration outside production |
| `BOT_DEV_IDS` | no | Comma-separated user IDs allowed to use privileged commands without Administrator |
| `DEBUG_MODE` | no | `1` / `true` / `yes` / `on` for verbose logs |
| `RIOT_CLIENT_ID`, `RIOT_CLIENT_SECRET`, `RIOT_REDIRECT_URI` | no | Configure the built-in Riot Sign-On callback server and helper functions. `RIOT_CLIENT_SECRET` falls back to `RIOT_API_KEY`; the current `/riot link` command redirects to `/riot link-backup` and does not create an RSO session yet |
| `RIOT_LINK_BIND_HOST` | no | Interface the callback server binds to (default `0.0.0.0`); the port and path come from `RIOT_REDIRECT_URI` |
| `VAL_API_KEY` | for `/riot link-backup` | HenrikDev Valorant API key, also sent with Premier lookups when set |
| `MAINTENANCE_MODE` | no | `1` pauses every command that checks maintenance |
| `MAINTENANCE_COMMANDS` | no | Comma-separated command ids to pause, e.g. `riot.link,riot.link-backup` |

## Command workflows

- `/setup` is Administrator-only. It currently shows team settings and points operators to
  `/team create` and `/team view`; it does not persist server setup on its own.
- `/team create` is Administrator-only and guild-only. The flow stores in-memory draft state per
  command user, verifies the submitted Premier team name/tag with HenrikDev, lets the operator
  select up to six roster members, and writes `Team` plus `TeamMember` rows after confirmation.
  The leader cannot also be a roster member. A selected member cannot already be in any team.
- `/team view` is guild-scoped. Autocomplete returns teams from the current guild, then the command
  fetches the saved roster and compares linked Riot PUUIDs against HenrikDev's Premier roster when
  the API exposes member data.
- `/riot link` and `/riot link-backup` require a guild Administrator or a Discord user ID listed in
  `BOT_DEV_IDS`. `/riot link` currently replies with a pointer to `/riot link-backup`; the backup
  path requires `VAL_API_KEY` and saves the resolved HenrikDev PUUID.
- `/riot link-verify` is in the hidden Owner category, requires `BOT_DEV_IDS`, and lets a bot
  developer link another non-bot Discord user to a Riot account.
- `/language` accepts `en` and `nl`. Autocomplete is populated from `getAvailableLanguages`, but
  the command rejects any locale outside that allow-list.

## Error Logging to Discord Channel

If you want errors to be reported to a specific Discord channel, set the `ERROR_LOG_CHANNEL_ID` environment variable in your `.env` file to the target channel's ID:

```properties
ERROR_LOG_CHANNEL_ID=123456789012345678
```

When this is set, any error handled by the bot will also be posted to that channel as an embed for monitoring.

## Installation

```bash
# Install dependencies
yarn install

# Generate Prisma client
yarn prisma generate

# Apply the schema
yarn prisma:push
```

## Development

```bash
# Start development server with hot reload
yarn dev

# Watch for file changes
yarn watch
```

## Production

```bash
# Build the project
yarn build

# Start production server
yarn start
```

## Docker

```bash
# Build and run with a local Postgres (the schema is applied on start)
docker compose up --build
```

The compose file is for local development only. It overrides `DATABASE_URL` so the app talks to the
bundled `db` service, runs `prisma db push` before `node build/main.js`, and binds Postgres to
`127.0.0.1:5432`.

## Operations notes

- `NODE_ENV=production` registers global commands. Any other value uses `DEV_GUILD_IDS` for faster
  guild command registration. On `clientReady`, the bot clears the command scope it is not using
  before calling `initApplicationCommands`.
- Maintenance mode only affects commands that call `isCommandInMaintenance` (currently the Riot
  linking commands). Use `MAINTENANCE_MODE=1` to pause all of those commands, or
  `MAINTENANCE_COMMANDS=riot.link,riot.link-backup` for targeted pauses.
- If RSO environment variables are present, `startRiotLinkServer` listens on the port and path from
  `RIOT_REDIRECT_URI` and on `RIOT_LINK_BIND_HOST` (default `0.0.0.0`). The server can complete
  pending sessions created by `createRiotLinkSession`; the current slash command does not create
  those sessions.
- SIGINT/SIGTERM run one graceful shutdown path: stop the Riot link server, destroy the Discord
  client, disconnect Prisma, then exit.

## Scripts

- `yarn dev` - Start development server with hot reload
- `yarn watch` - Watch for file changes
- `yarn build` - Clear `build/`, generate the Prisma client and compile
- `yarn start` - Start production server
- `yarn lint` - Run Biome linting
- `yarn lint:fix` - Fix Biome linting errors
- `yarn format` - Format code with Biome
- `yarn format:fix` - Format and write changes
- `yarn biome:fix` - Run both linting and formatting fixes

## Project Structure

```plaintext
src/
├── commands/          # Slash commands
│   └── categories/    # Command categories
├── events/           # Discord events
├── generated/        # Generated Prisma client
├── utils/            # Prisma, Riot/Premier APIs, localization, errors, shutdown
├── bot.ts            # Bot configuration
├── main.ts           # Entry point
└── dev.ts            # Development entry point
```

## Error Handling

The bot includes a comprehensive error handling system that:

- Catches and logs all errors with context
- Prevents crashes from unhandled exceptions
- Provides user-friendly error messages
- Supports optional Discord channel error reporting
- Implements rate limiting to prevent spam
- Handles database operation errors safely

## Code Quality

This project uses **Biome** for code quality:

- **Fast linting** - Built in Rust for speed
- **Formatting** - Consistent code style
- **Import organization** - Automatic import sorting
- **TypeScript support** - Full TypeScript integration
- **Decorator support** - Works with Discord.js decorators

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `yarn biome:fix` to format and lint
5. Submit a pull request

## License

MIT License.
