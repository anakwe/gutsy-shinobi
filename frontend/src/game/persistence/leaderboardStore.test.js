import { describe, expect, it, vi } from "vitest";
import {
  addHighScore,
  formatLeaderboardText,
  isHighScore,
  loadLeaderboard,
  sanitiseName,
  safeJsonParse,
  saveLeaderboard,
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

  it("keeps running when storage reads and writes are denied", () => {
    const storage = {
      getItem() {
        throw new Error("Denied");
      },
      setItem() {
        throw new Error("Quota exceeded");
      },
    };
    expect(loadLeaderboard(storage, "board")).toEqual([]);
    expect(isHighScore(storage, "board", 5)).toBe(true);
    expect(addHighScore(storage, "board", "A", 5)[0].score).toBe(5);
    expect(() => saveLeaderboard(storage, "board", [])).not.toThrow();
    expect(loadLeaderboard(null, "board")).toEqual([]);
  });

  it("rejects malformed or oversized stored data", () => {
    for (const raw of [
      "{",
      "null",
      "{}",
      '"text"',
      " ".repeat(65537),
      JSON.stringify(Array(1001).fill({ score: 1 })),
    ]) {
      expect(loadLeaderboard(makeStorage({ board: raw }), "board")).toEqual([]);
    }
    expect(safeJsonParse("x".repeat(65537), [])).toEqual([]);
  });

  it("validates stored scores and sanitises stored names", () => {
    const storage = makeStorage({
      board: JSON.stringify([
        { name: "BAD\n<script>!!", score: 9, ts: -4 },
        { name: "BAD", score: "Infinity" },
        { name: "BAD", score: "40" },
        { name: "BAD", score: -1 },
        { name: "BAD", score: 1.5 },
        { name: "BAD", score: Number.MAX_SAFE_INTEGER + 1 },
        null,
      ]),
    });
    expect(loadLeaderboard(storage, "board", 10, () => 99)).toEqual([
      { name: "BADSCRIPT", score: 9, ts: 99 },
    ]);
  });

  it("rejects invalid score submissions without persisting them", () => {
    const storage = makeStorage();
    for (const score of [
      NaN,
      Infinity,
      -1,
      1.2,
      "30",
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(isHighScore(storage, "board", score)).toBe(false);
      expect(addHighScore(storage, "board", "A", score)).toEqual([]);
    }
    expect(storage.dump("board")).toBeUndefined();
  });
});
