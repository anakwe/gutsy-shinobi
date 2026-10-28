import { describe, it, expect } from "vitest";
import { getAutoplayAction } from "./autoplay";

const state = { x: 200, y: 320, velocityY: 100, height: 640, obstacles: [] };

describe("autoplay", () => {
  it("arrests a fall while coasting through a climb", () => {
    expect(getAutoplayAction({ ...state, y: 360 }).jump).toBe(true);
    expect(getAutoplayAction({ ...state, y: 280, velocityY: -200 }).jump).toBe(
      false,
    );
  });

  it("tracks the next opening including its moving bottom beam", () => {
    const gate = {
      isGate: true,
      x: 400,
      y: 100,
      displayWidth: 56,
      displayHeight: 200,
      paired: { y: 500, displayHeight: 280 },
    };
    expect(
      getAutoplayAction({ ...state, y: 320, velocityY: 0, obstacles: [gate] })
        .jump,
    ).toBe(true);
    gate.paired.y = 600;
    expect(
      getAutoplayAction({ ...state, y: 320, velocityY: 0, obstacles: [gate] })
        .jump,
    ).toBe(false);
  });

  it("ignores gates already behind the ninja", () => {
    const gate = {
      isGate: true,
      x: 0,
      y: 0,
      displayWidth: 56,
      displayHeight: 10,
      paired: { y: 40, displayHeight: 10 },
    };
    expect(
      getAutoplayAction({ ...state, y: 280, velocityY: 0, obstacles: [gate] })
        .jump,
    ).toBe(false);
  });
});
