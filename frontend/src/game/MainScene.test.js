import { describe, expect, it, vi } from "vitest";

// These checks exercise lifetime rules without starting Phaser's DOM renderer.
vi.mock("phaser", () => ({ default: { Scene: class {} } }));
const { MainScene } = await import("./MainScene");

function projectile(overrides = {}) {
  return {
    x: 300,
    y: 200,
    vx: -300,
    vy: 0,
    rotation: 0,
    destroy: vi.fn(),
    ...overrides,
  };
}

function scene() {
  const instance = new MainScene({ screensaver: true });
  Object.assign(instance, {
    playX: 0,
    W: 960,
    H: 640,
    playerBody: { x: 200, y: 320 },
    shurikens: [],
    obstacles: [],
    deflectWindow: false,
    openDeflectWindow: vi.fn(),
    gameOver: vi.fn(),
  });
  return instance;
}

describe("screensaver lifetime", () => {
  it("culls projectiles that leave any outer edge, including reflected shots", () => {
    const saver = scene();
    const shots = [
      projectile({ x: -100 }),
      projectile({ x: 1100, vx: 300 }),
      projectile({ y: -200 }),
      projectile({ y: 800 }),
    ];
    saver.shurikens = shots;
    saver.updateShurikens(16);
    expect(saver.shurikens).toEqual([]);
    for (const shot of shots) expect(shot.destroy).toHaveBeenCalledOnce();
  });

  it("does not kill the ninja or reopen a window with an outgoing reflected shot", () => {
    const saver = scene();
    const shot = projectile({ x: 200, y: 320, vx: 300 });
    saver.shurikens = [shot];
    saver.updateShurikens(16);
    expect(saver.gameOver).not.toHaveBeenCalled();
    expect(saver.openDeflectWindow).not.toHaveBeenCalled();
    expect(saver.shurikens).toEqual([shot]);
  });

  it("still detects a hit from an incoming shot", () => {
    const saver = scene();
    saver.shurikens = [projectile({ x: 205, y: 320 })];
    saver.updateShurikens(16);
    expect(saver.gameOver).toHaveBeenCalledOnce();
    expect(saver.shurikens).toEqual([]);
  });

  it("cycles back from the final palette and restarts without user input", () => {
    const saver = scene();
    saver.level = 6;
    saver.scene = { restart: vi.fn() };
    saver.restartScreensaver();
    expect(saver.saverLevel).toBe(1);
    expect(saver.scene.restart).toHaveBeenCalledOnce();
    expect(saver.storage).toBeNull();
  });

  it("dismisses game-over automatically without requesting a name or reading scores", () => {
    const saver = new MainScene({ screensaver: true });
    saver.physics = { world: { pause: vi.fn() } };
    saver.time = { delayedCall: vi.fn() };
    saver.isHighScore = vi.fn();
    saver.restartScreensaver = vi.fn();
    saver.gameOver();
    expect(saver.physics.world.pause).toHaveBeenCalledOnce();
    expect(saver.isHighScore).not.toHaveBeenCalled();
    const [delay, callback] = saver.time.delayedCall.mock.calls[0];
    expect(delay).toBe(1000);
    callback();
    expect(saver.restartScreensaver).toHaveBeenCalledOnce();
  });
});

describe("projectile impact lifetime", () => {
  function impactScene() {
    const saver = scene();
    saver.sparkEmitter = { explode: vi.fn() };
    saver.dustEmitter = { explode: vi.fn() };
    saver.time = { delayedCall: vi.fn() };
    saver.obstacles = [{ x: 500, y: 400, displayWidth: 56 }];
    saver.shurikens = [
      projectile({ x: 500, y: 400, setTint: vi.fn(), body: { enable: true } }),
    ];
    return saver;
  }

  it("keeps ricocheted shots in the update list instead of abandoning live sprites", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      const saver = impactScene();
      saver.updateShurikens(16);
      expect(saver.shurikens).toHaveLength(1);
      expect(saver.shurikens[0].hasRicocheted).toBe(true);
      expect(saver.shurikens[0].vx).toBeGreaterThan(0);
    } finally {
      random.mockRestore();
    }
  });

  it("removes embedded shots and schedules their destruction", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(1);
    try {
      const saver = impactScene();
      const shot = saver.shurikens[0];
      saver.updateShurikens(16);
      expect(saver.shurikens).toHaveLength(0);
      expect(shot.body.enable).toBe(false);
      const [delay, destroy] = saver.time.delayedCall.mock.calls[0];
      expect(delay).toBe(1200);
      destroy();
      expect(shot.destroy).toHaveBeenCalledOnce();
    } finally {
      random.mockRestore();
    }
  });
});
