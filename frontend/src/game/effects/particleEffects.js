// Phaser 3.90 returns the emitter directly. Scene-owned emitters and particle caps
// keep the visual effects bounded across long unattended runs and scene restarts.
export function createParticleEffects(scene) {
  const create = (key, config, depth) =>
    scene.add
      .particles(0, 0, key, {
        emitting: false,
        ...config,
      })
      .setDepth(depth);
  return {
    trail: create(
      "trail",
      {
        speed: 0,
        scale: { start: 0.6, end: 0 },
        alpha: { start: 0.9, end: 0 },
        lifespan: 220,
        rotate: { min: 0, max: 360 },
        maxParticles: 64,
      },
      320,
    ),
    dust: create(
      "dust",
      {
        speed: { min: -30, max: 30 },
        scale: { start: 0.8, end: 0.1 },
        alpha: { start: 0.9, end: 0 },
        lifespan: 420,
        maxParticles: 32,
      },
      340,
    ),
    spark: create(
      "spark",
      {
        speed: { min: 40, max: 160 },
        scale: { start: 0.6, end: 0.05 },
        alpha: { start: 1, end: 0 },
        lifespan: 380,
        angle: { min: 0, max: 360 },
        maxParticles: 48,
        blendMode: "ADD",
      },
      360,
    ),
  };
}

export function createLeafEmitter(scene) {
  return scene.add
    .particles(0, 0, "leaf", {
      x: { min: scene.playX, max: scene.playX + scene.playW },
      y: { min: -20, max: scene.H * 0.28 },
      lifespan: { min: 2800, max: 5200 },
      speedX: { min: -60, max: -10 },
      speedY: { min: -8, max: 8 },
      rotate: { min: -180, max: 180 },
      scale: { start: 0.6, end: 0.18 },
      frequency: 800,
      quantity: 1,
      maxParticles: 16,
    })
    .setDepth(-200);
}
