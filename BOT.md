# BOT.md - Premier Planner engineering notes

## Purpose

Organizes Valorant Premier teams in Discord. Server administrators create Premier team records, users can link Riot account data, and `/team view` compares saved Discord rosters with live Premier roster data when HenrikDev exposes it.

## Repo and location

- GitHub: https://github.com/Vapor-Productions/premier-planner
- Runtime entry points: `src/main.ts` for production, `src/dev.ts` for development/hot reload.
- Primary operational docs: `README.md`.

## Scope

- Serves many servers: global commands in production, guild-scoped commands from `DEV_GUILD_IDS` when `NODE_ENV !== "production"`.
- Teams are stored with `guildId`, but uniqueness for `(name, teamTag)` is global in the current Prisma schema.
- Commands:
  - `setup`: administrator setup hub with Team Settings guidance.
  - `team create`, `team view`: administrator team creation and guild-scoped viewing.
  - `riot link`, `riot link-backup`, `riot link-verify`: Riot link flows.
  - `language`, `profile`, `info`, `help`, `ping`: utility commands.
- Riot Sign-On callback helpers are implemented in `src/utils/riot/linkServer.ts` and `src/utils/riot/rso.ts`; `/riot link` currently routes users to `/riot link-backup` instead of creating an OAuth session URL.
- Maintenance mode (`MAINTENANCE_MODE`, `MAINTENANCE_COMMANDS`) currently gates Riot command IDs only.
- Premier and Valorant lookups live in `src/utils/premierApi.ts` and use `VAL_API_KEY` when provided.

## Template parts

Built from `bot-template` with discordx 11, Prisma 7, Biome, Yarn scripts, Docker, and vapors-cli config.

| Part | Status |
|---|---|
| Core, slash commands, help | Kept |
| Database | Kept; schema replaced with `User`, `Team`, and `TeamMember` |
| Localization | Kept; `/language` persists `User.language`; default locale is `en` |
| SheetDB | Removed |
| Prefix commands | No command files use simple commands; `messageCreate.ts` and MessageContent intent remain from the template |
| Error log channel | Kept |
| Docker | Kept (app + postgres:16) |

## Intents

`src/bot.ts` requests Guilds, GuildMembers, GuildMessages, GuildMessageReactions, GuildVoiceStates, and MessageContent. GuildMembers is used for team owner/member fetching. MessageContent and GuildVoiceStates appear to be template carryovers unless future message or voice features use them.

## Env vars

Documented in `.env.example`:

- Discord/application: `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`, `DISCORD_TOKEN`, `DEV_GUILD_IDS`, `BOT_DEV_IDS`.
- Database/runtime: `DATABASE_URL`, `NODE_ENV`.
- Observability: `ERROR_LOG_CHANNEL_ID`, `DEBUG_MODE`.
- Riot/Premier: `VAL_API_KEY`, `RIOT_CLIENT_ID`, `RIOT_CLIENT_SECRET`, `RIOT_API_KEY`, `RIOT_REDIRECT_URI`, `RIOT_LINK_BIND_HOST`.
- Operations: `MAINTENANCE_MODE`, `MAINTENANCE_COMMANDS`.

## Data model

PostgreSQL through Prisma 7 (`prisma db push` scripts are checked in; no migration files are present).

- `User`: Discord ID, username, language, optional Riot PUUID, game name, tag line, and link date.
- `Team`: name, team tag, guild ID, optional leader relation to `User.discordId`, globally unique on `(name, teamTag)`.
- `TeamMember`: explicit join table between `Team` and `User`, cascade-deleted with either side.
- `prisma/sql/team_members_readable_view.sql`: optional SQL view for readable roster rows in SQL tools.

## Hosting

Docker Compose builds the app and starts a local postgres:16 service. The RSO callback server listens on the port/path from `RIOT_REDIRECT_URI` and host from `RIOT_LINK_BIND_HOST`; any public deployment that uses the callback helpers must route that public URL to the bot process.

## Decisions made

- Riot accounts are currently linked through HenrikDev backup/verification commands. Official RSO server-side helpers exist but are not connected to the active `/riot link` command flow.
- Linked Riot PUUIDs are unique across users to prevent one Valorant account from backing multiple Discord users.
- Team creation validates the Premier team name/tag with HenrikDev before saving.
- Roster verification is best-effort because HenrikDev may return an empty or unparseable Premier roster.
- Team name/tag uniqueness is global; change the Prisma unique constraint if same team names/tags must be allowed across different guilds.
