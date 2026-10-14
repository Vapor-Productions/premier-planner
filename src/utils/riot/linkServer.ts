import crypto from 'node:crypto';
import type { IncomingMessage, Server } from 'node:http';
import http from 'node:http';

import { debugLog } from '../debug.js';
import { prisma } from '../prisma.js';
import { DISCORD_USERNAME_PLACEHOLDER, saveLinkedRiotAccount } from '../userManager.js';
import {
  buildAuthorizeUrl,
  createPkcePair,
  exchangeAuthorizationCode,
  fetchRiotAccountMe,
  getRiotOAuthConfig,
  type RiotOAuthConfig,
} from './rso.js';

const SESSION_TTL_MS = 15 * 60 * 1000;

interface PendingSession {
  discordId: string;
  codeVerifier: string;
  expiresAt: number;
}

const pendingByState = new Map<string, PendingSession>();

let serverInstance: Server | null = null;
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function pruneExpired(): void {
  const now = Date.now();
  for (const [state, s] of pendingByState) {
    if (s.expiresAt < now) {
      pendingByState.delete(state);
    }
  }
}

function cryptoRandomState(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function isRiotLinkConfigured(): boolean {
  const ok = getRiotOAuthConfig() !== null;
  debugLog('riot.linkServer', 'isRiotLinkConfigured', ok);
  return ok;
}

export function createRiotLinkSession(
  discordId: string
): { authorizeUrl: string } | { error: string } {
  debugLog('riot.linkServer', 'createRiotLinkSession', { discordId });
  const config = getRiotOAuthConfig();
  if (!config) {
    return { error: 'not_configured' };
  }
  pruneExpired();
  const state = cryptoRandomState();
  const { codeVerifier, codeChallenge } = createPkcePair();
  pendingByState.set(state, {
    discordId,
    codeVerifier,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  const authorizeUrl = buildAuthorizeUrl(config, state, codeChallenge);
  debugLog('riot.linkServer', 'createRiotLinkSession -> authorizeUrl ready');
  return { authorizeUrl };
}

function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${title}</title></head><body>${body}</body></html>`;
}

/**
 * Where the callback server listens. The path always comes from `RIOT_REDIRECT_URI`. The port
 * comes from `RIOT_LINK_PORT` when set: behind an HTTPS reverse proxy the public URL has no port
 * (443) while the bot listens on the host's allocated port, and deriving it from the URL would
 * make the bot try to bind 443 itself.
 */
function parseRedirectParts(redirectUri: string): { port: number; pathname: string } {
  const u = new URL(redirectUri);
  const override = Number(process.env.RIOT_LINK_PORT?.trim());
  const port =
    Number.isInteger(override) && override > 0
      ? override
      : u.port !== ''
        ? Number(u.port)
        : u.protocol === 'https:'
          ? 443
          : 80;
  return { port, pathname: u.pathname || '/' };
}

async function handleCallback(
  config: RiotOAuthConfig,
  req: IncomingMessage,
  pathname: string
): Promise<{ status: number; body: string }> {
  const host = req.headers.host ?? 'localhost';
  const url = new URL(req.url ?? '/', `http://${host}`);
  debugLog('riot.linkServer', 'handleCallback', {
    pathname: url.pathname,
    expectedPathname: pathname,
    method: req.method,
  });
  if (url.pathname !== pathname) {
    return { status: 404, body: htmlPage('Not found', '<p>Not found</p>') };
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const err = url.searchParams.get('error');
  const errDesc = url.searchParams.get('error_description');

  if (err) {
    return {
      status: 400,
      body: htmlPage(
        'Riot Sign-On',
        `<p>Authorization failed: ${escapeHtml(err)}${errDesc ? ` — ${escapeHtml(errDesc)}` : ''}</p>`
      ),
    };
  }

  if (!code || !state) {
    return { status: 400, body: htmlPage('Riot Sign-On', '<p>Missing code or state.</p>') };
  }

  pruneExpired();
  const session = pendingByState.get(state);
  pendingByState.delete(state);
  if (!session || session.expiresAt < Date.now()) {
    return {
      status: 400,
      body: htmlPage(
        'Riot Sign-On',
        '<p>This link has expired. Run the link command in Discord again.</p>'
      ),
    };
  }

  try {
    const { access_token } = await exchangeAuthorizationCode(config, code, session.codeVerifier);
    const account = await fetchRiotAccountMe(access_token);

    const existingUser = await prisma.user.findUnique({
      where: { discordId: session.discordId },
      select: { username: true },
    });
    const usernameForCreate = existingUser?.username ?? DISCORD_USERNAME_PLACEHOLDER;

    const saved = await saveLinkedRiotAccount(
      session.discordId,
      {
        puuid: account.puuid,
        gameName: account.gameName,
        tagLine: account.tagLine,
      },
      usernameForCreate
    );
    if (saved === 'puuid_taken') {
      return {
        status: 409,
        body: htmlPage(
          'Already linked',
          '<p>This Riot account is already linked to another Discord user.</p>'
        ),
      };
    }

    return {
      status: 200,
      body: htmlPage(
        'Linked',
        `<p>Riot account <strong>${escapeHtml(account.gameName)}#${escapeHtml(account.tagLine)}</strong> linked. You can close this window and return to Discord.</p>`
      ),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[riot link]', e);
    return {
      status: 500,
      body: htmlPage('Error', `<p>Could not complete linking: ${escapeHtml(message)}</p>`),
    };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Starts the HTTP callback listener for RSO. Uses host/port/path from `RIOT_REDIRECT_URI`.
 */
export function startRiotLinkServer(): void {
  debugLog('riot.linkServer', 'startRiotLinkServer');
  const config = getRiotOAuthConfig();
  if (!config || serverInstance) {
    debugLog('riot.linkServer', 'startRiotLinkServer skip', {
      noConfig: !config,
      alreadyRunning: Boolean(serverInstance),
    });
    return;
  }

  const { port, pathname } = parseRedirectParts(config.redirectUri);

  cleanupInterval ??= setInterval(pruneExpired, 60_000);

  serverInstance = http.createServer((req, res) => {
    void (async () => {
      const { status, body } = await handleCallback(config, req, pathname);
      res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(body);
    })();
  });

  const listenHost = process.env.RIOT_LINK_BIND_HOST?.trim() || '0.0.0.0';
  serverInstance.listen(port, listenHost, () => {
    console.log(`[riot] RSO callback listening on http://${listenHost}:${port}${pathname}`);
  });

  serverInstance.on('error', (err) => {
    console.error('[riot] HTTP server error:', err);
  });
}

export function stopRiotLinkServer(): Promise<void> {
  debugLog('riot.linkServer', 'stopRiotLinkServer');
  return new Promise((resolve) => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
    if (!serverInstance) {
      resolve();
      return;
    }
    serverInstance.close(() => {
      serverInstance = null;
      resolve();
    });
  });
}
