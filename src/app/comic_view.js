function formatTime(seconds) {
  const abs = Math.abs(seconds);
  const sign = seconds < 0 ? "-" : "";
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderChat(messages) {
  if (!messages?.length) return "";
  return messages
    .map(
      (m) =>
        `<div class="story-chat"><span class="chat-speaker">${esc(m.speakerName)}:</span> <span class="chat-text">"${esc(m.text)}"</span></div>`
    )
    .join("");
}

function renderChapterHeader(chapter, actNum) {
  const winner = chapter.radiantWin ? "RADIANT VICTORY" : "DIRE VICTORY";
  const winClass = chapter.radiantWin ? "win-radiant" : "win-dire";

  let protagonistLine = "";
  if (chapter.protagonistHero) {
    const side = chapter.protagonistIsRadiant ? "Radiant" : "Dire";
    const label = chapter.protagonistName
      ? `${chapter.protagonistName} as ${chapter.protagonistHero}`
      : chapter.protagonistHero;
    protagonistLine = `<div class="story-protagonist">Our hero: <strong>${esc(label)}</strong>, fighting for ${esc(side)}</div>`;
  }

  const alliesRaw = chapter.protagonistIsRadiant === true
    ? chapter.radiantHeroes.filter((h) => h !== chapter.protagonistHero)
    : chapter.protagonistIsRadiant === false
    ? chapter.direHeroes.filter((h) => h !== chapter.protagonistHero)
    : [];
  const enemiesRaw = chapter.protagonistIsRadiant === true
    ? chapter.direHeroes
    : chapter.protagonistIsRadiant === false
    ? chapter.radiantHeroes
    : [];

  const alliesLine = alliesRaw.length
    ? `<div class="story-team allies"><span class="team-label">Allies:</span> ${alliesRaw.map(esc).join(" · ")}</div>`
    : "";
  const enemiesLine = enemiesRaw.length
    ? `<div class="story-team enemies"><span class="team-label">Enemies:</span> ${enemiesRaw.map(esc).join(" · ")}</div>`
    : "";

  return `
    <div class="story-chapter-header">
      <div class="chapter-act">ACT ${actNum}</div>
      <div class="chapter-match">Match <a href="https://www.opendota.com/matches/${chapter.matchId}" target="_blank">${chapter.matchId}</a></div>
      <div class="chapter-meta">
        <span class="chapter-duration">${formatTime(chapter.duration)}</span>
        <span class="chapter-result ${winClass}">${winner}</span>
        <span class="chapter-score">${chapter.radiantScore ?? "?"} – ${chapter.direScore ?? "?"}</span>
      </div>
      ${protagonistLine}
      ${alliesLine}
      ${enemiesLine}
    </div>`;
}

function renderScene(scene) {
  switch (scene.type) {
    case "first_blood": {
      let bodyLine;
      if (scene.killerName) {
        bodyLine = scene.isProtagonistKill
          ? `Our hero, <strong>${esc(scene.killerName)}</strong>, strikes first. The hunt has begun.`
          : `${esc(scene.killerName)} draws first blood. The battle is joined.`;
      } else {
        bodyLine = "First blood is drawn. The battle begins.";
      }
      return `
        <div class="story-scene scene-firstblood">
          <div class="scene-time">[${formatTime(scene.time)}]</div>
          <div class="scene-label">🩸 FIRST BLOOD</div>
          <div class="scene-body">${bodyLine}</div>
          ${renderChat(scene.chat)}
        </div>`;
    }

    case "teamfight": {
      const mkList = (list) =>
        list.map((p) => (p.died ? `<s>${esc(p.heroName)}</s>` : esc(p.heroName))).join(", ");

      const deathsLine =
        scene.deaths > 0
          ? `${scene.deaths} hero${scene.deaths !== 1 ? "es" : ""} fall in ${scene.duration}s.`
          : "No blood is spilled — but the tension is palpable.";

      let protagonistNote = "";
      if (scene.protagonistParticipated) {
        protagonistNote = scene.protagonistDied
          ? `<div class="protagonist-note">Our hero falls.</div>`
          : `<div class="protagonist-note">Our hero survives.</div>`;
      }

      const radiantLine = scene.radiantParticipants.length
        ? `<div class="scene-teams"><span class="team-r">Radiant:</span> ${mkList(scene.radiantParticipants)}</div>`
        : "";
      const direLine = scene.direParticipants.length
        ? `<div class="scene-teams"><span class="team-d">Dire:</span> ${mkList(scene.direParticipants)}</div>`
        : "";

      return `
        <div class="story-scene scene-${scene.intensity.toLowerCase()}">
          <div class="scene-time">[${formatTime(scene.time)}]</div>
          <div class="scene-label">⚔ ${esc(scene.intensity)}</div>
          <div class="scene-body">${deathsLine}</div>
          ${radiantLine}
          ${direLine}
          ${protagonistNote}
          ${renderChat(scene.chat)}
        </div>`;
    }

    case "objective": {
      const heroLine = scene.heroName
        ? scene.isProtagonistObj
          ? ` Our hero, <strong>${esc(scene.heroName)}</strong>, leads the charge.`
          : ` ${esc(scene.heroName)} seals the deal.`
        : "";
      return `
        <div class="story-scene scene-objective">
          <div class="scene-time">[${formatTime(scene.time)}]</div>
          <div class="scene-label">${scene.icon} ${esc(scene.label)}</div>
          <div class="scene-body">${esc(scene.desc)}.${heroLine}</div>
          ${renderChat(scene.chat)}
        </div>`;
    }

    case "pause": {
      if (!scene.chat?.length) return "";
      return `
        <div class="story-scene scene-pause">
          <div class="scene-time">[${formatTime(scene.time)}]</div>
          <div class="scene-label">⏸ THE GAME PAUSES</div>
          <div class="scene-body">Time stops. Words are exchanged across the rift.</div>
          ${renderChat(scene.chat)}
        </div>`;
    }

    default:
      return "";
  }
}

export function renderStory(chapters, container) {
  if (!chapters?.length) {
    container.innerHTML = '<p class="empty">No story generated.</p>';
    return;
  }

  const chaptersHtml = chapters
    .map(
      (ch, i) => `
      <div class="story-chapter">
        ${renderChapterHeader(ch, i + 1)}
        <div class="story-scenes">${ch.scenes.map(renderScene).join("")}</div>
      </div>`
    )
    .join('<div class="chapter-divider">— ⚔ —</div>');

  container.innerHTML = `
    <div class="story-container">
      <div class="story-title">BOBO CHRONICLES</div>
      <div class="story-tagline">A tale of glory, grief, and tilted teammates</div>
      ${chaptersHtml}
    </div>`;

  container.scrollIntoView({ behavior: "smooth" });
}
