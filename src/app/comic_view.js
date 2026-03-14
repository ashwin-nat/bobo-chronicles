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

function renderBubbles(messages) {
  if (!messages?.length) return "";
  const bubblesHtml = messages
    .map(
      (m) => `
      <div class="speech-bubble">
        <span class="bubble-speaker">${esc(m.unit || "???")}</span>
        <span class="bubble-text">${esc(m.key)}</span>
      </div>`
    )
    .join("");
  return `<div class="panel-chat">${bubblesHtml}</div>`;
}

function renderMatchHeader(panel) {
  const winner = panel.radiantWin ? "RADIANT VICTORY" : "DIRE VICTORY";
  const winClass = panel.radiantWin ? "hdr-radiant" : "hdr-dire";

  const rHeroes = (panel.players || [])
    .filter((p) => p.player_slot < 128)
    .map((p) => esc(panel.heroMap[p.hero_id] || `#${p.hero_id}`))
    .join(" &middot; ");
  const dHeroes = (panel.players || [])
    .filter((p) => p.player_slot >= 128)
    .map((p) => esc(panel.heroMap[p.hero_id] || `#${p.hero_id}`))
    .join(" &middot; ");

  return `
    <div class="comic-panel panel-full panel-header ${winClass}">
      <div class="caption-box caption-top">Match ${panel.matchId}</div>
      <div class="panel-content">
        <div class="header-score">
          <span class="score-r">${panel.radiantScore ?? "?"}</span>
          <span class="score-sep"> &mdash; </span>
          <span class="score-d">${panel.direScore ?? "?"}</span>
        </div>
        <div class="header-result">${winner}</div>
        <div class="header-duration">${formatTime(panel.duration)}</div>
        <div class="header-teams">
          <div class="header-team team-r"><strong>Radiant</strong>${rHeroes || "—"}</div>
          <div class="header-team team-d"><strong>Dire</strong>${dHeroes || "—"}</div>
        </div>
      </div>
    </div>`;
}

function renderTeamfightPanel(panel) {
  const bgClass =
    panel.title === "MASSACRE"
      ? "panel-tf-massacre"
      : panel.title === "TEAMFIGHT"
      ? "panel-tf-teamfight"
      : "panel-tf-skirmish";

  const mkChips = (list) =>
    list.length
      ? list
          .map(
            (p) =>
              `<span class="hero-chip${p.died ? " dead" : ""}">${esc(p.heroName)}</span>`
          )
          .join("")
      : '<span class="hero-chip">—</span>';

  return `
    <div class="comic-panel panel-large ${bgClass}">
      <div class="caption-box caption-top">${formatTime(panel.time)}</div>
      <div class="panel-content">
        <div class="action-word">${esc(panel.title)}</div>
        <div class="tf-clash">
          <div class="tf-side-heroes">${mkChips(panel.radiantParticipants)}</div>
          <div class="tf-clash-icon">⚔</div>
          <div class="tf-side-heroes">${mkChips(panel.direParticipants)}</div>
        </div>
      </div>
      <div class="caption-box caption-bot">${esc(panel.caption)}</div>
      ${renderBubbles(panel.chatMessages)}
    </div>`;
}

function renderObjectivePanel(panel) {
  const isEpic = ["CHAT_MESSAGE_ROSHAN_KILL", "CHAT_MESSAGE_AEGIS"].includes(panel.subtype);
  const bgClass = panel.subtype === "CHAT_MESSAGE_ROSHAN_KILL" ? "panel-obj-roshan" : "panel-objective";

  return `
    <div class="comic-panel ${isEpic ? "panel-large" : "panel-medium"} ${bgClass}">
      <div class="caption-box caption-top">${formatTime(panel.time)}</div>
      <div class="panel-content">
        <div class="scene-icon">${panel.icon}</div>
        <div class="action-word" style="font-size:1.9rem">${esc(panel.title)}</div>
        ${panel.hero ? `<div class="obj-credit">${esc(panel.hero)}</div>` : ""}
      </div>
      <div class="caption-box caption-bot">${esc(panel.caption)}</div>
      ${renderBubbles(panel.chatMessages)}
    </div>`;
}

function renderFirstBloodPanel(panel) {
  return `
    <div class="comic-panel panel-medium panel-firstblood">
      <div class="caption-box caption-top">${formatTime(panel.time)}</div>
      <div class="panel-content">
        <div class="scene-icon">${panel.icon}</div>
        <div class="action-word">${esc(panel.title)}</div>
      </div>
      <div class="caption-box caption-bot">${esc(panel.caption)}</div>
      ${renderBubbles(panel.chatMessages)}
    </div>`;
}

function renderPausePanel(panel) {
  return `
    <div class="comic-panel panel-wide panel-pause">
      <div class="caption-box caption-top">${formatTime(panel.time)}</div>
      <div class="panel-content">
        <div class="action-word">${esc(panel.title)}</div>
      </div>
      <div class="caption-box caption-bot">${esc(panel.caption)}</div>
      ${renderBubbles(panel.chatMessages)}
    </div>`;
}

function renderPanel(panel) {
  switch (panel.type) {
    case "match_header": return renderMatchHeader(panel);
    case "teamfight":    return renderTeamfightPanel(panel);
    case "objective":    return renderObjectivePanel(panel);
    case "first_blood":  return renderFirstBloodPanel(panel);
    case "pause":        return renderPausePanel(panel);
    default:             return "";
  }
}

export function renderComic(acts, container) {
  if (!acts?.length) {
    container.innerHTML = '<p class="empty">No comic generated.</p>';
    return;
  }

  const actsHtml = acts
    .map((act) => `<div class="comic-act">${act.panels.map(renderPanel).join("")}</div>`)
    .join('<div class="act-divider">⚔ · ⚔ · ⚔</div>');

  container.innerHTML = `
    <div class="comic-title-page">
      <div class="comic-title">BOBO CHRONICLES</div>
      <div class="comic-subtitle">A tale of glory, grief, and tilted teammates</div>
    </div>
    <div class="comic-book">${actsHtml}</div>`;

  container.scrollIntoView({ behavior: "smooth" });
}
