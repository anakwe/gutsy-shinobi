import { describe, it, expect, vi } from "vitest";
import { createParticleEffects, createLeafEmitter } from "./particleEffects";

function scene() {
  return {
    playX: 0,
    playW: 960,
    H: 640,
    add: {
      particles: vi.fn((x, y, key, config) => ({
        key,
        config,
        setDepth(depth) {
          this.depth = depth;
          return this;
        },
      })),
    },
  };
}

describe("bounded effects", () => {
  it("uses the direct emitter API and finite caps for all burst effects", () => {
    const effects = createParticleEffects(scene());
    expect(Object.keys(effects)).toEqual(["trail", "dust", "spark"]);
    for (const emitter of Object.values(effects)) {
      expect(emitter.config.emitting).toBe(false);
      expect(emitter.config.maxParticles).toBeGreaterThan(0);
      expect(emitter.config.maxParticles).toBeLessThanOrEqual(64);
    }
  });

  it("caps foliage and derives emission bounds from the play area", () => {
    const emitter = createLeafEmitter(scene());
    expect(emitter.config.x).toEqual({ min: 0, max: 960 });
    expect(emitter.config.maxParticles).toBe(16);
    expect(emitter.depth).toBeLessThan(0);
  });
});
