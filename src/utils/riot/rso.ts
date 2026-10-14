import crypto from 'node:crypto';

import axios from 'axios';

import { debugLog } from '../debug.js';

const AUTH_AUTHORIZE = 'https://auth.riotgames.com/authorize';
const AUTH_TOKEN = 'https://auth.riotgames.com/token';
const ACCOUNT_ME = 'https://americas.api.riotgames.com/riot/account/v1/accounts/me';

/** Riot VALORANT docs: authorize with `openid` + `offline_access`. */
const RSO_SCOPE = 'openid offline_access';

export interface RiotOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * RSO uses an OAuth client id and secret from the Riot Developer Portal.
 * `RIOT_API_KEY` is accepted as the client secret (same value you configure for the RSO app).
 */
export function getRiotOAuthConfig(): RiotOAuthConfig | null {
  const clientId = process.env.RIOT_CLIENT_ID?.trim();
  const clientSecret = (process.env.RIOT_CLIENT_SECRET ?? process.env.RIOT_API_KEY)?.trim();
  const redirectUri = process.env.RIOT_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) {
    debugLog('riot.rso', 'getRiotOAuthConfig -> null (missing env)');
    return null;
  }
  debugLog('riot.rso', 'getRiotOAuthConfig -> ok', {
    clientId: `${clientId.slice(0, 4)}…`,
    hasSecret: true,
    redirectUri,
  });
  return { clientId, clientSecret, redirectUri };
}

function base64Url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function createPkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = base64Url(crypto.randomBytes(32));
  const codeChallenge = base64Url(crypto.createHash('sha256').update(codeVerifier).digest());
  debugLog('riot.rso', 'createPkcePair');
  return { codeVerifier, codeChallenge };
}

export function buildAuthorizeUrl(
  config: RiotOAuthConfig,
  state: string,
  codeChallenge: string
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: RSO_SCOPE,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  const url = `${AUTH_AUTHORIZE}?${params.toString()}`;
  debugLog('riot.rso', 'buildAuthorizeUrl', { state: `${state.slice(0, 8)}…`, url });
  return url;
}

export async function exchangeAuthorizationCode(
  config: RiotOAuthConfig,
  code: string,
  codeVerifier: string
): Promise<{ access_token: string }> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier,
  });
  const basic = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  debugLog('riot.rso', 'exchangeAuthorizationCode request', { url: AUTH_TOKEN });
  const res = await axios.post<{
    access_token?: string;
    error?: string;
    error_description?: string;
  }>(AUTH_TOKEN, body.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
    },
    validateStatus: () => true,
  });
  const data = res.data;
  debugLog('riot.rso', 'exchangeAuthorizationCode response', {
    status: res.status,
    hasAccessToken: Boolean(data?.access_token),
    error: data?.error,
    error_description: data?.error_description,
  });
  if (!data?.access_token) {
    throw new Error(
      data?.error_description ?? data?.error ?? `Token exchange failed (${res.status})`
    );
  }
  return { access_token: data.access_token };
}

export interface RiotAccountMe {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export async function fetchRiotAccountMe(accessToken: string): Promise<RiotAccountMe> {
  debugLog('riot.rso', 'fetchRiotAccountMe request', { url: ACCOUNT_ME });
  const res = await axios.get<RiotAccountMe>(ACCOUNT_ME, {
    headers: { Authorization: `Bearer ${accessToken}` },
    validateStatus: () => true,
  });
  const data = res.data;
  debugLog('riot.rso', 'fetchRiotAccountMe response', {
    status: res.status,
    puuid: data?.puuid ? `${data.puuid.slice(0, 8)}…` : null,
    gameName: data?.gameName,
    tagLine: data?.tagLine,
  });
  if (!data?.puuid) {
    throw new Error(`Could not read Riot account (accounts/me) (${res.status})`);
  }
  return data;
}
