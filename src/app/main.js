import { resolvePlayer } from "./steam_resolver.js";
import { getRecentMatches, getHeroes, getMatchParsed, getPlayerProfile } from "./opendota_api.js";
import { renderMatches, renderError, renderLoading } from "./match_view.js";
import { generateStoryScript } from "./comic_generator.js";
import { renderStory } from "./comic_view.js";

const playerInput = document.getElementById("player-input");
const apiKeyInput = document.getElementById("api-key-input");
const fetchBtn = document.getElementById("fetch-btn");
const resultsEl = document.getElementById("results");
const playerInfoEl = document.getElementById("player-info");
const storyEl = document.getElementById("story-output");

apiKeyInput.value = localStorage.getItem("steam_api_key") || "";
apiKeyInput.addEventListener("input", () => {
  localStorage.setItem("steam_api_key", apiKeyInput.value.trim());
});

let currentHeroMap = {};
let currentPlayerId = null;

async function handleGenerateStory(matchIds) {
  storyEl.innerHTML = '<p class="loading">Fetching match data and generating story...</p>';
  storyEl.scrollIntoView({ behavior: "smooth" });
  try {
    const chapters = await generateStoryScript(matchIds, currentHeroMap, currentPlayerId);
    renderStory(chapters, storyEl);
  } catch (err) {
    storyEl.innerHTML = `<p class="error">Failed to generate story: ${err.message}</p>`;
  }
}

fetchBtn.addEventListener("click", async () => {
  const input = playerInput.value.trim();
  if (!input) return;

  fetchBtn.disabled = true;
  playerInfoEl.textContent = "";
  storyEl.innerHTML = "";
  renderLoading(resultsEl);

  try {
    const [player, heroMap] = await Promise.all([
      resolvePlayer(input, apiKeyInput.value.trim()),
      getHeroes(),
    ]);

    currentHeroMap = heroMap;
    currentPlayerId = player.steam_id32;

    // Fetch display name from OpenDota profile (may be null for private profiles)
    const profileName = await getPlayerProfile(player.steam_id32);
    const displayName = profileName || player.name;
    playerInfoEl.textContent = `Player: ${displayName} — SteamID32: ${player.steam_id32}`;

    const matches = await getRecentMatches(player.steam_id32);
    const parsedFlags = await Promise.all(matches.map((m) => getMatchParsed(m.match_id)));
    matches.forEach((m, i) => { m.has_parsed = parsedFlags[i]; });
    renderMatches(matches, heroMap, resultsEl, handleGenerateStory);
  } catch (err) {
    renderError(err.message || "An unexpected error occurred.", resultsEl);
  } finally {
    fetchBtn.disabled = false;
  }
});

playerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") fetchBtn.click();
});
