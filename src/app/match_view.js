function isWin(match) {
  const isRadiant = match.player_slot < 128;
  return isRadiant ? match.radiant_win : !match.radiant_win;
}

export function renderMatches(matches, heroMap, container) {
  if (!matches.length) {
    container.innerHTML = '<p class="empty">No matches found.</p>';
    return;
  }

  const rows = matches
    .map((m) => {
      const hero = heroMap[m.hero_id] || `Hero #${m.hero_id}`;
      const win = isWin(m);
      return `
      <tr class="${win ? "win" : "loss"}">
        <td><a href="https://www.opendota.com/matches/${m.match_id}" target="_blank">${m.match_id}</a></td>
        <td>${hero}</td>
        <td>${m.kills}</td>
        <td>${m.deaths}</td>
        <td>${m.assists}</td>
        <td class="result">${win ? "Win" : "Loss"}</td>
      </tr>`;
    })
    .join("");

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Match ID</th>
          <th>Hero</th>
          <th>K</th>
          <th>D</th>
          <th>A</th>
          <th>Result</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

export function renderError(message, container) {
  container.innerHTML = `<p class="error">${message}</p>`;
}

export function renderLoading(container) {
  container.innerHTML = `<p class="loading">Loading...</p>`;
}
