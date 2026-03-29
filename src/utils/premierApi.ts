import axios from 'axios';

const PREMIER_BASE_URL = 'https://api.henrikdev.xyz/valorant/v1/premier';

export type PremierTeamLookupResult = {
  raw: unknown;
};

/**
 * Look up a Premier team by name and tag using HenrikDev's API.
 * Returns `null` if the team is not found (404), otherwise a wrapper with the raw payload.
 */
export async function fetchPremierTeamByNameAndTag(
  teamName: string,
  teamTag: string,
): Promise<PremierTeamLookupResult | null> {
  const encodedName = encodeURIComponent(teamName.trim());
  const encodedTag = encodeURIComponent(teamTag.trim());

  const url = `${PREMIER_BASE_URL}/${encodedName}/${encodedTag}`;

  try {
    const apiKey = process.env.VAL_API_KEY;
    const response = await axios.get(url, {
      headers: apiKey ? { Authorization: apiKey } : undefined,
    });
    return { raw: response.data };
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }

    throw error;
  }
}

