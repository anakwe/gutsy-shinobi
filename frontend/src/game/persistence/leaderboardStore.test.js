import { describe, expect, it, vi } from "vitest";
import {
  addHighScore,
  formatLeaderboardText,
  isHighScore,
  loadLeaderboard,
  sanitiseName,
} from "./leaderboardStore";

function makeStorage(seed = {}) {
  const state = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return state.has(key) ? state.get(key) : null;
    },
    setItem(key, value) {
      state.set(key, value);
    },
    dump(key) {
      return state.get(key);
    },
  };
}

describe("leaderboardStore", () => {
  it("sanitises names and trims to max length", () => {
    expect(sanitiseName("  ninja<script>_007!!  ")).toBe("NINJASCRIPT_");
  });

  it("loads and sorts scores descending with timestamp tie-breaker", () => {
    const storage = makeStorage({
      board: JSON.stringify([
        { name: "B", score: 10, ts: 20 },
        { name: "A", score: 10, ts: 10 },
        { name: "C", score: 7, ts: 5 },
      ]),
    });

    const board = loadLeaderboard(storage, "board", 10, () => 1);
    expect(board.map((entry) => entry.name)).toEqual(["A", "B", "C"]);
  });

  it("evaluates high score against full leaderboard", () => {
    const storage = makeStorage({
      board: JSON.stringify([
        { name: "A", score: 50, ts: 1 },
        { name: "B", score: 40, ts: 2 },
      ]),
    });

    expect(isHighScore(storage, "board", 41, 2)).toBe(true);
    expect(isHighScore(storage, "board", 40, 2)).toBe(false);
  });

  it("adds high score and persists capped board", () => {
    const storage = makeStorage({
      board: JSON.stringify([{ name: "AAA", score: 5, ts: 1 }]),
    });
    const now = vi.fn(() => 100);

    const board = addHighScore(storage, "board", "new player", 12, {
      max: 2,
      fallbackName: "SHINOBI",
      now,
    });

    expect(board).toEqual([
      { name: "NEW PLAYER", score: 12, ts: 100 },
      { name: "AAA", score: 5, ts: 1 },
    ]);
    expect(storage.dump("board")).toContain("NEW PLAYER");
  });

  it("formats leaderboard text for UI", () => {
    const text = formatLeaderboardText([{ name: "SHINOBI", score: 99 }]);
    expect(text).toContain("SHINOBI");
    expect(text).toContain("99");
  });
});

