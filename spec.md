
# Bobo Chronicles — Technical Specification

## 1. Goal

Build a **static web application** that generates a narrative story based on a player's recent Dota 2 matches.

The app:

1. Resolves a **player name / profile URL** to **SteamID32**
2. Fetches **recent matches** from OpenDota
3. Displays matches in a table (with parsed status)
4. Lets the user select up to 5 **parsed matches**
5. Fetches full match details and generates a **text story** — act by act, scene by scene — from teamfights, objectives, and chat logs

---

## 2. Architecture

Pure **static web app** — no backend server.

All API calls are made directly from the browser.

```
Browser
   │
   ├── Steam Web API  (vanity name resolution)
   │
   └── OpenDota API   (matches, match details, heroes, player profile)
```

Built with **Vite** (ES modules, no framework). Deployable to Vercel, GitHub Pages, Netlify, Cloudflare Pages.

---

## 3. SteamID Resolution

OpenDota requires **SteamID32**. Users typically provide a profile name, URL, or SteamID64.

### Supported inputs

| Input type | Example |
|---|---|
| Steam profile URL (`/id/`) | `https://steamcommunity.com/id/notail` |
| Steam profile URL (`/profiles/`) | `https://steamcommunity.com/profiles/76561198000000000` |
| Steam vanity name | `notail`, `miracle-` |
| SteamID64 (17 digits) | `76561198000000000` |
| SteamID32 (≤10 digits) | `86745912` |

### Conversion

```
SteamID32 = SteamID64 − 76561197960265728
```

Vanity name → SteamID64 via Steam Web API (`ISteamUser/ResolveVanityURL`). Requires a **Steam API key**, entered by the user in the UI and persisted in `localStorage`.

---

## 4. API Dependencies

### Steam Web API

Used only for vanity resolution.

```
GET https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/
    ?key=STEAM_API_KEY&vanityurl=USERNAME
```

Requires a user-supplied Steam API key.

### OpenDota API

Base URL: `https://api.opendota.com/api`

| Endpoint | Used for |
|---|---|
| `GET /players/{id}/recentMatches` | Fetch recent match list |
| `GET /matches/{match_id}` | Check parsed status + fetch full match details |
| `GET /heroes` | Hero ID → name map |
| `GET /players/{id}` | Display name (personaname) |

No API key required for OpenDota. Soft rate limits apply; MVP fetches at most 10 recent matches.

---

## 5. Feature Set

### Feature 1 — Player Resolver (`steam_resolver.js`)

```
resolvePlayer(input, steamApiKey) → { steam_id32, steam_id64, name }
```

Handles all supported input types (see §3).

### Feature 2 — Fetch Recent Matches (`opendota_api.js`)

```
getRecentMatches(steamID32, limit = 10) → MatchSummary[]
getMatchParsed(matchId) → boolean
getMatchDetails(matchId) → MatchDetail
getHeroes() → { [hero_id]: name }
getPlayerProfile(steamId32) → string | null
```

### Feature 3 — Display Matches (`match_view.js`)

Renders a match table:

| | Match ID | Hero | K | D | A | Result | Parsed |
|---|---|---|---|---|---|---|---|
| ☐ | 7456123456 | Invoker | 12 | 4 | 8 | Win | Yes |

- Rows coloured Win/Loss
- Match ID links to `opendota.com/matches/{id}`
- Checkboxes only shown for parsed matches
- Up to **5 matches** selectable for story generation

### Feature 4 — Story Generator (`comic_generator.js`)

```
generateStoryScript(matchIds, heroMap, protagonistId) → Chapter[]
```

For each match, extracts key events in chronological order:

| Event type | Source | Trigger |
|---|---|---|
| First blood | `match.first_blood_time` + objectives | Always |
| Teamfight | `match.teamfights[]` | Always |
| Objective | `match.objectives[]` | Tower kills, barracks, Roshan, Aegis, Glyph |
| Post-fight pause | `match.pauses[]` | Pauses within 90s of a teamfight end |

Each event includes nearby **chat messages** (type `"chat"`, non-numeric, within a time window).

**Teamfight intensity:**

| Deaths | Label |
|---|---|
| ≥ 5 | MASSACRE |
| ≥ 3 | TEAMFIGHT |
| < 3 | SKIRMISH |

**Protagonist tracking:** the searched player is identified across all scenes. Their hero is highlighted, and scenes note whether they survived, died, scored first blood, or destroyed an objective.

### Feature 5 — Story Renderer (`comic_view.js`)

```
renderStory(chapters, container)
```

Renders chapters as styled HTML. Each chapter shows:

- Act number, Match ID (linked), duration, result, score
- Protagonist hero + side (Radiant/Dire)
- Ally and enemy hero lists
- Scenes in order: first blood → teamfights/objectives/pauses
- Chat dialogue with speaker names

---

## 6. Data Model

### Player

```js
{
  steam_id32: number,
  steam_id64: string | null,
  name: string
}
```

### MatchSummary (from OpenDota `/recentMatches`)

```js
{
  match_id: number,
  hero_id: number,
  kills: number,
  deaths: number,
  assists: number,
  player_slot: number,   // < 128 = Radiant
  radiant_win: boolean,
  has_parsed: boolean    // derived: added after checking /matches/{id}
}
```

### Chapter (generated)

```js
{
  matchId: number,
  duration: number,        // seconds
  radiantWin: boolean,
  radiantScore: number,
  direScore: number,
  radiantHeroes: string[],
  direHeroes: string[],
  protagonistHero: string | null,
  protagonistName: string | null,
  protagonistIsRadiant: boolean | null,
  scenes: Scene[]
}
```

### Scene types

- `first_blood` — `{ time, killerName, isProtagonistKill, chat }`
- `teamfight` — `{ time, intensity, deaths, duration, radiantParticipants, direParticipants, protagonistParticipated, protagonistDied, chat }`
- `objective` — `{ time, label, desc, icon, heroName, isProtagonistObj, chat }`
- `pause` — `{ time, chat }`

---

## 7. Project Structure

```
bobo-chronicles/
├── index.html
├── package.json
├── vite.config.js (optional)
└── src/
    ├── app/
    │   ├── main.js              # Entry point, event handlers
    │   ├── steam_resolver.js    # SteamID resolution
    │   ├── opendota_api.js      # OpenDota API calls
    │   ├── match_view.js        # Match table renderer
    │   ├── comic_generator.js   # Story/chapter builder
    │   └── comic_view.js        # Story HTML renderer
    └── styles/
        └── styles.css
```

---

## 8. UI Flow

```
1. User enters Steam name / URL / ID
2. User enters Steam API key (optional — only needed for vanity names)
3. Click "Fetch Matches"
   → resolvePlayer()
   → getHeroes() + getPlayerProfile()
   → getRecentMatches()
   → getMatchParsed() for each match
4. Match table renders
5. User selects 1–5 parsed matches
6. Click "Generate Story"
   → getMatchDetails() for each selected match
   → generateStoryScript()
   → renderStory()
```

---

## 9. Error Handling

| Condition | Message shown |
|---|---|
| Vanity name, no API key | "Steam API key required…" |
| Vanity lookup fails | `Could not resolve player "{name}".` |
| OpenDota network/rate error | `Failed to fetch matches (HTTP {status}).` |
| Match detail fetch fails | `Failed to fetch match {id} (HTTP {status}).` |
| Story generation fails | `Failed to generate story: {error}` |

---

## 10. Security Notes

The Steam API key is entered by the user and stored only in `localStorage`. It is sent directly to `api.steampowered.com` from the browser — **never proxied through a server**.

For public deployments where the key should not be user-supplied, options are:

1. Proxy vanity resolution through a serverless function / Cloudflare Worker
2. Pre-resolve all players offline

---

## 11. Configuration

```js
RECENT_MATCH_LIMIT = 10          // opendota_api.js
MAX_SELECTIONS = 5               // match_view.js
POST_FIGHT_PAUSE_WINDOW = 90     // comic_generator.js (seconds after teamfight end)
```

---

## 12. Non-Goals

- Authentication / user accounts
- Match caching / persistence
- LLM-generated prose (story is template-driven)
- Comic panel image rendering (story is text/HTML)
- Large-scale scraping
