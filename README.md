<!-- <div>
  <p align="center">
    <a href="https://discordx.js.org" target="_blank" rel="nofollow">
      <img src="https://discordx.js.org/discordx.svg" width="546" />
    </a>
  </p>
  <p align="center">
    <a href="https://discordx.js.org/discord"
      ><img
        src="https://img.shields.io/discord/874802018361950248?color=5865F2&logo=discord&logoColor=white"
        alt="Discord server"
    /></a>
    <a href="https://www.npmjs.com/package/discordx"
      ><img
        src="https://img.shields.io/npm/v/discordx.svg?maxAge=3600"
        alt="NPM version"
    /></a>
    <a href="https://www.npmjs.com/package/discordx"
      ><img
        src="https://img.shields.io/npm/dt/discordx.svg?maxAge=3600"
        alt="NPM downloads"
    /></a>
    <a href="https://github.com/discordx-ts/discordx/actions"
      ><img
        src="https://github.com/discordx-ts/discordx/workflows/Build/badge.svg"
        alt="Build status"
    /></a>
    <a href="https://www.paypal.me/vijayxmeena"
      ><img
        src="https://img.shields.io/badge/donate-paypal-F96854.svg"
        alt="paypal"
    /></a>
  </p>
  <p align="center">
    <b> Create a discord bot with TypeScript and Decorators! </b>
  </p>
</div> -->

<!-- # 📖 Introduction

This project uses discordx and Discord.js to create a template for all future AT bots.

## 🏗 Development

```bash
yarn install
yarn dev
```

If you want to use [Nodemon](https://nodemon.io/) to auto-reload while in development:

```bash
yarn watch
```

## 💻 Production

```bash
yarn install --production
yarn build
yarn start
```

## 🐋 Docker

To start your application:

```bash
docker-compose up -d
```

To shut down your application:

```bash
docker-compose down
```

To view your application's logs:

```bash
docker-compose logs
```

For the full command list please view the [Docker Documentation](https://docs.docker.com/engine/reference/commandline/cli/).

## 📜 Documentation

- [discordx.js.org](https://discordx.js.org)
- [Tutorials (dev.to)](https://dev.to/samarmeena/series/14317)

## ☎️ Need help?

- [Check frequently asked questions](https://discordx.js.org/docs/faq)
- [Check examples](https://github.com/discordx-ts/discordx/tree/main/packages/discordx/examples)
- Ask in the community [Discord server](https://discordx.js.org/discord)

## 💖 Thank you

You can support [discordx](https://www.npmjs.com/package/discordx) by giving it a [GitHub](https://github.com/discordx-ts/discordx) star. --> -->

# Discord Bot Template

A Discord bot template built with [discordx](https://discordx.js.org) and TypeScript.

## Features

- ⚡ **TypeScript** - Write type-safe code
- 🎯 **Decorators** - Use decorators for commands and events
- 🔧 **Hot Reload** - Auto-reload commands during development
- 📦 **ESM** - Use ES modules
- 🐳 **Docker** - Containerized deployment
- 🗄️ **Database** - Prisma ORM with PostgreSQL
- 🛡️ **Error Handling** - Comprehensive error handling and anti-crash system
- 📊 **Error Logging** - Optional Discord channel error reporting
- 🧹 **Biome** - Fast linting, formatting, and import organization

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
| `RIOT_CLIENT_ID`, `RIOT_CLIENT_SECRET`, `RIOT_REDIRECT_URI` | for `/riot link` | Riot Sign-On credentials and the public callback URL. `RIOT_CLIENT_SECRET` falls back to `RIOT_API_KEY` |
| `RIOT_LINK_PORT` | no | Port the callback server listens on; defaults to the port in `RIOT_REDIRECT_URI`. Set it when a reverse proxy serves the public URL |
| `RIOT_LINK_BIND_HOST` | no | Interface the callback server binds to (default `0.0.0.0`); the path comes from `RIOT_REDIRECT_URI` |
| `VAL_API_KEY` | for `/riot link-backup` | HenrikDev Valorant API key, also sent with Premier lookups when set |
| `MAINTENANCE_MODE` | no | `1` pauses every command that checks maintenance |
| `MAINTENANCE_COMMANDS` | no | Comma-separated command ids to pause, e.g. `riot.link,riot.link-backup` |

## Discord Gateway Intents

The bot requests only the `Guilds` intent. Team roster commands resolve Discord members with
`guild.members.fetch(id)`, which is a REST lookup and does not require the privileged
`GuildMembers` gateway intent.

Do not add `GuildMembers`, `GuildMessages` or `MessageContent` unless the feature actually needs
gateway events. Bringing prefix or message-driven commands back would also need a `messageCreate`
handler that creates/updates user rows before command code runs.

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

# Apply database migrations
yarn prisma:migrate
```

## Database Migrations

The checked-in Prisma migration history is the source of truth for schema changes.

- `prisma/migrations/0_init` is the baseline for the current `User`, `Team` and `TeamMember` tables.
- `yarn prisma:migrate` runs `prisma migrate deploy`; it applies checked-in migrations only and
  requires `DATABASE_URL`.
- For schema edits, change `prisma/schema.prisma`, run `yarn prisma migrate dev --name <change>`,
  review the generated SQL, then commit the new migration directory.
- Production and panel starts should use `yarn start:migrate` or run `yarn prisma:migrate` before
  `yarn start`. The Docker Compose app command already runs `prisma migrate deploy` against its
  local `db` service.
- `yarn build` generates the Prisma client and compiles TypeScript. It does not apply migrations.

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
# Build and run with a local Postgres (migrations are applied on start)
docker compose up --build
```

## Scripts

- `yarn dev` - Start development server with hot reload
- `yarn watch` - Watch for file changes
- `yarn build` - Clear `build/`, generate the Prisma client and compile
- `yarn start` - Start production server
- `yarn start:migrate` - Apply pending migrations, then start (use this as the panel startup command)
- `yarn prisma:migrate` - Apply pending migrations (`prisma migrate deploy`)
- `yarn prisma migrate dev --name <change>` - Create a new migration after editing `prisma/schema.prisma`
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
├── utils/            # Utility functions
│   └── errorHandler.ts # Error handling system
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

MIT License - see [LICENSE](LICENSE) file for details.

## Support

You can support [discordx](https://www.npmjs.com/package/discordx) by giving it a [GitHub](https://github.com/discordx-ts/discordx) star.
