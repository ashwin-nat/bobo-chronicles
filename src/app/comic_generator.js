import { getMatchDetails } from "./opendota_api.js";

const POST_FIGHT_PAUSE_WINDOW = 90;

function formatTime(seconds) {
  const abs = Math.abs(seconds);
  const sign = seconds < 0 ? "-" : "";
  const m = String(Math.floor(abs / 60)).padStart(2, "0");
  const s = String(abs % 60).padStart(2, "0");
  return `${sign}${m}:${s}`;
}

function teamLabel(teamNum) {
  if (teamNum === 2) return "Radiant";
  if (teamNum === 3) return "Dire";
  return "Unknown";
}

// Maps chat slot (0–9) to the corresponding match player object
function buildSlotToPlayer(players) {
  const map = {};
  for (const p of players) {
    const chatSlot = p.player_slot < 128 ? p.player_slot : (p.player_slot - 128) + 5;
    map[chatSlot] = p;
  }
  return map;
}

function getChatNear(chat, slotToPlayer, heroMap, time, before = 30, after = 60) {
  if (!chat) return [];
  return chat
    .filter(
      (m) =>
        m.type === "chat" &&
        m.key &&
        !/^\d+$/.test(String(m.key).trim()) &&
        m.time >= time - before &&
        m.time <= time + after
    )
    .map((m) => {
      const p = slotToPlayer[m.slot];
      const speakerName = p
        ? p.personaname || heroMap[p.hero_id] || m.unit || "?"
        : m.unit || "?";
      return { speakerName, text: m.key };
    });
}

function describeObjective(obj) {
  const key = obj.key || "";
  const team = teamLabel(obj.team);
  switch (obj.type) {
    case "building_kill": {
      if (key.includes("tower")) {
        const tier = key.match(/tower(\d)/)?.[1] || "?";
        const lane = key.includes("top") ? "Top" : key.includes("bot") ? "Bot" : "Mid";
        return { label: `TIER ${tier} TOWER FALLS`, desc: `${team} claims the ${lane} Tier ${tier} Tower`, icon: "🏰" };
      }
      if (key.includes("rax") || key.includes("barracks")) {
        const lane = key.includes("top") ? "Top" : key.includes("bot") ? "Bot" : "Mid";
        const type = key.includes("range") ? "Ranged" : "Melee";
        return { label: "BARRACKS DESTROYED", desc: `${team} razes the ${lane} ${type} Barracks`, icon: "💥" };
      }
      if (key.includes("throne") || key.includes("ancient")) {
        return { label: "THE ANCIENT FALLS", desc: `${team} destroys the Ancient`, icon: "👑" };
      }
      return { label: "STRUCTURE DESTROYED", desc: `${team} destroys a building`, icon: "💣" };
    }
    case "CHAT_MESSAGE_ROSHAN_KILL":
      return { label: "ROSHAN SLAIN", desc: `${team} slays Roshan`, icon: "🐉" };
    case "CHAT_MESSAGE_AEGIS":
      return { label: "AEGIS CLAIMED", desc: "A hero claims the Aegis of Immortality", icon: "🛡️" };
    case "CHAT_MESSAGE_DENIED_AEGIS":
      return { label: "AEGIS DENIED", desc: "The Aegis is denied — no second chance", icon: "⚡" };
    case "CHAT_MESSAGE_GLYPH_USED":
      return { label: "GLYPH ACTIVATED", desc: `${team} activates Glyph of Fortification`, icon: "🔮" };
    default:
      return { label: obj.type || "EVENT", desc: "", icon: "⚔️" };
  }
}

function extractKeyEvents(match) {
  const events = [];
  const teamfights = match.teamfights || [];

  for (const tf of teamfights) {
    events.push({ type: "teamfight", time: tf.start, endTime: tf.end, data: tf });
  }

  const showObjectiveTypes = new Set([
    "building_kill",
    "CHAT_MESSAGE_ROSHAN_KILL",
    "CHAT_MESSAGE_AEGIS",
    "CHAT_MESSAGE_DENIED_AEGIS",
    "CHAT_MESSAGE_GLYPH_USED",
  ]);
  for (const obj of match.objectives || []) {
    if (showObjectiveTypes.has(obj.type)) {
      events.push({ type: "objective", time: obj.time, data: obj });
    }
  }

  if (match.first_blood_time != null && match.first_blood_time > 0) {
    events.push({ type: "first_blood", time: match.first_blood_time, data: {} });
  }

  for (const pause of match.pauses || []) {
    if (pause.type !== "pause") continue;
    const isPostFight = teamfights.some(
      (tf) => pause.time >= tf.end && pause.time <= tf.end + POST_FIGHT_PAUSE_WINDOW
    );
    if (isPostFight) events.push({ type: "pause", time: pause.time, data: pause });
  }

  return events.sort((a, b) => a.time - b.time);
}

export async function generateStoryScript(matchIds, heroMap, protagonistId) {
  const matchDetails = await Promise.all(matchIds.map((id) => getMatchDetails(id)));
  const chapters = [];

  for (const match of matchDetails) {
    const players = match.players || [];
    const slotToPlayer = buildSlotToPlayer(players);

    const protagonist = protagonistId != null
      ? players.find((p) => p.account_id === protagonistId)
      : null;

    const protagonistIsRadiant = protagonist ? protagonist.player_slot < 128 : null;
    const protagonistHero = protagonist ? (heroMap[protagonist.hero_id] || `Hero #${protagonist.hero_id}`) : null;
    const protagonistName = protagonist?.personaname || null;

    const radiantHeroes = players.filter((p) => p.player_slot < 128).map((p) => heroMap[p.hero_id] || `#${p.hero_id}`);
    const direHeroes = players.filter((p) => p.player_slot >= 128).map((p) => heroMap[p.hero_id] || `#${p.hero_id}`);

    const scenes = [];

    for (const event of extractKeyEvents(match)) {
      const chatNear = getChatNear(match.chat, slotToPlayer, heroMap, event.time).slice(0, 5);

      if (event.type === "teamfight") {
        const tf = event.data;
        let radiantDeaths = 0, direDeaths = 0;
        const radiantParticipants = [], direParticipants = [];

        (tf.players || []).forEach((tfp, idx) => {
          const mp = players[idx];
          if (!mp || !tfp.participate) return;
          const isRadiant = mp.player_slot < 128;
          const heroName = heroMap[mp.hero_id] || `Hero #${mp.hero_id}`;
          const entry = {
            heroName,
            personaname: mp.personaname,
            died: tfp.died,
            isProtagonist: mp.account_id === protagonistId,
          };
          if (isRadiant) { radiantParticipants.push(entry); if (tfp.died) radiantDeaths++; }
          else { direParticipants.push(entry); if (tfp.died) direDeaths++; }
        });

        const deaths = radiantDeaths + direDeaths;
        const duration = event.endTime - event.time;
        const intensity = deaths >= 5 ? "MASSACRE" : deaths >= 3 ? "TEAMFIGHT" : "SKIRMISH";
        const allParticipants = [...radiantParticipants, ...direParticipants];
        const protagonistEntry = allParticipants.find((p) => p.isProtagonist);

        scenes.push({
          type: "teamfight",
          time: event.time,
          intensity,
          deaths,
          duration,
          radiantDeaths,
          direDeaths,
          radiantParticipants,
          direParticipants,
          protagonistParticipated: !!protagonistEntry,
          protagonistDied: protagonistEntry?.died ?? false,
          chat: chatNear,
        });
      } else if (event.type === "objective") {
        const obj = event.data;
        const desc = describeObjective(obj);
        let heroName = null;
        let isProtagonistObj = false;
        if (obj.player_slot != null) {
          const p = players.find((p) => p.player_slot === obj.player_slot);
          if (p) {
            heroName = heroMap[p.hero_id] || p.personaname;
            isProtagonistObj = p.account_id === protagonistId;
          }
        }
        scenes.push({ type: "objective", time: event.time, ...desc, heroName, isProtagonistObj, chat: chatNear });
      } else if (event.type === "first_blood") {
        const fbObj = (match.objectives || []).find((o) => o.type === "CHAT_MESSAGE_FIRSTBLOOD");
        let killerName = null;
        let isProtagonistKill = false;
        if (fbObj?.player_slot != null) {
          const p = players.find((p) => p.player_slot === fbObj.player_slot);
          if (p) {
            killerName = heroMap[p.hero_id] || p.personaname;
            isProtagonistKill = p.account_id === protagonistId;
          }
        }
        scenes.push({ type: "first_blood", time: event.time, killerName, isProtagonistKill, chat: chatNear });
      } else if (event.type === "pause") {
        const chatForPause = getChatNear(match.chat, slotToPlayer, heroMap, event.time, 10, 120).slice(0, 5);
        scenes.push({ type: "pause", time: event.time, chat: chatForPause });
      }
    }

    chapters.push({
      matchId: match.match_id,
      duration: match.duration,
      radiantWin: match.radiant_win,
      radiantScore: match.radiant_score,
      direScore: match.dire_score,
      radiantHeroes,
      direHeroes,
      protagonistHero,
      protagonistName,
      protagonistIsRadiant,
      scenes,
    });
  }

  return chapters;
}
