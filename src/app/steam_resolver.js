const STEAM_ID64_BASE = 76561197960265728n;

function isSteamID64(input) {
  return /^\d{17}$/.test(input);
}

function isSteamID32(input) {
  return /^\d{1,10}$/.test(input) && BigInt(input) < 1000000000n;
}

function steamID64ToSteamID32(id64) {
  return Number(BigInt(id64) - STEAM_ID64_BASE);
}

function parseProfileURL(input) {
  try {
    const url = new URL(input);
    if (!url.hostname.includes("steamcommunity.com")) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "profiles" && parts[1]) {
      return { type: "steamid64", value: parts[1] };
    }
    if (parts[0] === "id" && parts[1]) {
      return { type: "vanity", value: parts[1] };
    }
    return null;
  } catch {
    return null;
  }
}

async function resolveVanity(vanityName, steamApiKey) {
  if (!steamApiKey) {
    throw new Error(
      "Steam API key required to resolve vanity names. Please enter your key above."
    );
  }
  const url = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${steamApiKey}&vanityurl=${encodeURIComponent(vanityName)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Steam API request failed.");
  const data = await res.json();
  if (data.response.success !== 1) {
    throw new Error(`Could not resolve player "${vanityName}".`);
  }
  return data.response.steamid;
}

export async function resolvePlayer(input, steamApiKey) {
  const trimmed = input.trim();

  // SteamID32 — short numeric
  if (isSteamID32(trimmed)) {
    return { steam_id32: Number(trimmed), steam_id64: null, name: trimmed };
  }

  // SteamID64 — 17-digit numeric
  if (isSteamID64(trimmed)) {
    const id32 = steamID64ToSteamID32(trimmed);
    return { steam_id32: id32, steam_id64: trimmed, name: trimmed };
  }

  // Steam profile URL
  const parsed = parseProfileURL(trimmed);
  if (parsed) {
    if (parsed.type === "steamid64") {
      const id32 = steamID64ToSteamID32(parsed.value);
      return { steam_id32: id32, steam_id64: parsed.value, name: parsed.value };
    }
    if (parsed.type === "vanity") {
      const id64 = await resolveVanity(parsed.value, steamApiKey);
      const id32 = steamID64ToSteamID32(id64);
      return { steam_id32: id32, steam_id64: id64, name: parsed.value };
    }
  }

  // Vanity name fallback
  const id64 = await resolveVanity(trimmed, steamApiKey);
  const id32 = steamID64ToSteamID32(id64);
  return { steam_id32: id32, steam_id64: id64, name: trimmed };
}
