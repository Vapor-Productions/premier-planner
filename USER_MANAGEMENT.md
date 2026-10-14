# User and Riot Account Management

## Overview

Premier Planner keeps one `User` row per Discord user. That row stores the Discord identity, language preference, and optional Riot account link used by Premier team verification.

Most slash-command interactions pass through `src/events/interactionCreate.ts`, which calls `ensureUserExists` before handing the interaction to discordx. Commands that create or link records also call the same helper for target users so team and Riot operations have a database row to reference.

## How It Works

### Automatic User Registration

1. `interactionCreate` ignores bot users and calls `ensureUserExists(interaction.user.id, interaction.user.username)` for human users.
2. If no row exists, `ensureUserExists` creates it with `discordId` and `username`.
3. If the row exists but the Discord username changed, the helper updates `username` and `updatedAt`.
4. The command then runs with a database row available for language, Riot, or team operations.

### Database Schema

The relevant Prisma models are:

```prisma
model User {
  id        String   @id @default(uuid())
  discordId String   @unique
  username  String
  language  String   @default("en")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  riotPuuid    String?   @unique
  riotGameName String?
  riotTagLine  String?
  riotLinkedAt DateTime?

  teamMemberships TeamMember[]
  leader          Team[]       @relation("TeamLeader")
}

model Team {
  id       String @id @default(uuid())
  name     String
  teamTag  String @default("")
  guildId  String
  leaderId String?

  @@index([guildId])
  @@unique([name, teamTag])
}

model TeamMember {
  id     String @id @default(uuid())
  teamId String
  userId String

  @@unique([teamId, userId])
}
```

### Constraints

- `discordId` is unique and is the stable lookup key for Discord users.
- `riotPuuid` is unique when present. `saveLinkedRiotAccount` returns `puuid_taken` instead of overwriting another Discord user's Riot link.
- `Team.leaderId` points at `User.discordId`, while `TeamMember.userId` points at `User.id`.
- `Team` uniqueness is currently global on `(name, teamTag)`, not per guild.

### Key Functions

#### `ensureUserExists(discordId: string, username: string)`

This is the main function that:

- Checks for an existing row by Discord ID.
- Creates a user row if one does not exist.
- Updates the stored username when it changed.
- Returns the Prisma `User` object.

#### `saveLinkedRiotAccount(discordId, payload, discordUsernameForCreate)`

Persists Riot link details from either the callback server or HenrikDev backup lookup:

- Verifies no other Discord user already owns the target PUUID.
- Upserts the user row.
- Stores `riotPuuid`, `riotGameName`, `riotTagLine`, and `riotLinkedAt`.
- Returns `'ok'` or `'puuid_taken'`.

#### `getUserByDiscordId(discordId: string)`

A utility function to retrieve a user by their Discord ID.

#### `updateUserLanguage(discordId: string, language: string)`

Updates the user's `language` and `updatedAt` fields. `/language` calls `ensureUserExists` before this update.

## Implementation Details

### Event Handler Integration

The main integration point is `src/events/interactionCreate.ts`:

```typescript
if (interaction.user && !interaction.user.bot) {
  await ensureUserExists(interaction.user.id, interaction.user.username);
}

await bot.executeInteraction(interaction);
```

Target-user flows also ensure rows before creating dependent records:

- `/team create` ensures the chosen team owner and selected members exist before creating `Team` and `TeamMember` rows.
- `/riot link-verify` ensures the target user exists before linking a Riot account.
- The Riot callback server uses an existing username when available and falls back to `"Discord user"` only when it has to create a row without Discord member context.

### Error Handling

- User helpers log database errors and rethrow.
- `interactionCreate` catches errors from the helper or command execution and routes them through `errorHandler`.
- Discord "unknown interaction" and "already acknowledged" errors are logged as lightweight warnings and do not enter the full error pipeline.

### Graceful Shutdown

`src/main.ts` disconnects Prisma and stops the Riot callback server on `SIGINT` and `SIGTERM`:

```typescript
process.on("SIGINT", async () => {
  console.log("Shutting down bot...");
  await stopRiotLinkServer();
  await closePrismaConnection();
  process.exit(0);
});
```

## Usage in Commands

When adding a command that writes user-owned data:

```typescript
const user = await ensureUserExists(
  interaction.user.id,
  interaction.user.username
);

await prisma.teamMember.create({
  data: {
    teamId,
    userId: user.id,
  },
});
```

Use the correct user key for the relation:

- Use `User.id` for `TeamMember.userId`.
- Use `User.discordId` for `Team.leaderId`.
- Use `discordId` for lookups from Discord interactions.
