import { resolvePlayer } from "./steam_resolver.js";
import { getRecentMatches, getHeroes, getMatchParsed } from "./opendota_api.js";
import { renderMatches, renderError, renderLoading } from "./match_view.js";

const playerInput = document.getElementById("player-input");
const apiKeyInput = document.getElementById("api-key-input");
const fetchBtn = document.getElementById("fetch-btn");
const resultsEl = document.getElementById("results");
const playerInfoEl = document.getElementById("player-info");

// Persist Steam API key in localStorage
apiKeyInput.value = localStorage.getItem("steam_api_key") || "";
apiKeyInput.addEventListener("input", () => {
  localStorage.setItem("steam_api_key", apiKeyInput.value.trim());
});

fetchBtn.addEventListener("click", async () => {
  const input = playerInput.value.trim();
  if (!input) return;

  fetchBtn.disabled = true;
  playerInfoEl.textContent = "";
  renderLoading(resultsEl);

  try {
    const [player, heroMap] = await Promise.all([
      resolvePlayer(input, apiKeyInput.value.trim()),
      getHeroes(),
    ]);

    playerInfoEl.textContent = `Player: ${player.name} — SteamID32: ${player.steam_id32}`;

    const matches = await getRecentMatches(player.steam_id32);
    const parsedFlags = await Promise.all(matches.map((m) => getMatchParsed(m.match_id)));
    matches.forEach((m, i) => { m.has_parsed = parsedFlags[i]; });
    renderMatches(matches, heroMap, resultsEl);
  } catch (err) {
    renderError(err.message || "An unexpected error occurred.", resultsEl);
  } finally {
    fetchBtn.disabled = false;
  }
});

playerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") fetchBtn.click();
});
