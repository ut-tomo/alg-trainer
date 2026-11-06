// SM-2 spaced repetition. State persisted in localStorage per set.
const DAY = 86400000;

export function loadState(setName, ids) {
  const raw = JSON.parse(localStorage.getItem(`srs:${setName}`) || "{}");
  for (const id of ids) raw[id] ??= { ef: 2.5, reps: 0, interval: 0, due: 0 };
  return raw;
}

export function saveState(setName, state) {
  localStorage.setItem(`srs:${setName}`, JSON.stringify(state));
}

// q: 0-5 quality grade
export function grade(card, q, now = Date.now()) {
  if (q < 3) {
    card.reps = 0;
    card.interval = 0;
    card.due = now + 60_000; // retry in a minute
  } else {
    card.reps += 1;
    card.interval = card.reps === 1 ? 1 : card.reps === 2 ? 6 : Math.round(card.interval * card.ef);
    card.due = now + card.interval * DAY;
  }
  card.ef = Math.max(1.3, card.ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  return card;
}

export function nextCard(state, now = Date.now()) {
  const entries = Object.entries(state).sort((a, b) => a[1].due - b[1].due);
  const due = entries.filter(([, c]) => c.due <= now);
  return { id: (due[0] ?? entries[0])[0], dueCount: due.length };
}
