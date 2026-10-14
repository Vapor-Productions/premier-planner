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
- **Commands:** `setup`, `team` (create, view, manage), `riot link` (RSO) and `riot link-backup`, `riot link-verify` (owner only, restricted to `BOT_DEV_IDS`), `language`, `profile view|update`, `info`, `help`, `ping`.
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
| Prefix commands | `messageCreate.ts` and the MessageContent intent still present. *(Needed?)* |
| Error log channel | Kept |
| Docker | Kept (app + postgres:16) |

`USER_MANAGEMENT.md` from the template is still in the repo (defect #10). The other defects haven't been re-checked.

## Intents
Guilds, GuildMessages, GuildMessageReactions, GuildVoiceStates, **GuildMembers (privileged)**, **MessageContent (privileged)**. GuildVoiceStates and MessageContent are probably unused.

## Env vars
In `.env.example`: `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`, `DISCORD_TOKEN`, `DATABASE_URL`, `ERROR_LOG_CHANNEL_ID`, `NODE_ENV`, `DEV_GUILD_IDS`, `BOT_DEV_IDS`, `DEBUG_MODE`.

**Read by the code but missing from `.env.example`:** `RIOT_API_KEY`, `RIOT_CLIENT_ID`, `RIOT_CLIENT_SECRET`, `RIOT_REDIRECT_URI`, `RIOT_LINK_BIND_HOST`, `VAL_API_KEY`, `MAINTENANCE_MODE`, `MAINTENANCE_COMMANDS`.

## Data model
PostgreSQL through Prisma 7 (`db push`). With real user data, migrations would be the safer choice.
- `User`: discordId, username, language, Riot PUUID, game name, tag line and link date
- `Team`: name, teamTag, guildId and leader, unique on (name, teamTag)
- `TeamMember`: join table between Team and User, with cascade delete

## Hosting
Docker Compose with app and postgres:16. The RSO callback needs a public URL that matches `RIOT_REDIRECT_URI`. *(fill in the host)*

## Decisions made
- Riot accounts are linked through official RSO, with a manual backup and verification path for bot devs.
- Team names are unique per name and tag combination, not per guild. *(Intended?)*
