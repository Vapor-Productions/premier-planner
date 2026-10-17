# BOT.md — Premier Planner

> Brief written 2026-10-11 from the code in `premier_bot` (last commit 2026-03-29). Lines marked *(fill in)* could not be read from the code.

## Purpose
Organises Valorant Premier teams in Discord. Players link their Riot account through Riot Sign-On, create and manage teams with team tags, and keep profiles in their chosen language.

## Repo and location
- GitHub: https://github.com/Vapor-Productions/premier-planner
- Local: `Discord-Projecten/premier_bot`
- Docs: https://github.com/Vapor-Productions/docs (local `Bot Documentation/premplan-docs`)

## Scope
- Serves many servers: global commands in production, `DEV_GUILD_IDS` for faster registration in development. Teams are scoped per guild.
- **Commands:** `setup`, `team` (create, view, manage), `riot link` (RSO, open to every member once the `RIOT_*` variables are set), `riot unlink` (member opt-out), `riot link-backup` and `riot link-verify` (development-only non-RSO tools, disabled in production and restricted to `BOT_DEV_IDS` with `ALLOW_NON_RSO_LINK=true`), `language`, `profile view|update`, `info`, `help`, `ping`.
- Riot Sign-On callback served by a built-in HTTP server (`utils/riot/linkServer.ts`) on `RIOT_LINK_BIND_HOST`.
- Maintenance mode (`MAINTENANCE_MODE`, `MAINTENANCE_COMMANDS`) and verbose logging (`DEBUG_MODE`).
- Uses the Premier and Valorant APIs (`premierApi.ts`, `VAL_API_KEY`).

## Template parts
Built from `bot-template` (discordx 11, Prisma **7** with `@prisma/adapter-pg`, Biome, Yarn, Docker, vapors-cli config).

| Part | Status |
|---|---|
| Core, slash commands, help | Kept |
| Database | Kept, schema replaced (User, Team, TeamMember) |
| Localization | Kept (`/language`, `User.language`, default `en`) |
| SheetDB | Removed |
| Prefix commands | Removed (no `@SimpleCommand` existed), with `messageCreate.ts` and the intents only it used |
| Error log channel | Kept |
| Docker | Kept (app + postgres:16) |

The template defects were fixed on branch `fix/template-defects` (2026-10-14); `USER_MANAGEMENT.md` now describes this bot.

## Intents
All non-privileged intents are enabled (2026-10-15): Guilds, GuildModeration, GuildExpressions, GuildIntegrations, GuildWebhooks, GuildInvites, GuildVoiceStates, GuildMessages, GuildMessageReactions, GuildMessageTyping, GuildMessagePolls, DirectMessages, DirectMessageReactions, DirectMessageTyping, DirectMessagePolls, GuildScheduledEvents, AutoModerationConfiguration, AutoModerationExecution. No `Partials` are set because no code handles DM events; add `Partials.Channel` if a DM handler is ever written.

The privileged intents (GuildMembers, GuildPresences, MessageContent) stay off because nothing uses them. The member lookups in `team.ts` use `guild.members.fetch(id)`, a REST call that needs no intent, and there are no prefix commands.

Discord gates (as of 2026-06-10): **Privileged Intent Review** is required only if a privileged intent is enabled and the app exceeds **10,000 unique users** who can see it — not at 100 servers. Growing past **100 servers** still needs separate **App Verification**. The review doesn't apply while no privileged intent is enabled.

## Env vars
`.env.example`, `src/types/environment.d.ts` and the README table list the same set: `DISCORD_TOKEN`, `DATABASE_URL`, `ERROR_LOG_CHANNEL_ID`, `NODE_ENV`, `DEV_GUILD_IDS`, `BOT_DEV_IDS`, `DEBUG_MODE`, `RIOT_CLIENT_ID`, `RIOT_CLIENT_SECRET` (falls back to `RIOT_API_KEY`), `RIOT_REDIRECT_URI`, `RIOT_LINK_PORT`, `RIOT_LINK_BIND_HOST`, `ALLOW_NON_RSO_LINK`, `VAL_API_KEY`, `MAINTENANCE_MODE`, `MAINTENANCE_COMMANDS`.

## Data model
PostgreSQL through Prisma 7 with migrations in `prisma/migrations` (`0_init` is the baseline). Production runs `yarn start:migrate`, which applies pending migrations with `prisma migrate deploy` before starting.
- `User`: discordId, username, language, Riot PUUID, game name, tag line and link date; `/riot unlink` clears the Riot fields without deleting the Discord user row
- `Team`: name, teamTag, guildId and leader, unique on (name, teamTag)
- `TeamMember`: join table between Team and User, with cascade delete

## Hosting
Docker Compose with app and postgres:16 is for local runs: it applies migrations and binds Postgres to localhost. The RSO callback needs a public URL that matches `RIOT_REDIRECT_URI`. *(fill in the host)*

## Decisions made
- Riot accounts are linked through official RSO in production. The Discord prompt and callback page tell players that linking is an opt-in to sharing Riot identity and roster status with Premier Planner, and `/riot unlink` is the opt-out path.
- Manual Riot ID linking through HenrikDev is only a local/development escape hatch: it is blocked when `NODE_ENV=production`, requires `ALLOW_NON_RSO_LINK=true`, and only `BOT_DEV_IDS` users can run it.
- Team names are unique per name and tag combination, not per guild. *(Intended?)*
