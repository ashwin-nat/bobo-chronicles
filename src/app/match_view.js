function isWin(match) {
  const isRadiant = match.player_slot < 128;
  return isRadiant ? match.radiant_win : !match.radiant_win;
}

const MAX_SELECTIONS = 5;

export function renderMatches(matches, heroMap, container, onGenerateStory) {
  if (!matches.length) {
    container.innerHTML = '<p class="empty">No matches found.</p>';
    return;
  }

  const rows = matches
    .map((m) => {
      const hero = heroMap[m.hero_id] || `Hero #${m.hero_id}`;
      const win = isWin(m);
      const canSelect = m.has_parsed;
      const checkbox = canSelect
        ? `<input type="checkbox" class="match-select" data-match-id="${m.match_id}" />`
        : `<span class="no-select" title="No parsed data">—</span>`;
      return `
      <tr class="${win ? "win" : "loss"}">
        <td class="select-cell">${checkbox}</td>
        <td><a href="https://www.opendota.com/matches/${m.match_id}" target="_blank">${m.match_id}</a></td>
        <td>${hero}</td>
        <td>${m.kills}</td>
        <td>${m.deaths}</td>
        <td>${m.assists}</td>
        <td class="result">${win ? "Win" : "Loss"}</td>
        <td>${m.has_parsed ? "Yes" : "No"}</td>
      </tr>`;
    })
    .join("");

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th></th>
          <th>Match ID</th>
          <th>Hero</th>
          <th>K</th>
          <th>D</th>
          <th>A</th>
          <th>Result</th>
          <th>Parsed</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="story-actions">
      <span class="selection-hint">Select up to ${MAX_SELECTIONS} parsed matches to generate a story</span>
      <button id="generate-story-btn" disabled>Generate Story</button>
    </div>`;

  const generateBtn = container.querySelector("#generate-story-btn");
  const selectionHint = container.querySelector(".selection-hint");
  const checkboxes = [...container.querySelectorAll(".match-select")];

  function updateState() {
    const selected = checkboxes.filter((cb) => cb.checked);
    const count = selected.length;
    generateBtn.disabled = count === 0;
    selectionHint.textContent =
      count === 0
        ? `Select up to ${MAX_SELECTIONS} parsed matches to generate a story`
        : `${count} of ${MAX_SELECTIONS} matches selected`;
    checkboxes.forEach((cb) => {
      if (!cb.checked) cb.disabled = count >= MAX_SELECTIONS;
    });
  }

  checkboxes.forEach((cb) => cb.addEventListener("change", updateState));

  generateBtn.addEventListener("click", () => {
    const selected = checkboxes.filter((cb) => cb.checked).map((cb) => cb.dataset.matchId);
    if (selected.length && onGenerateStory) onGenerateStory(selected);
  });
}

export function renderError(message, container) {
  container.innerHTML = `<p class="error">${message}</p>`;
}

export function renderLoading(container) {
  container.innerHTML = `<p class="loading">Loading...</p>`;
}
