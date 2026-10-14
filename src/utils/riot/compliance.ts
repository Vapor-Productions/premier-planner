/**
 * Riot VALORANT policy: player identity must be collected via RSO opt-in in production.
 * Non-RSO linking (HenrikDev name/tag) is only for local development with an explicit flag.
 */
export function isNonRsoLinkAllowed(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return process.env.ALLOW_NON_RSO_LINK?.trim() === 'true';
}
