import type { User } from '../generated/prisma/client.js';
import { debugLog } from './debug.js';
import { prisma } from './prisma.js';

export type LinkedRiotPayload = {
  puuid: string;
  gameName: string;
  tagLine: string;
};

/** Used only when a Discord display name is missing for a new row; never store discordId here (shown in team roster). */
export const DISCORD_USERNAME_PLACEHOLDER = 'Discord user';

/**
 * Persists Riot account info from RSO or Henrik backup linking.
 * @returns `puuid_taken` if another Discord user already uses this PUUID.
 */
export async function saveLinkedRiotAccount(
  discordId: string,
  payload: LinkedRiotPayload,
  discordUsernameForCreate: string
): Promise<'ok' | 'puuid_taken'> {
  debugLog('userManager', 'saveLinkedRiotAccount', {
    discordId,
    puuid: `${payload.puuid.slice(0, 8)}…`,
    gameName: payload.gameName,
    tagLine: payload.tagLine,
  });
  const other = await prisma.user.findFirst({
    where: {
      riotPuuid: payload.puuid,
      NOT: { discordId },
    },
    select: { discordId: true },
  });
  if (other) {
    debugLog('userManager', 'saveLinkedRiotAccount -> puuid_taken');
    return 'puuid_taken';
  }

  const trimmed =
    typeof discordUsernameForCreate === 'string' ? discordUsernameForCreate.trim() : '';
  const usernameForCreate = trimmed.length > 0 ? trimmed : DISCORD_USERNAME_PLACEHOLDER;

  await prisma.user.upsert({
    where: { discordId },
    create: {
      discordId,
      username: usernameForCreate,
      riotPuuid: payload.puuid,
      riotGameName: payload.gameName,
      riotTagLine: payload.tagLine,
      riotLinkedAt: new Date(),
    },
    update: {
      ...(trimmed.length > 0 ? { username: trimmed } : {}),
      riotPuuid: payload.puuid,
      riotGameName: payload.gameName,
      riotTagLine: payload.tagLine,
      riotLinkedAt: new Date(),
      updatedAt: new Date(),
    },
  });
  debugLog('userManager', 'saveLinkedRiotAccount -> ok');
  return 'ok';
}

export interface UserData {
  discordId: string;
  username: string;
  language?: string;
}

/**
 * Ensures a user exists in the database. If the user doesn't exist, creates a new entry.
 * @param discordId - The Discord user ID
 * @param username - The Discord username
 * @returns The user object from the database
 */
export async function ensureUserExists(discordId: string, username: string): Promise<User> {
  debugLog('userManager', 'ensureUserExists', { discordId, username });
  try {
    // Try to find existing user
    let user = await prisma.user.findUnique({
      where: { discordId },
    });

    if (!user) {
      // Create new user if they don't exist
      user = await prisma.user.create({
        data: {
          discordId,
          username,
        },
      });
      console.log(`Created new user: ${username} (${discordId})`);
    } else {
      // Update username if it has changed
      if (user.username !== username) {
        user = await prisma.user.update({
          where: { discordId },
          data: {
            username,
            updatedAt: new Date(),
          },
        });
        console.log(`Updated username for user: ${username} (${discordId})`);
      }
    }

    debugLog('userManager', 'ensureUserExists ->', { userId: user.id });
    return user;
  } catch (error) {
    console.error('Error ensuring user exists:', error);
    throw error;
  }
}

/**
 * Gets a user from the database by Discord ID
 * @param discordId - The Discord user ID
 * @returns The user object or null if not found
 */
export async function getUserByDiscordId(discordId: string): Promise<User | null> {
  debugLog('userManager', 'getUserByDiscordId', { discordId });
  try {
    const user = await prisma.user.findUnique({
      where: { discordId },
    });
    debugLog('userManager', 'getUserByDiscordId ->', { found: Boolean(user) });
    return user;
  } catch (error) {
    console.error('Error getting user by Discord ID:', error);
    throw error;
  }
}

/**
 * Updates a user's language preference
 * @param discordId - The Discord user ID
 * @param language - The language code to set
 * @returns The updated user object
 */
export async function updateUserLanguage(discordId: string, language: string): Promise<User> {
  debugLog('userManager', 'updateUserLanguage', { discordId, language });
  try {
    const user = await prisma.user.update({
      where: { discordId },
      data: {
        language,
        updatedAt: new Date(),
      },
    });
    debugLog('userManager', 'updateUserLanguage -> ok');
    return user;
  } catch (error) {
    console.error('Error updating user language:', error);
    throw error;
  }
}

/**
 * Closes the Prisma client connection
 */
export async function closePrismaConnection(): Promise<void> {
  debugLog('userManager', 'closePrismaConnection');
  await prisma.$disconnect();
}
