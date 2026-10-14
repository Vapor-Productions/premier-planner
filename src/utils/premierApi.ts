import axios from 'axios';

import { debugLog } from './debug.js';

const HENRIK_VALORANT_V1 = 'https://api.henrikdev.xyz/valorant/v1';
const PREMIER_BASE_URL = `${HENRIK_VALORANT_V1}/premier`;

function henrikAuthHeaders(): Record<string, string> | undefined {
  const apiKey = process.env.VAL_API_KEY;
  return apiKey ? { Authorization: apiKey } : undefined;
}

export type HenrikAccountByRiotId = {
  puuid: string;
  name: string | null;
  tag: string | null;
};

/**
 * Resolve PUUID from Riot ID (in-game name + tag) via HenrikDev `GET /valorant/v1/account/{name}/{tag}`.
 * Returns `null` if the account is not found (404).
 */
export async function fetchValorantAccountByRiotId(
  gameName: string,
  tagLine: string
): Promise<HenrikAccountByRiotId | null> {
  debugLog('premierApi', 'fetchValorantAccountByRiotId', { gameName, tagLine });
  const name = encodeURIComponent(gameName.trim());
  const tag = encodeURIComponent(tagLine.trim());
  const url = `${HENRIK_VALORANT_V1}/account/${name}/${tag}`;
  try {
    const response = await axios.get<{
      data?: { puuid?: string; name?: string | null; tag?: string | null };
    }>(url, {
      headers: henrikAuthHeaders(),
    });
    debugLog('premierApi', 'fetchValorantAccountByRiotId response', {
      url,
      status: response.status,
      data: response.data,
    });
    const d = response.data?.data;
    const puuid = d?.puuid;
    if (typeof puuid !== 'string' || !puuid) {
      debugLog('premierApi', 'fetchValorantAccountByRiotId -> null (no puuid in body)');
      return null;
    }
    const result: HenrikAccountByRiotId = {
      puuid,
      name: d?.name ?? null,
      tag: d?.tag ?? null,
    };
    debugLog('premierApi', 'fetchValorantAccountByRiotId -> ok', {
      puuid: `${puuid.slice(0, 8)}…`,
      name: result.name,
      tag: result.tag,
    });
    return result;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      debugLog('premierApi', 'fetchValorantAccountByRiotId -> null (404)');
      return null;
    }
    debugLog('premierApi', 'fetchValorantAccountByRiotId error', error);
    throw error;
  }
}

export type PremierTeamLookupResult = {
  raw: unknown;
};

/** Result of resolving a live Premier roster (Henrik may return an empty `member` array). */
export type PremierRosterLookup =
  | { kind: 'team_not_found' }
  | { kind: 'roster_not_exposed' }
  | { kind: 'ok'; roster: Set<string> };

function extractPremierTeamId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const data = (payload as Record<string, unknown>).data;
  if (!data || typeof data !== 'object') {
    return null;
  }
  const id = (data as Record<string, unknown>).id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * HenrikDev v1 Premier team payload: `data.member[]` (OpenAPI `v1_premier_team_data`) with `puuid`
 * per member. Some responses use `members` instead of `member`; treat a missing/non-array roster as
 * unparseable (`null`), not an empty roster.
 *
 * @see {@link https://docs.henrikdev.xyz/valorant/api-reference/premier}
 */
export function extractPremierMemberPuuids(payload: unknown): string[] | null {
  debugLog('premierApi', 'extractPremierMemberPuuids (input keys)', {
    type: typeof payload,
    keys:
      payload && typeof payload === 'object' ? Object.keys(payload as Record<string, unknown>) : [],
  });
  if (!payload || typeof payload !== 'object') {
    debugLog('premierApi', 'extractPremierMemberPuuids -> null (bad root)');
    return null;
  }
  const root = payload as Record<string, unknown>;
  const data = root.data;
  if (!data || typeof data !== 'object') {
    debugLog('premierApi', 'extractPremierMemberPuuids -> null (no data)');
    return null;
  }
  const d = data as Record<string, unknown>;
  const member = d.member ?? d.members;
  if (!Array.isArray(member)) {
    debugLog('premierApi', 'extractPremierMemberPuuids -> null (member not array)', {
      hasMember: 'member' in d,
      hasMembers: 'members' in d,
    });
    return null;
  }
  const out: string[] = [];
  for (const m of member) {
    if (!m || typeof m !== 'object') {
      continue;
    }
    const row = m as { puuid?: unknown; subject?: unknown };
    const puuid =
      typeof row.puuid === 'string' && row.puuid.length > 0
        ? row.puuid
        : typeof row.subject === 'string' && row.subject.length > 0
          ? row.subject
          : null;
    if (puuid) {
      out.push(puuid);
    }
  }
  debugLog('premierApi', 'extractPremierMemberPuuids ->', { count: out.length });
  return out;
}

export function normalizePuuid(puuid: string): string {
  return puuid.trim().toLowerCase();
}

/**
 * Resolves the live Premier roster for a team. Henrik often returns `data.member: []` even when the
 * team exists; we retry `GET /premier/{team_id}` when the first response includes a team UUID.
 */
export async function fetchPremierRosterLookup(
  teamName: string,
  teamTag: string
): Promise<PremierRosterLookup> {
  debugLog('premierApi', 'fetchPremierRosterLookup', { teamName, teamTag });
  const wrapped = await fetchPremierTeamByNameAndTag(teamName, teamTag);
  if (!wrapped) {
    debugLog('premierApi', 'fetchPremierRosterLookup -> team_not_found');
    return { kind: 'team_not_found' };
  }

  let ids = extractPremierMemberPuuids(wrapped.raw);
  if (ids === null) {
    debugLog('premierApi', 'fetchPremierRosterLookup -> roster_not_exposed (unparseable)');
    return { kind: 'roster_not_exposed' };
  }

  if (ids.length === 0) {
    const teamId = extractPremierTeamId(wrapped.raw);
    debugLog('premierApi', 'fetchPremierRosterLookup retry by team id', { teamId });
    if (teamId) {
      const byId = await fetchPremierTeamById(teamId);
      if (byId) {
        ids = extractPremierMemberPuuids(byId.raw);
      }
    }
  }

  if (ids === null || ids.length === 0) {
    debugLog('premierApi', 'fetchPremierRosterLookup -> roster_not_exposed (empty)');
    return { kind: 'roster_not_exposed' };
  }

  const roster = new Set(ids.map(normalizePuuid));
  debugLog('premierApi', 'fetchPremierRosterLookup -> ok', { rosterSize: roster.size });
  return { kind: 'ok', roster };
}

/**
 * Returns the set of Puuids on the live Premier roster for this team name/tag.
 * `null` if the team was not found (404), the payload had no parseable roster, or Henrik returned no members.
 */
export async function fetchPremierRosterPuuids(
  teamName: string,
  teamTag: string
): Promise<Set<string> | null> {
  const lookup = await fetchPremierRosterLookup(teamName, teamTag);
  if (lookup.kind === 'ok') {
    return lookup.roster;
  }
  debugLog('premierApi', 'fetchPremierRosterPuuids -> null', { kind: lookup.kind });
  return null;
}

/**
 * Whether this Puuid appears on the Premier roster returned by HenrikDev for the given team.
 */
export async function isPuuidOnPremierTeam(
  puuid: string,
  teamName: string,
  teamTag: string
): Promise<boolean | null> {
  debugLog('premierApi', 'isPuuidOnPremierTeam', {
    puuid: `${puuid.slice(0, 8)}…`,
    teamName,
    teamTag,
  });
  const roster = await fetchPremierRosterPuuids(teamName, teamTag);
  if (roster === null) {
    debugLog('premierApi', 'isPuuidOnPremierTeam -> null');
    return null;
  }
  const on = roster.has(normalizePuuid(puuid));
  debugLog('premierApi', 'isPuuidOnPremierTeam ->', on);
  return on;
}

/**
 * Look up a Premier team by name and tag using HenrikDev's API.
 * Returns `null` if the team is not found (404), otherwise a wrapper with the raw payload.
 */
export async function fetchPremierTeamByNameAndTag(
  teamName: string,
  teamTag: string
): Promise<PremierTeamLookupResult | null> {
  debugLog('premierApi', 'fetchPremierTeamByNameAndTag', { teamName, teamTag });
  const encodedName = encodeURIComponent(teamName.trim());
  const encodedTag = encodeURIComponent(teamTag.trim());

  const url = `${PREMIER_BASE_URL}/${encodedName}/${encodedTag}`;

  try {
    const response = await axios.get(url, {
      headers: henrikAuthHeaders(),
    });
    debugLog(
      'premierApi',
      'fetchPremierTeamByNameAndTag response',
      JSON.stringify({ url, body: response.data }, null, 2)
    );
    return { raw: response.data };
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      debugLog('premierApi', 'fetchPremierTeamByNameAndTag -> null (404)', { url });
      return null;
    }

    debugLog('premierApi', 'fetchPremierTeamByNameAndTag error', error);
    throw error;
  }
}

/**
 * Same as {@link fetchPremierTeamByNameAndTag} but uses Riot Premier team UUID (`data.id` from team payload).
 */
export async function fetchPremierTeamById(
  teamId: string
): Promise<PremierTeamLookupResult | null> {
  debugLog('premierApi', 'fetchPremierTeamById', { teamId: `${teamId.slice(0, 8)}…` });
  const id = teamId.trim();
  if (!id) {
    debugLog('premierApi', 'fetchPremierTeamById -> null (empty id)');
    return null;
  }
  const url = `${PREMIER_BASE_URL}/${encodeURIComponent(id)}`;

  try {
    const response = await axios.get(url, {
      headers: henrikAuthHeaders(),
    });
    debugLog(
      'premierApi',
      'fetchPremierTeamById response',
      JSON.stringify({ url, body: response.data }, null, 2)
    );
    return { raw: response.data };
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      debugLog('premierApi', 'fetchPremierTeamById -> null (404)', { url });
      return null;
    }

    debugLog('premierApi', 'fetchPremierTeamById error', error);
    throw error;
  }
}
