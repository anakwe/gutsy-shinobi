const DEFAULT_MAX = 10;
const DEFAULT_FALLBACK_NAME = "SHINOBI";
const MAX_STORED_BYTES = 64 * 1024;
const MAX_ENTRIES = 1000;

export function getBrowserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function safeJsonParse(raw, fallback) {
  if (typeof raw !== "string" || raw.length > MAX_STORED_BYTES) return fallback;
  try {
    return JSON.parse(raw) ?? fallback;
  } catch {
    return fallback;
  }
}

export function sanitiseName(name, maxLength = 12) {
  return (typeof name === "string" ? name : "")
    .slice(0, 256)
    .toUpperCase()
    .replace(/[^A-Z0-9 _-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function limit(max) {
  return Number.isInteger(max) && max > 0 ? Math.min(max, 100) : DEFAULT_MAX;
}

function validScore(score) {
  return typeof score === "number" && Number.isSafeInteger(score) && score >= 0;
}

function normalise(list, max, now = Date.now) {
  if (!Array.isArray(list) || list.length > MAX_ENTRIES) return [];
  return list
    .filter((entry) => entry && validScore(entry.score))
    .map((entry) => ({
      name: sanitiseName(entry.name) || DEFAULT_FALLBACK_NAME,
      score: entry.score,
      ts: Number.isSafeInteger(entry.ts) && entry.ts >= 0 ? entry.ts : now(),
    }))
    .sort((a, b) => b.score - a.score || a.ts - b.ts)
    .slice(0, limit(max));
}

export function loadLeaderboard(
  storage,
  key,
  max = DEFAULT_MAX,
  now = Date.now,
) {
  try {
    return normalise(safeJsonParse(storage?.getItem(key), []), max, now);
  } catch {
    return [];
  }
}

export function saveLeaderboard(storage, key, list) {
  try {
    storage?.setItem(key, JSON.stringify(normalise(list, DEFAULT_MAX)));
  } catch {
    /* Unavailable storage must not stop the game. */
  }
}

export function isHighScore(
  storage,
  key,
  score,
  max = DEFAULT_MAX,
  now = Date.now,
) {
  if (!validScore(score) || score === 0) return false;
  const board = loadLeaderboard(storage, key, max, now);
  return board.length < limit(max) || score > board[board.length - 1].score;
}

export function addHighScore(storage, key, name, score, options = {}) {
  const max = limit(options.max ?? DEFAULT_MAX);
  const now = options.now ?? Date.now;
  const board = loadLeaderboard(storage, key, max, now);
  if (!validScore(score)) return board;
  const entry = {
    name:
      sanitiseName(name) ||
      sanitiseName(options.fallbackName) ||
      DEFAULT_FALLBACK_NAME,
    score,
    ts: now(),
  };
  const next = normalise([...board, entry], max, now);
  try {
    storage?.setItem(key, JSON.stringify(next));
  } catch {
    /* Keep running. */
  }
  return next;
}

export function formatLeaderboardText(board) {
  const clean = normalise(board, DEFAULT_MAX);
  if (!clean.length) return "No scores yet.\n\nCrash less. Flex more.";
  return clean
    .map(
      (entry, index) =>
        `${String(index + 1).padStart(2, " ")}. ${entry.name.padEnd(12, " ")}  ${String(entry.score).padStart(4, " ")}`,
    )
    .join("\n");
}
