
# Dota Chat Comic Generator — Technical Specification (MVP Phase 1)

## 1. Goal

Build a **static web application** that generates a comic/story based on chat logs from a player's recent Dota matches.

The MVP will only implement:

1. Resolve a **player name / profile URL** to **SteamID32**
2. Fetch **recent matches for that player from OpenDota**
3. Display the matches in a simple UI

No story generation yet.

---

# 2. Architecture

The app is a **pure static web app**.

No backend server.

All API calls are done **directly from the browser**.

```
Browser
   │
   ├── Steam Resolve API
   │
   └── OpenDota API
```

Hostable on:

* Vercel
* GitHub Pages
* Netlify
* Cloudflare Pages

---

# 3. Key Problem: SteamID Resolution

OpenDota requires:

```
SteamID32
```

Example:

```
86745912
```

But users typically know:

* Steam profile name
* Steam profile URL
* SteamID64

Therefore the app must resolve **user input → SteamID32**.

---

# 4. Supported User Inputs

The UI should accept:

### 1️⃣ Steam profile URL

Examples:

```
https://steamcommunity.com/id/playername
https://steamcommunity.com/profiles/76561198000000000
```

### 2️⃣ Steam vanity name

Example:

```
notail
miracle-
ceb
```

### 3️⃣ SteamID64

Example:

```
76561198000000000
```

---

# 5. SteamID Conversion

Steam IDs:

```
SteamID64 → SteamID32
```

Formula:

```
SteamID32 = SteamID64 - 76561197960265728
```

Example:

```
SteamID64: 76561198000000000
SteamID32: 39734272
```

---

# 6. Steam Vanity Resolution

To convert:

```
vanity name → SteamID64
```

Use Steam Web API:

```
ISteamUser/ResolveVanityURL
```

Endpoint:

```
https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=STEAM_API_KEY&vanityurl=USERNAME
```

Response:

```json
{
  "response": {
    "steamid": "76561198000000000",
    "success": 1
  }
}
```

---

# 7. API Dependencies

### Steam Web API

Used only for vanity resolution.

Requires:

```
Steam API Key
```

Docs:

[https://developer.valvesoftware.com/wiki/Steam_Web_API](https://developer.valvesoftware.com/wiki/Steam_Web_API)

---

### OpenDota API

Docs:

[https://docs.opendota.com/](https://docs.opendota.com/)

Used endpoints:

```
GET /players/{account_id}/recentMatches
```

Example:

```
https://api.opendota.com/api/players/12345678/recentMatches
```

---

# 8. Phase 1 Feature Set

### Feature 1 — Player Resolver

Input:

```
Player input string
```

Possible types:

```
steam URL
steam vanity name
steamid64
steamid32
```

Output:

```
SteamID32
```

---

### Feature 2 — Fetch Recent Matches

Input:

```
SteamID32
```

API call:

```
GET /players/{id}/recentMatches
```

Limit:

```
N = configurable
Default = 10
```

Output:

List of matches.

---

### Feature 3 — Display Matches

Display simple table:

```
Match ID
Hero
Kills
Deaths
Assists
Win/Loss
```

Example:

| Match      | Hero    | K  | D | A | Result |
| ---------- | ------- | -- | - | - | ------ |
| 7456123456 | Invoker | 12 | 4 | 8 | Win    |

---

# 9. Data Model

## Player

```
{
  steam_id32: number,
  steam_id64: string,
  name: string
}
```

---

## MatchSummary

From OpenDota:

```
{
  match_id: number,
  hero_id: number,
  kills: number,
  deaths: number,
  assists: number,
  player_slot: number,
  radiant_win: boolean
}
```

Derived:

```
result = win | loss
```

---

# 10. UI Flow

### Step 1 — Player Input

```
[ Enter player name or profile URL ]

[ Fetch Matches ]
```

---

### Step 2 — Resolve Player

Process:

```
input
   ↓
resolve SteamID64
   ↓
convert → SteamID32
```

---

### Step 3 — Fetch Matches

```
GET /players/{steamid32}/recentMatches
```

---

### Step 4 — Display Results

Simple table.

---

# 11. Project Structure

```
/src

index.html

/app
    main.js
    steam_resolver.js
    opendota_api.js
    match_view.js

/styles
    styles.css
```

---

# 12. Module Responsibilities

## steam_resolver.js

Resolves user input.

Exports:

```
resolvePlayer(input) → steamID32
```

Handles:

```
profile URLs
vanity names
steamid64
steamid32
```

---

## opendota_api.js

Handles API calls.

Exports:

```
getRecentMatches(steamID32, limit)
```

---

## match_view.js

Responsible for rendering match data.

---

# 13. Error Handling

Possible errors:

### Player not found

```
Steam vanity lookup failed
```

Show:

```
Could not resolve player.
```

---

### OpenDota API failure

```
Network failure
Rate limit
Invalid ID
```

Show:

```
Failed to fetch matches.
```

---

# 14. Rate Limiting

OpenDota has soft limits.

Strategy:

```
N <= 10 matches
```

Later phases will fetch:

```
GET /matches/{match_id}
```

But not in MVP.

---

# 15. Future Phases (Not in MVP)

### Phase 2

Fetch match details:

```
GET /matches/{match_id}
```

Extract:

```
chat logs
```

---

### Phase 3

Chat parser.

Detect:

```
toxicity
coordination
tilt
```

---

### Phase 4

Story generator.

Convert chat → narrative.

---

### Phase 5

Comic renderer.

Panels + speech bubbles.

---

# 16. Non-Goals (For Now)

Not implementing:

* authentication
* user accounts
* match caching
* large scale scraping
* LLM integration

---

# 17. Configuration

Constants:

```
RECENT_MATCH_LIMIT = 10
STEAM_API_KEY = env var
```

---

# 18. Security Note

Steam API key should **not be exposed publicly**.

Options:

1️⃣ Proxy through serverless function
2️⃣ Use Cloudflare Worker
3️⃣ Pre-resolve players

For MVP, a **simple serverless resolver endpoint** is recommended.

---

# 19. Success Criteria (Phase 1)

The app is successful if:

1. User enters **Steam name or profile URL**
2. App resolves **SteamID32**
3. App fetches **recent matches**
4. Matches render correctly
