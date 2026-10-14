# BOT.md — Premier Planner

> Brief updated 2026-10-15 for Riot VALORANT API / RSO compliance.

## Purpose
Organises Valorant Premier teams in Discord. Players link their Riot account through official Riot Sign-On (RSO), create and manage teams with team tags, and keep profiles in their chosen language.

## Repo and location
- GitHub: https://github.com/Vapor-Productions/premier-planner
- Local: `Discord-Projecten/premier_bot`
- Docs: https://docs.premierplanner.eu (local `Bot Documentation/premplan-docs`)

## Scope
- Serves many servers: global commands in production, `DEV_GUILD_IDS` for faster registration in development. Teams are scoped per guild.
- **Commands:** `setup`, `team` (create, view, manage), `riot link` (RSO, any player), `riot unlink` (clears stored Riot identity), `language`, `profile view|update`, `info`, `help`, `ping`.
- **Dev-only (disabled in production):** `riot link-backup`, `riot link-verify` — require `ALLOW_NON_RSO_LINK=true`, non-production `NODE_ENV`, and `BOT_DEV_IDS`.
- Riot Sign-On callback served by a built-in HTTP server (`utils/riot/linkServer.ts`) on `RIOT_LINK_BIND_HOST`.
- Maintenance mode (`MAINTENANCE_MODE`, `MAINTENANCE_COMMANDS`) and verbose logging (`DEBUG_MODE`).
- Premier roster lookup via HenrikDev (`premierApi.ts`, `VAL_API_KEY`) — not used for production account linking.

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
See `.env.example`. Notable: `RIOT_CLIENT_ID`, `RIOT_CLIENT_SECRET` (or `RIOT_API_KEY`), `RIOT_REDIRECT_URI`, `RIOT_LINK_BIND_HOST`, `VAL_API_KEY`, `ALLOW_NON_RSO_LINK` (dev only), `MAINTENANCE_MODE`, `MAINTENANCE_COMMANDS`.

## Data model
PostgreSQL through Prisma 7 (`db push`). With real user data, migrations would be the safer choice.
- `User`: discordId, username, language, Riot PUUID, game name, tag line and link date
- `Team`: name, teamTag, guildId and leader, unique on (name, teamTag)
- `TeamMember`: join table between Team and User, with cascade delete

## Hosting
Docker Compose with app and postgres:16. The RSO callback needs a public URL that matches `RIOT_REDIRECT_URI`. *(fill in the host)*

## Decisions made
- Production account linking is **RSO only**. Players opt in via `/riot link` with an in-bot disclaimer that linking makes Riot identity / team status visible in Discord servers where they use the bot.
- Non-RSO Henrik/name-tag linking is development-only behind `ALLOW_NON_RSO_LINK` and never available when `NODE_ENV=production`.
- RSO authorize scope is `openid offline_access` per Riot VALORANT docs.
- Team names are unique per name and tag combination, not per guild. *(Intended?)*

## Riot compliance notes
- Public user flow for reviewers (no Discord join required): https://docs.premierplanner.eu/guides/riot-account-linking
- Privacy policy covers Riot data and opt-in visibility.
- Product does not provide store checkers, cheats, real-time overlays, or betting.
