# User management

Every member who uses a slash command, button or menu gets a `User` row automatically. Commands can assume the row exists.

## Where it hooks in

`src/events/interactionCreate.ts` calls `ensureUserExists(user.id, user.username)` from `src/utils/userManager.ts` before `bot.executeInteraction`, for every interaction whose user is not a bot.

- No row yet: one is created with the Discord ID and username.
- Row exists with a different username: the username is updated.
- Otherwise nothing is written.

The bot guard matters. Without it, every bot that triggers an interaction would get a `User` row. There are no prefix commands, so there is no `messageCreate` handler; one used to run the same check for every message anybody sent.

## The row

```prisma
model User {
  id        String   @id @default(uuid())
  discordId String   @unique
  username  String
  language  String   @default("en")

  riotPuuid    String?   @unique
  riotGameName String?
  riotTagLine  String?
  riotLinkedAt DateTime?

  teamMemberships TeamMember[]
  leader          Team[]       @relation("TeamLeader")
}
```

`discordId` is the Discord-facing key; `id` is the uuid every relation points at. Relate to `user.id`, never to the Discord ID.

The Riot columns are filled by account linking (`saveLinkedRiotAccount`, from Riot Sign-On or the HenrikDev backup). `riotPuuid` is unique: linking a Riot account that another Discord user already linked returns `puuid_taken` instead of moving it.

## When it fails

A database error in `ensureUserExists` is logged and rethrown. `interactionCreate` catches it and hands it to the error handler, which reports it and replies to the member. The command itself does not run, because it might rely on the row.

## Helpers

- `ensureUserExists(discordId, username)`: create or update, returns the row.
- `getUserByDiscordId(discordId)`: the row or `null`.
- `updateUserLanguage(discordId, language)`: sets the language preference.
- `saveLinkedRiotAccount(discordId, payload, username)`: stores a linked Riot account.
- `closePrismaConnection()`: used by `utils/shutdown.ts` on SIGINT/SIGTERM.
