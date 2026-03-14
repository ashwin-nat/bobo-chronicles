import { getMatchDetails } from "./opendota_api.js";

const POST_FIGHT_PAUSE_WINDOW = 90; // seconds after teamfight ends to count as post-fight pause

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
        return { label: "THE ANCIENT FALLS", desc: `${team} destroys the Ancient — GG!`, icon: "👑" };
      }
      return { label: "STRUCTURE DESTROYED", desc: `${team} destroys a building`, icon: "💣" };
    }
    case "CHAT_MESSAGE_ROSHAN_KILL":
      return { label: "ROSHAN SLAIN", desc: `${team} slays the Roshan`, icon: "🐉" };
    case "CHAT_MESSAGE_AEGIS":
      return { label: "AEGIS CLAIMED", desc: "A hero claims the Aegis of Immortality", icon: "🛡️" };
    case "CHAT_MESSAGE_DENIED_AEGIS":
      return { label: "AEGIS DENIED!", desc: "The Aegis is denied — no second chance", icon: "⚡" };
    case "CHAT_MESSAGE_GLYPH_USED":
      return { label: "GLYPH ACTIVATED", desc: `${team} activates Glyph of Fortification`, icon: "🔮" };
    default:
      return { label: obj.type || "EVENT", desc: "", icon: "⚔️" };
  }
}

function getChatNear(chat, time, before = 30, after = 60) {
  if (!chat) return [];
  return chat.filter(
    (m) =>
      m.type === "chat" &&
      m.key &&
      !/^\d+$/.test(String(m.key).trim()) &&
      m.time >= time - before &&
      m.time <= time + after
  );
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
    if (isPostFight) {
      events.push({ type: "pause", time: pause.time, data: pause });
    }
  }

  return events.sort((a, b) => a.time - b.time);
}

function buildTeamfightPanel(event, match, heroMap) {
  const tf = event.data;
  const players = match.players || [];
  let radiantDeaths = 0, direDeaths = 0;
  const radiantParticipants = [], direParticipants = [];

  (tf.players || []).forEach((tfp, idx) => {
    const mp = players[idx];
    if (!mp || !tfp.participate) return;
    const isRadiant = mp.player_slot < 128;
    const heroName = heroMap[mp.hero_id] || `Hero #${mp.hero_id}`;
    const entry = { heroName, personaname: mp.personaname || heroName, died: tfp.died };
    if (isRadiant) {
      radiantParticipants.push(entry);
      if (tfp.died) radiantDeaths++;
    } else {
      direParticipants.push(entry);
      if (tfp.died) direDeaths++;
    }
  });

  const deaths = radiantDeaths + direDeaths;
  const duration = event.endTime - event.time;
  const intensity = deaths >= 5 ? "MASSACRE" : deaths >= 3 ? "TEAMFIGHT" : "SKIRMISH";
  const caption =
    deaths === 0
      ? "No blood is spilled — but the tension is palpable."
      : `${deaths} hero${deaths !== 1 ? "es" : ""} fall in ${duration}s of chaos`;

  return {
    type: "teamfight",
    time: event.time,
    title: intensity,
    caption,
    radiantDeaths,
    direDeaths,
    radiantParticipants,
    direParticipants,
    chatMessages: getChatNear(match.chat, event.time).slice(0, 3),
  };
}

function buildObjectivePanel(event, match, heroMap) {
  const obj = event.data;
  const desc = describeObjective(obj);
  let hero = null;
  if (obj.player_slot != null) {
    const p = (match.players || []).find((p) => p.player_slot === obj.player_slot);
    if (p) hero = heroMap[p.hero_id] || p.personaname;
  }
  return {
    type: "objective",
    subtype: obj.type,
    time: event.time,
    title: desc.label,
    caption: desc.desc,
    icon: desc.icon,
    hero,
    chatMessages: getChatNear(match.chat, event.time).slice(0, 2),
  };
}

function buildFirstBloodPanel(event, match, heroMap) {
  const fbObj = (match.objectives || []).find((o) => o.type === "CHAT_MESSAGE_FIRSTBLOOD");
  let killerName = null;
  if (fbObj?.player_slot != null) {
    const p = (match.players || []).find((p) => p.player_slot === fbObj.player_slot);
    if (p) killerName = heroMap[p.hero_id] || p.personaname;
  }
  return {
    type: "first_blood",
    time: event.time,
    title: "FIRST BLOOD",
    caption: killerName
      ? `${killerName} draws first blood at ${formatTime(event.time)}`
      : `First blood at ${formatTime(event.time)} — the battle begins!`,
    icon: "🩸",
    chatMessages: getChatNear(match.chat, event.time).slice(0, 2),
  };
}

function buildPausePanel(event, match) {
  return {
    type: "pause",
    time: event.time,
    title: "THE BATTLE PAUSES",
    caption: "Time stops. Words are exchanged across the rift.",
    chatMessages: getChatNear(match.chat, event.time, 10, 120).slice(0, 5),
  };
}

export async function generateComicScript(matchIds, heroMap) {
  const matchDetails = await Promise.all(matchIds.map((id) => getMatchDetails(id)));
  const acts = [];

  for (const match of matchDetails) {
    const panels = [];

    panels.push({
      type: "match_header",
      matchId: match.match_id,
      duration: match.duration,
      radiantWin: match.radiant_win,
      radiantScore: match.radiant_score,
      direScore: match.dire_score,
      players: match.players || [],
      heroMap,
    });

    for (const event of extractKeyEvents(match)) {
      let panel;
      if (event.type === "teamfight") panel = buildTeamfightPanel(event, match, heroMap);
      else if (event.type === "objective") panel = buildObjectivePanel(event, match, heroMap);
      else if (event.type === "first_blood") panel = buildFirstBloodPanel(event, match, heroMap);
      else if (event.type === "pause") panel = buildPausePanel(event, match);
      if (panel) panels.push(panel);
    }

    acts.push({ matchId: match.match_id, panels });
  }

  return acts;
}
