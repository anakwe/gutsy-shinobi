const DEFAULT_MAX = 10;
const DEFAULT_FALLBACK_NAME = "SHINOBI";

export function safeJsonParse(raw, fallback) {
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (_) {
    return fallback;
  }
}

export function sanitiseName(name, maxLength = 12) {
  return String(name ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9 _-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function loadLeaderboard(
  storage,
  key,
  max = DEFAULT_MAX,
  now = Date.now,
) {
  const raw = storage.getItem(key);
  const list = safeJsonParse(raw, []);
  if (!Array.isArray(list)) return [];

  return list
    .map((entry) => ({
      name: typeof entry?.name === "string" ? entry.name : "???",
      score: Number(entry?.score) || 0,
      ts: Number(entry?.ts) || now(),
    }))
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.ts - right.ts;
    })
    .slice(0, max);
}

export function saveLeaderboard(storage, key, list) {
  try {
    storage.setItem(key, JSON.stringify(list));
  } catch (_) {
    // localStorage can fail in privacy mode; fail closed and keep game running.
  }
}

export function isHighScore(
  storage,
  key,
  score,
  max = DEFAULT_MAX,
  now = Date.now,
) {
  const value = Number(score) || 0;
  const board = loadLeaderboard(storage, key, max, now);
  if (board.length < max) return value > 0;
  return value > (board[board.length - 1]?.score ?? 0);
}

export function addHighScore(storage, key, name, score, options = {}) {
  const max = options.max ?? DEFAULT_MAX;
  const fallbackName = options.fallbackName ?? DEFAULT_FALLBACK_NAME;
  const now = options.now ?? Date.now;

  const entry = {
    name: sanitiseName(name) || fallbackName,
    score: Number(score) || 0,
    ts: now(),
  };

  const board = [...loadLeaderboard(storage, key, max, now), entry]
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.ts - right.ts;
    })
    .slice(0, max);

  saveLeaderboard(storage, key, board);
  return board;
}

export function formatLeaderboardText(board) {
  if (!board.length) return "No scores yet.\n\nCrash less. Flex more.";
  return board
    .map(
      (entry, index) =>
        `${String(index + 1).padStart(2, " ")}. ${(entry.name || "???")
          .padEnd(12, " ")
          .slice(0, 12)}  ${String(entry.score).padStart(4, " ")}`,
    )
    .join("\n");
}
