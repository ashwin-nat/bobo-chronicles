import { resolvePlayer } from "./steam_resolver.js";
import { getRecentMatches, getHeroes, getMatchParsed } from "./opendota_api.js";
import { renderMatches, renderError, renderLoading } from "./match_view.js";
import { generateComicScript } from "./comic_generator.js";
import { renderComic } from "./comic_view.js";

const playerInput = document.getElementById("player-input");
const apiKeyInput = document.getElementById("api-key-input");
const fetchBtn = document.getElementById("fetch-btn");
const resultsEl = document.getElementById("results");
const playerInfoEl = document.getElementById("player-info");
const comicEl = document.getElementById("comic-output");

apiKeyInput.value = localStorage.getItem("steam_api_key") || "";
apiKeyInput.addEventListener("input", () => {
  localStorage.setItem("steam_api_key", apiKeyInput.value.trim());
});

let currentHeroMap = {};

async function handleGenerateComic(matchIds) {
  comicEl.innerHTML = '<p class="loading">Fetching match data and generating comic...</p>';
  comicEl.scrollIntoView({ behavior: "smooth" });
  try {
    const acts = await generateComicScript(matchIds, currentHeroMap);
    renderComic(acts, comicEl);
  } catch (err) {
    comicEl.innerHTML = `<p class="error">Failed to generate comic: ${err.message}</p>`;
  }
}

fetchBtn.addEventListener("click", async () => {
  const input = playerInput.value.trim();
  if (!input) return;

  fetchBtn.disabled = true;
  playerInfoEl.textContent = "";
  comicEl.innerHTML = "";
  renderLoading(resultsEl);

  try {
    const [player, heroMap] = await Promise.all([
      resolvePlayer(input, apiKeyInput.value.trim()),
      getHeroes(),
    ]);

    currentHeroMap = heroMap;
    playerInfoEl.textContent = `Player: ${player.name} — SteamID32: ${player.steam_id32}`;

    const matches = await getRecentMatches(player.steam_id32);
    const parsedFlags = await Promise.all(matches.map((m) => getMatchParsed(m.match_id)));
    matches.forEach((m, i) => { m.has_parsed = parsedFlags[i]; });
    renderMatches(matches, heroMap, resultsEl, handleGenerateComic);
  } catch (err) {
    renderError(err.message || "An unexpected error occurred.", resultsEl);
  } finally {
    fetchBtn.disabled = false;
  }
});

playerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") fetchBtn.click();
});
