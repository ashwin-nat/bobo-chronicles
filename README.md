# Bobo Chronicles

A static web app that turns your Dota 2 match history into a narrative story — teamfights, objectives, and all the chat drama.

Enter a Steam profile, pick some recent matches, and get a match-by-match chronicle of what went down.

---

## Features

- Resolves any Steam input: profile URL, vanity name, SteamID64, or SteamID32
- Fetches your 10 most recent matches via the OpenDota API
- Shows match results with K/D/A, hero, and parsed status
- Select up to 5 **parsed** matches and generate a story
- Story covers: first blood, teamfights (SKIRMISH / TEAMFIGHT / MASSACRE), tower kills, barracks, Roshan, Aegis, pauses, and chat logs
- Your hero is tracked as the protagonist throughout

---

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

---

## Usage

1. Enter a Steam profile URL, vanity name, or Steam ID in the input field
2. If using a vanity name, enter your [Steam API key](https://steamcommunity.com/dev/apikey) — it's saved in your browser
3. Click **Fetch Matches**
4. Check up to 5 matches that show **Parsed: Yes**
5. Click **Generate Story**

Matches without parsed data can't be used for story generation (OpenDota only has chat/teamfight data for parsed matches).

---

## Tech Stack

- Vanilla JS + HTML/CSS — no framework
- [Vite](https://vitejs.dev/) for dev server and bundling
- [OpenDota API](https://docs.opendota.com/) — match data (no key required)
- [Steam Web API](https://developer.valvesoftware.com/wiki/Steam_Web_API) — vanity name resolution (key required)

---

## Project Structure

```
src/
  app/
    main.js              # Entry point
    steam_resolver.js    # Steam ID resolution
    opendota_api.js      # OpenDota API calls
    match_view.js        # Match table
    comic_generator.js   # Story builder
    comic_view.js        # Story renderer
  styles/
    styles.css
index.html
```

---

## Deployment

The app is fully static — build with `npm run build` and deploy the `dist/` folder anywhere:

- Vercel
- GitHub Pages
- Netlify
- Cloudflare Pages

No server required.
