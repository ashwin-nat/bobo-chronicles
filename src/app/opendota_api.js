const BASE_URL = "https://api.opendota.com/api";
export const RECENT_MATCH_LIMIT = 10;

export async function getRecentMatches(steamID32, limit = RECENT_MATCH_LIMIT) {
  const res = await fetch(`${BASE_URL}/players/${steamID32}/recentMatches`);
  if (!res.ok) throw new Error(`Failed to fetch matches (HTTP ${res.status}).`);
  const matches = await res.json();
  return matches.slice(0, limit);
}

export async function getMatchParsed(matchId) {
  const res = await fetch(`${BASE_URL}/matches/${matchId}`);
  if (!res.ok) return false;
  const data = await res.json();
  return data?.od_data?.has_parsed ?? false;
}

export async function getMatchDetails(matchId) {
  const res = await fetch(`${BASE_URL}/matches/${matchId}`);
  if (!res.ok) throw new Error(`Failed to fetch match ${matchId} (HTTP ${res.status}).`);
  return res.json();
}

export async function getHeroes() {
  const res = await fetch(`${BASE_URL}/heroes`);
  if (!res.ok) return {};
  const heroes = await res.json();
  return Object.fromEntries(heroes.map((h) => [h.id, h.localized_name]));
}
