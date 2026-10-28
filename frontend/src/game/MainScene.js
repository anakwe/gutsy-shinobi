import Phaser from "phaser";
import {
  createParticleEffects,
  createLeafEmitter,
} from "./effects/particleEffects";
import { createInputAdapter } from "./input/inputAdapter";
import {
  addHighScore,
  formatLeaderboardText,
  isHighScore,
  loadLeaderboard,
  sanitiseName,
  getBrowserStorage,
} from "./persistence/leaderboardStore";

import { getAutoplayAction } from "./runtime/autoplay";

const LEADERBOARD_KEY = "gutsy_shinobi_leaderboard_v2";
const LEADERBOARD_MAX = 10;

// Levels 1–2 add speed; level 3 introduces moving bamboo and wind.
// Level 4 introduces shurikens; levels 5–6 combine every hazard.
const LEVEL_CONFIGS = [
  {
    level: 1,
    speed: 200,
    spawnIntervalMs: 1700,
    gapPx: 195,
    bgPalette: "dawn",
    hasMoving: false,
    hasWind: false,
    hasShurikens: false,
    obstacleTarget: 10,
  },
  {
    level: 2,
    speed: 225,
    spawnIntervalMs: 1450,
    gapPx: 178,
    bgPalette: "day",
    hasMoving: false,
    hasWind: false,
    hasShurikens: false,
    obstacleTarget: 12,
  },
  {
    level: 3,
    speed: 245,
    spawnIntervalMs: 1250,
    gapPx: 168,
    bgPalette: "dusk",
    hasMoving: true,
    hasWind: true,
    hasShurikens: false,
    obstacleTarget: 13,
  },
  {
    level: 4,
    speed: 255,
    spawnIntervalMs: 1150,
    gapPx: 160,
    bgPalette: "night",
    hasMoving: false,
    hasWind: false,
    hasShurikens: true,
    obstacleTarget: 13,
  },
  {
    level: 5,
    speed: 265,
    spawnIntervalMs: 1050,
    gapPx: 152,
    bgPalette: "storm",
    hasMoving: true,
    hasWind: true,
    hasShurikens: true,
    obstacleTarget: 14,
  },
  {
    level: 6,
    speed: 280,
    spawnIntervalMs: 920,
    gapPx: 145,
    bgPalette: "inferno",
    hasMoving: true,
    hasWind: true,
    hasShurikens: true,
    obstacleTarget: 16,
  },
];

const BG_PALETTES = {
  dawn: { sky: 0xffdba4, mid: 0xffb347, ground: 0x3a7d3a, fog: 0xffe0b2 },
  day: { sky: 0x87ceeb, mid: 0x6fc6ff, ground: 0x2e8b57, fog: 0xb5e6ff },
  dusk: { sky: 0xff7043, mid: 0xb71c1c, ground: 0x1b5e20, fog: 0xff8a65 },
  night: { sky: 0x0d1b2a, mid: 0x1a237e, ground: 0x0a3d0a, fog: 0x1a237e },
  storm: { sky: 0x212121, mid: 0x37474f, ground: 0x1b5e20, fog: 0x455a64 },
  inferno: { sky: 0x1a0000, mid: 0x7f0000, ground: 0x0a0a0a, fog: 0xb71c1c },
};

// Interactive mode retains static ad placeholders; no ad service is loaded.
const AD_PANEL_W = 120;

const COSTUMES = {
  1: {
    hood: 0x1a1a22,
    hoodShadow: 0x0d0d12,
    face: 0xf2d6c9,
    mask: 0x12121a,
    torso: 0x14141c,
    belt: 0x2c2c38,
  },
  2: {
    hood: 0x202430,
    hoodShadow: 0x0d0d12,
    face: 0xf2d6c9,
    mask: 0x101018,
    torso: 0x1b1b24,
    belt: 0x3a2d2d,
  },
  3: {
    hood: 0x223322,
    hoodShadow: 0x0d1a12,
    face: 0xf2d6c9,
    mask: 0x0f1a10,
    torso: 0x183b22,
    belt: 0x2b472b,
  },
  4: {
    hood: 0x1a1a2e,
    hoodShadow: 0x091018,
    face: 0xf2d6c9,
    mask: 0x0c1620,
    torso: 0x162136,
    belt: 0x2a2a38,
  },
  5: {
    hood: 0x2a1a1a,
    hoodShadow: 0x120808,
    face: 0xf2d6c9,
    mask: 0x2a0f0f,
    torso: 0x3b1414,
    belt: 0x4a2c2c,
  },
  6: {
    hood: 0x2b2222,
    hoodShadow: 0x141010,
    face: 0xf2d6c9,
    mask: 0x221111,
    torso: 0x2e1b1b,
    belt: 0x3a2b2b,
  },
};

export class MainScene extends Phaser.Scene {
  constructor({ screensaver = false } = {}) {
    super("main");
    this.isScreensaver = screensaver;
    this.storage = screensaver ? null : getBrowserStorage();
    this.saverLevel = 1;
  }

  // ----------------------------------------------------------
  //  PRELOAD
  // ----------------------------------------------------------
  preload() {
    this.ensureTextures();
    if (!this.isScreensaver) {
      this.load.audio(
        "bgm",
        `${import.meta.env.BASE_URL}audio/bgm_jp_loop.mp3`,
      );
      this.load.audio("baka", `${import.meta.env.BASE_URL}audio/baka.mp3`);
      this.load.audio(
        "jump",
        `${import.meta.env.BASE_URL}audio/jump_snare.mp3`,
      );
    }
  }

  // ----------------------------------------------------------
  //  CREATE
  // ----------------------------------------------------------
  create() {
    this.leafEmitter = null;
    this.W = this.scale.width;
    this.H = this.scale.height;

    // Keep the interactive gutters; the screensaver uses the full logical width.
    this.playX = this.isScreensaver ? 0 : Math.min(AD_PANEL_W, this.W * 0.12);
    this.playW = this.W - this.playX * 2;

    // ---- State ----
    this.level = this.isScreensaver ? this.saverLevel : 1;
    this.score = 0;
    this.combo = 0; // deflect combo
    this.obstaclesSpawned = 0;
    this.obstaclesCleared = 0;
    this.spawnTimer = 0;
    this.isGameOver = false;
    this.isVictoryDance = false;
    this.isGameComplete = false;
    this.isLeaderboardOpen = false;
    this.wasPlayingWhenLeaderboardOpened = false;
    this.isNameEntry = false;
    this.pendingScoreToSave = null;
    this.nameBuffer = "";
    this.nameEntryFlashTween = null;
    this.inputLocked = false;
    this.inputAdapter = null;
    this.restartArmed = false;
    this.restartDelayMs = 5000;
    this.runT = 0;
    this.dizzyGroup = null;
    this.dizzyTimer = 0;
    this.birdText = null;
    this.victoryFx = null;

    // Wind is enabled in levels 3, 5, and 6.
    this.windForce = 0; // target vx addition (px/s), negative = headwind
    this.windCurrent = 0; // smoothed current force
    this.windTimer = 0;
    this.windInterval = 3000;
    this.windText = null;

    // Shurikens and sword deflection are enabled from level 4.
    this.hasSword = false;
    this.shurikens = [];
    this.deflectWindow = false;
    this.deflectWindowTimer = 0;
    this.deflectWindowDuration = 480; // Reduced to 320 ms in level 6.
    this.swordSprite = null;
    this.deflectCooldown = 0;

    this.applyLevelConfig(this.level);
    this.drawBackground();
    this.drawAdPanels();

    // ---- UI text ----
    this.scoreText = this.add
      .text(this.playX + 8, 12, "Score: 0", {
        fontFamily: "system-ui",
        fontSize: "16px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setDepth(1000);

    this.comboText = this.add
      .text(this.playX + 8, 34, "", {
        fontFamily: "system-ui",
        fontSize: "13px",
        color: "#ffe066",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setDepth(1000);

    this.progressText = this.add
      .text(this.playX + 8, 52, `Level 1: 0/10`, {
        fontFamily: "system-ui",
        fontSize: "14px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setDepth(1000);

    this.levelBadge = this.add
      .text(this.W - this.playX - 8, 12, "LVL 1", {
        fontFamily: "system-ui",
        fontSize: "16px",
        fontStyle: "900",
        color: "#ffe066",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(1, 0)
      .setDepth(1000);

    this.bannerText = this.add
      .text(this.W / 2, Math.min(90, this.H * 0.2), "", {
        fontFamily: "system-ui",
        fontSize: "28px",
        fontStyle: "900",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(1000);

    this.hintText = this.add
      .text(this.W / 2, Math.min(125, this.H * 0.27), "", {
        fontFamily: "system-ui",
        fontSize: "16px",
        fontStyle: "700",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(1000);

    // Wind indicator
    this.windText = this.add
      .text(this.W / 2, this.H - 28, "", {
        fontFamily: "system-ui",
        fontSize: "14px",
        color: "#aaddff",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(1000);

    // Deflect prompt
    this.deflectPrompt = this.add
      .text(this.W / 2, this.H * 0.38, "", {
        fontFamily: "system-ui",
        fontSize: "22px",
        fontStyle: "900",
        color: "#ff4444",
        stroke: "#000000",
        strokeThickness: 7,
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(1010);

    // Deflect window bar (shows timing)
    this.deflectBar = this.add.graphics().setDepth(1011);
    this.deflectBarBg = this.add.graphics().setDepth(1010);

    // ---- Player physics ----
    const spawnX = this.playX + this.playW * 0.22;
    this.playerBody = this.physics.add.image(
      spawnX,
      this.H * 0.5,
      "__playerBody",
    );
    this.playerBody.setVisible(false);
    this.playerBody.setCircle(18);
    this.playerBody.setGravityY(900);
    this.playerBody.setCollideWorldBounds(true);

    this.playerRig = this.buildNinjaRig();
    this.playerRig.setDepth(50);

    this.sitSprite = this.add
      .image(0, 0, "ninja_sit")
      .setVisible(false)
      .setDepth(60);

    // Sword is shown in levels with shurikens.
    this.swordSprite = this.add.graphics();
    this.swordSprite.setDepth(55);
    this.swordSprite.setVisible(false);

    // ---- Obstacles ----
    this.obstacles = [];

    if (!this.isScreensaver) this.createInteractiveFeatures();
    this.buildScenery();
    const effects = createParticleEffects(this);
    this.trailEmitter = effects.trail;
    this.dustEmitter = effects.dust;
    this.sparkEmitter = effects.spark;
    this.wasOnGround = false;
    this.applyCostume(COSTUMES[this.level] || COSTUMES[1]);
    if (!this.isScreensaver) this.createHudBackground();
    if (this.isScreensaver) {
      this.audioStarted = true;
      this.bgm = this.bakaSfx = this.jumpSfx = null;
      // Hide personal scores, prompts and fixed HUD in unattended mode.
      for (const item of [
        this.scoreText,
        this.comboText,
        this.progressText,
        this.levelBadge,
        this.bannerText,
        this.hintText,
        this.windText,
        this.deflectPrompt,
        this.deflectBar,
        this.deflectBarBg,
      ])
        item.setVisible(false);
      this.time.delayedCall(60000, () => this.restartScreensaver());
    }
    const onResize = () => this.scene.restart();
    this.scale.on("resize", onResize);
    this.events.once("shutdown", () => {
      this.scale.off("resize", onResize);
      this.inputAdapter?.destroy();
      if (this.startAudio) {
        this.input.off("pointerdown", this.startAudio);
        this.input.keyboard?.off("keydown-SPACE", this.startAudio);
      }
      for (const sound of [this.bgm, this.bakaSfx, this.jumpSfx])
        sound?.destroy();
    });
  }

  // Browser play owns audio, leaderboard and input. Unattended mode creates none.
  createInteractiveFeatures() {
    this.bgm = this.sound.add("bgm", { loop: true, volume: 0.35 });
    this.bakaSfx = this.sound.add("baka", { loop: false, volume: 0.85 });
    this.jumpSfx = this.sound.add("jump", { loop: false, volume: 0.22 });
    this.audioStarted = false;

    const startAudio = (this.startAudio = () => {
      if (this.audioStarted) return;
      this.audioStarted = true;
      if (this.sound.context?.state === "suspended")
        this.sound.context.resume();
      if (this.bgm && !this.bgm.isPlaying) this.bgm.play();
    });
    this.input.once("pointerdown", startAudio);
    this.input.keyboard.once("keydown-SPACE", startAudio);

    // ---- Leaderboard ----
    this.buildLeaderboardOverlay();

    // ---- Input ----
    this.inputAdapter = createInputAdapter({
      input: this.input,
      keyboard: this.input.keyboard,
      onJump: () => this.handleJump(),
      onConfirm: () => this.handleEnterAction(),
      onDeflect: () => this.attemptDeflect(),
      onToggleLeaderboard: () => this.toggleLeaderboard(),
      onCloseLeaderboard: () => {
        if (this.isLeaderboardOpen) this.closeLeaderboard();
      },
      onBackspace: (ev) => this.handleBackspace(ev),
      onKey: (ev) => this.handleNameTyping(ev),
      isDeflectWindowOpen: () => this.deflectWindow,
    });
  }

  // Canvas-only lacquered panels retained from the local HUD styling.
  createHudBackground() {
    this.hudBg = this.add.graphics().setDepth(998).setScrollFactor(0);
    this.hudBg.fillStyle(0x0b1220, 0.6);
    this.hudBg.fillRoundedRect(this.playX + 4, 6, 180, 44, 8);
    this.hudBg.fillRoundedRect(this.W - this.playX - 140, 6, 132, 44, 8);
    this.hudBg.lineStyle(2, 0x2a2f44, 0.6);
    this.hudBg.strokeRoundedRect(this.playX + 4, 6, 180, 44, 8);
    this.hudBg.strokeRoundedRect(this.W - this.playX - 140, 6, 132, 44, 8);
    for (const text of [
      this.scoreText,
      this.progressText,
      this.comboText,
      this.levelBadge,
    ])
      text.setScrollFactor(0);
  }

  restartScreensaver() {
    this.saverLevel = (this.level % LEVEL_CONFIGS.length) + 1;
    this.scene.restart();
  }

  // ----------------------------------------------------------
  //  LEVEL CONFIG
  // ----------------------------------------------------------
  applyLevelConfig(level) {
    const cfg =
      LEVEL_CONFIGS.find((c) => c.level === level) ||
      LEVEL_CONFIGS[LEVEL_CONFIGS.length - 1];
    this.cfg = cfg;
    this.obstacleSpeed = cfg.speed;
    this.spawnInterval = cfg.spawnIntervalMs;
    this.gapSize = cfg.gapPx;
    this.hasSword = cfg.hasShurikens;
    this.levelTarget = cfg.obstacleTarget;
  }

  // ----------------------------------------------------------
  //  AD PANELS
  // ----------------------------------------------------------
  drawAdPanels() {
    if (this.isScreensaver) return;
    const panelWidth = this.playX;
    this._adSlotTexts?.forEach((t) => t.destroy());
    this._adSlotTexts = [];
    if (this.adGfx) this.adGfx.destroy();
    this.adGfx = this.add.graphics().setDepth(500);

    // Left panel
    this.adGfx.fillStyle(0x0d0d1a, 0.92);
    this.adGfx.fillRect(0, 0, panelWidth, this.H);
    this.adGfx.lineStyle(2, 0x444466, 0.8);
    this.adGfx.strokeRect(0, 0, panelWidth, this.H);

    // Right panel
    this.adGfx.fillStyle(0x0d0d1a, 0.92);
    this.adGfx.fillRect(this.W - panelWidth, 0, panelWidth, this.H);
    this.adGfx.lineStyle(2, 0x444466, 0.8);
    this.adGfx.strokeRect(this.W - panelWidth, 0, panelWidth, this.H);

    // Ad placeholder boxes (left)
    this.drawAdSlot(this.adGfx, 8, 40, panelWidth - 16, 200, "AD");
    this.drawAdSlot(this.adGfx, 8, 260, panelWidth - 16, 200, "AD");

    // Ad placeholder boxes (right)
    this.drawAdSlot(
      this.adGfx,
      this.W - panelWidth + 8,
      40,
      panelWidth - 16,
      200,
      "AD",
    );
    this.drawAdSlot(
      this.adGfx,
      this.W - panelWidth + 8,
      260,
      panelWidth - 16,
      200,
      "AD",
    );

    // Branding label
    if (this.adLabels) this.adLabels.forEach((t) => t.destroy());
    this.adLabels = [];
    const mk = (x, y, txt) => {
      const t = this.add
        .text(x, y, txt, {
          fontFamily: "system-ui",
          fontSize: "10px",
          color: "#555577",
        })
        .setOrigin(0.5)
        .setDepth(501);
      this.adLabels.push(t);
    };
    mk(panelWidth / 2, this.H - 16, "GUTSY\nSHINOBI");
    mk(this.W - panelWidth / 2, this.H - 16, "GUTSY\nSHINOBI");
  }

  drawAdSlot(g, x, y, w, h, label) {
    g.lineStyle(1, 0x334455, 0.6);
    g.strokeRect(x, y, w, h);
    g.fillStyle(0x111122, 0.4);
    g.fillRect(x + 1, y + 1, w - 2, h - 2);
    // "AD" text drawn separately so it appears above graphics
    const t = this.add
      .text(x + w / 2, y + h / 2, label, {
        fontFamily: "system-ui",
        fontSize: "11px",
        color: "#334455",
      })
      .setOrigin(0.5)
      .setDepth(502);
    if (!this._adSlotTexts) this._adSlotTexts = [];
    this._adSlotTexts.push(t);
  }

  // ----------------------------------------------------------
  //  BACKGROUND + SCENERY
  // ----------------------------------------------------------
  drawBackground() {
    if (this.bgGfx) this.bgGfx.destroy();
    const pal = BG_PALETTES[this.cfg?.bgPalette || "day"];
    this.cameras.main.setBackgroundColor(pal.sky);

    this.bgGfx = this.add.graphics().setDepth(-1000);
    this.bgGfx.fillStyle(pal.mid, 1);
    this.bgGfx.fillRect(0, 0, this.W, this.H * 0.62);
    this.bgGfx.fillStyle(pal.sky, 1);
    this.bgGfx.fillRect(0, this.H * 0.62, this.W, this.H * 0.22);
    this.bgGfx.fillStyle(pal.fog, 0.45);
    this.bgGfx.fillRect(0, this.H * 0.44, this.W, this.H * 0.16);
    this.bgGfx.fillStyle(0x2e8b57, 0.75);
    this.bgGfx.fillRect(0, this.H - 18, this.W, 18);
  }

  buildScenery() {
    // A single scenery layer is rebuilt when the palette changes.
    this.sceneryGroup = this.add.group();
    this.refreshScenery();
  }

  refreshScenery() {
    if (this.sceneryGroup) this.sceneryGroup.clear(true, true);

    const pal = BG_PALETTES[this.cfg?.bgPalette || "day"];
    const g = this.add.graphics().setDepth(-500);
    this.sceneryGroup.add(g);

    // Distant mountains
    const mtnCol = Phaser.Display.Color.IntegerToColor(pal.mid);
    g.fillStyle(
      Phaser.Display.Color.GetColor(
        Math.max(0, mtnCol.r - 30),
        Math.max(0, mtnCol.g - 30),
        Math.max(0, mtnCol.b - 30),
      ),
      0.5,
    );
    const mtnPts = [];
    for (let i = 0; i <= 12; i++) {
      const x = (this.W / 12) * i;
      const y =
        i % 2 === 0
          ? this.H * (0.28 + Math.sin(i * 1.3) * 0.08)
          : this.H * (0.42 + Math.cos(i * 0.9) * 0.05);
      mtnPts.push(x, y);
    }
    mtnPts.push(this.W, this.H * 0.6, 0, this.H * 0.6);
    g.fillPoints(
      mtnPts.reduce((a, v, i) => {
        if (i % 2 === 0) a.push({ x: v, y: mtnPts[i + 1] });
        return a;
      }, []),
      true,
    );

    // Pagoda silhouette (centre-ish, behind gameplay)
    this.drawPagoda(g, this.playX + this.playW * 0.65, this.H * 0.52);

    // Cherry blossom trees (left/right of play area)
    this.drawCherryTree(g, this.playX + 28, this.H - 18);
    this.drawCherryTree(g, this.playX + this.playW - 28, this.H - 18);

    // Moon / sun depending on palette
    this.drawCelestialBody(g);
    this.leafEmitter?.destroy();
    this.leafEmitter = createLeafEmitter(this);
  }

  drawPagoda(g, cx, baseY) {
    const col = 0x1a1a2e;
    g.fillStyle(col, 0.35);
    // Tiers (bottom to top)
    const tiers = [
      { w: 80, h: 18 },
      { w: 64, h: 18 },
      { w: 48, h: 16 },
      { w: 34, h: 14 },
    ];
    let y = baseY;
    for (const t of tiers) {
      g.fillRect(cx - t.w / 2, y - t.h, t.w, t.h);
      // eave flick
      g.fillTriangle(
        cx - t.w / 2 - 8,
        y - t.h,
        cx - t.w / 2,
        y - t.h,
        cx - t.w / 2 + 4,
        y - t.h - 6,
      );
      g.fillTriangle(
        cx + t.w / 2 + 8,
        y - t.h,
        cx + t.w / 2,
        y - t.h,
        cx + t.w / 2 - 4,
        y - t.h - 6,
      );
      y -= t.h + 2;
    }
    // spire
    g.fillTriangle(cx - 4, y, cx + 4, y, cx, y - 22);
  }

  drawCherryTree(g, cx, baseY) {
    g.fillStyle(0x4a2800, 0.55);
    g.fillRect(cx - 4, baseY - 55, 8, 55);
    g.fillStyle(0xffb7c5, 0.45);
    g.fillCircle(cx, baseY - 68, 22);
    g.fillCircle(cx - 14, baseY - 58, 16);
    g.fillCircle(cx + 14, baseY - 58, 16);
  }

  drawCelestialBody(g) {
    const isNight = ["night", "storm", "inferno"].includes(this.cfg?.bgPalette);
    if (isNight) {
      // Moon
      g.fillStyle(0xf5f5dc, 0.7);
      g.fillCircle(this.W * 0.75, this.H * 0.18, 28);
      g.fillStyle(BG_PALETTES[this.cfg.bgPalette].mid, 0.6);
      g.fillCircle(this.W * 0.75 + 10, this.H * 0.16, 22);
    } else {
      // Sun
      g.fillStyle(0xfff176, 0.7);
      g.fillCircle(this.W * 0.78, this.H * 0.15, 32);
    }
  }

  // ----------------------------------------------------------
  //  TEXTURE GENERATION
  // ----------------------------------------------------------
  ensureTextures() {
    this.ensureBambooTexture();
    this.ensureStarTexture();
    this.ensureBurstTexture();
    this.ensureSitTexture();
    this.ensureShurikenTexture();
    this.ensureEnemyNinjaTexture();
    this.ensureTrailTexture();
    this.ensureLeafTexture();
    this.ensureDustTexture();
    this.ensureSparkTexture();
  }

  ensureBambooTexture() {
    if (this.textures.exists("bamboo")) return;
    const w = 32,
      h = 256,
      g = this.add.graphics();
    g.fillStyle(0x4fbf6b, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(0x3aa857, 0.6);
    g.fillRect(0, 0, 6, h);
    g.fillStyle(0x68d484, 0.35);
    g.fillRect(w - 7, 0, 7, h);
    for (let y = 20; y < h; y += 24) {
      g.fillStyle(0x2f7f43, 0.95);
      g.fillRect(0, y, w, 4);
      g.fillStyle(0x2a6f3b, 0.6);
      g.fillRect(0, y + 4, w, 2);
    }
    g.generateTexture("bamboo", w, h);
    g.destroy();
  }

  ensureStarTexture() {
    if (this.textures.exists("star")) return;
    const g = this.add.graphics();
    g.fillStyle(0xfff3a6, 1);
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI / 5) * i - Math.PI / 2,
        r = i % 2 === 0 ? 12 : 5;
      pts.push({ x: 16 + Math.cos(a) * r, y: 16 + Math.sin(a) * r });
    }
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach((p) => g.lineTo(p.x, p.y));
    g.closePath();
    g.fillPath();
    g.lineStyle(2, 0xd6b85a, 1);
    g.strokePath();
    g.generateTexture("star", 32, 32);
    g.destroy();
  }

  ensureBurstTexture() {
    if (this.textures.exists("burst")) return;
    const w = 256,
      h = 160,
      cx = w / 2,
      cy = h / 2,
      g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.lineStyle(6, 0x000000, 1);
    const pts = [];
    for (let i = 0; i <= 18; i++) {
      const a = (Math.PI * 2 * i) / 18,
        r = i % 2 === 0 ? 72 : 54;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach((p) => g.lineTo(p.x, p.y));
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.beginPath();
    g.moveTo(cx - 40, cy + 55);
    g.lineTo(cx - 70, cy + 80);
    g.lineTo(cx - 25, cy + 72);
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.generateTexture("burst", w, h);
    g.destroy();
  }

  ensureTrailTexture() {
    if (this.textures.exists("trail")) return;
    const w = 28,
      h = 6;
    const g = this.add.graphics();
    // layered rectangles to simulate a tapered glow streak
    for (let i = 0; i < 6; i++) {
      const a = 1 - i * 0.16;
      const lw = Math.max(2, Math.floor(w * (1 - i * 0.14)));
      g.fillStyle(0xffffff, a);
      g.fillRoundedRect(w - lw, Math.floor(h / 2) - 1, lw, 2, 1);
    }
    // a small core point
    g.fillStyle(0xffffee, 1);
    g.fillCircle(4, Math.floor(h / 2), 1.4);
    g.generateTexture("trail", w, h);
    g.destroy();
  }

  ensureLeafTexture() {
    if (this.textures.exists("leaf")) return;
    const g = this.add.graphics();
    g.fillStyle(0x6aa84f, 1);
    // Use fillEllipse (Phaser Graphics) instead of canvas-style ellipse() call
    g.fillEllipse(8, 6, 16, 8);
    g.generateTexture("leaf", 16, 12);
    g.destroy();
  }

  ensureDustTexture() {
    if (this.textures.exists("dust")) return;
    const w = 28,
      h = 28;
    const g = this.add.graphics();
    // soft layered puff
    g.fillStyle(0x6b5840, 0.28);
    g.fillCircle(w / 2, h / 2, 10);
    g.fillStyle(0x7f6a54, 0.2);
    g.fillCircle(w / 2 - 4, h / 2 + 2, 7);
    g.fillStyle(0x5a452f, 0.18);
    g.fillCircle(w / 2 + 5, h / 2 - 2, 6);
    g.generateTexture("dust", w, h);
    g.destroy();
  }

  ensureSparkTexture() {
    if (this.textures.exists("spark")) return;
    const w = 20,
      h = 20;
    const g = this.add.graphics();
    // bright core
    g.fillStyle(0xffee88, 1);
    g.fillCircle(w / 2, h / 2, 3);
    // radial streaks
    g.lineStyle(2, 0xffcc66, 0.9);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      const x1 = w / 2 + Math.cos(a) * 4;
      const y1 = h / 2 + Math.sin(a) * 4;
      const x2 = w / 2 + Math.cos(a) * (8 + Math.random() * 6);
      const y2 = h / 2 + Math.sin(a) * (8 + Math.random() * 6);
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.strokePath();
    }
    g.generateTexture("spark", w, h);
    g.destroy();
  }

  ensureSitTexture() {
    if (this.textures.exists("ninja_sit")) return;
    const g = this.add.graphics();
    g.fillStyle(0x1a1a22, 1);
    g.fillCircle(34, 22, 20);
    g.fillStyle(0x0d0d12, 0.85);
    g.fillCircle(28, 16, 14);
    g.fillStyle(0xf2d6c9, 1);
    g.fillEllipse(40, 24, 22, 18);
    g.fillStyle(0x0b0b10, 1);
    g.fillRoundedRect(39, 22, 9, 3, 1.5);
    g.fillStyle(0x12121a, 1);
    g.fillRoundedRect(30, 30, 26, 10, 5);
    g.fillStyle(0x14141c, 1);
    g.fillRoundedRect(28, 40, 18, 16, 7);
    g.fillStyle(0x0f0f16, 1);
    g.fillRoundedRect(24, 54, 18, 10, 6);
    g.fillStyle(0x14141c, 1);
    g.fillRoundedRect(38, 54, 18, 10, 6);
    g.fillStyle(0x0a0a10, 1);
    g.fillRoundedRect(22, 62, 16, 5, 2);
    g.fillRoundedRect(40, 62, 16, 5, 2);
    g.generateTexture("ninja_sit", 72, 72);
    g.destroy();
  }

  ensureShurikenTexture() {
    if (this.textures.exists("shuriken")) return;
    const g = this.add.graphics();
    g.fillStyle(0xcccccc, 1);
    // 4 pointed star
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i;
      g.fillTriangle(
        16 + Math.cos(a) * 14,
        16 + Math.sin(a) * 14,
        16 + Math.cos(a + 0.45) * 6,
        16 + Math.sin(a + 0.45) * 6,
        16 + Math.cos(a - 0.45) * 6,
        16 + Math.sin(a - 0.45) * 6,
      );
    }
    g.fillStyle(0x888888, 1);
    g.fillCircle(16, 16, 4);
    g.generateTexture("shuriken", 32, 32);
    g.destroy();
  }

  ensureEnemyNinjaTexture() {
    if (this.textures.exists("enemy_ninja")) return;
    const g = this.add.graphics();
    // Red-masked enemy
    g.fillStyle(0x8b0000, 1);
    g.fillCircle(16, 14, 12);
    g.fillStyle(0x500000, 1);
    g.fillCircle(12, 10, 8);
    g.fillStyle(0xf2d6c9, 1);
    g.fillEllipse(19, 15, 14, 11);
    g.fillStyle(0xcc0000, 1);
    g.fillRoundedRect(13, 19, 16, 6, 3);
    g.fillStyle(0x3b0000, 1);
    g.fillRoundedRect(14, 28, 12, 10, 4);
    g.fillStyle(0x2a0000, 1);
    g.fillRoundedRect(10, 36, 10, 8, 3);
    g.fillRoundedRect(22, 36, 10, 8, 3);
    g.generateTexture("enemy_ninja", 32, 48);
    g.destroy();
  }

  // ----------------------------------------------------------
  //  NINJA RIG
  // ----------------------------------------------------------
  buildNinjaRig() {
    const c = this.add.container(0, 0);
    const rr = (w, h, r, col, a = 1) => {
      const g = this.add.graphics();
      g.fillStyle(col, a);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
      return g;
    };

    const head = this.add.container(0, -26);
    const hoodOuter = this.add.graphics();
    hoodOuter.fillStyle(0x1a1a22, 1);
    hoodOuter.fillCircle(0, 0, 20);
    const hoodShadow = this.add.graphics();
    hoodShadow.fillStyle(0x0d0d12, 0.85);
    hoodShadow.fillCircle(-6, -6, 14);
    const faceOpen = this.add.graphics();
    faceOpen.fillStyle(0xf2d6c9, 1);
    faceOpen.fillEllipse(6, 4, 22, 18);
    const eye = this.add.graphics();
    eye.fillStyle(0x0b0b10, 1);
    eye.fillCircle(11, 2, 3.6);
    eye.fillStyle(0xffffff, 1);
    eye.fillCircle(10, 1, 1.2);
    const mask = rr(26, 10, 5, 0x12121a);
    mask.x = 6;
    mask.y = 14;
    head.add([hoodOuter, hoodShadow, faceOpen, eye, mask]);
    // expose for recolour / animation (do NOT assign to the reserved `mask` property)
    head.hoodOuter = hoodOuter;
    head.hoodShadow = hoodShadow;
    head.faceOpen = faceOpen;
    head.eye = eye;
    head.faceMask = mask;

    const torso = rr(18, 18, 7, 0x14141c);
    torso.y = -2;
    const belt = rr(20, 4, 2, 0x2c2c38);
    belt.y = 6;

    const makeLimb = (uLen, lLen, thick, cU, cL) => {
      const limb = this.add.container(0, 0);
      const upper = rr(thick, uLen, Math.ceil(thick / 2), cU);
      upper.y = uLen / 2;
      const joint = this.add.container(0, uLen);
      const lower = rr(thick, lLen, Math.ceil(thick / 2), cL);
      lower.y = lLen / 2;
      joint.add(lower);
      limb.add([upper, joint]);
      limb.joint = joint;
      limb.lower = lower;
      return limb;
    };

    const aB = makeLimb(12, 10, 6, 0x0f0f16, 0x0f0f16);
    aB.x = -10;
    aB.y = -8;
    const aF = makeLimb(12, 10, 6, 0x14141c, 0x14141c);
    aF.x = 12;
    aF.y = -8;
    const lB = makeLimb(12, 12, 7, 0x0f0f16, 0x0f0f16);
    lB.x = -4;
    lB.y = 10;
    const lF = makeLimb(12, 12, 7, 0x14141c, 0x14141c);
    lF.x = 6;
    lF.y = 10;

    const foot = (col) => rr(12, 5, 2, col);
    const fB = foot(0x0a0a10);
    fB.y = 12;
    lB.joint.add(fB);
    const fF = foot(0x0a0a10);
    fF.y = 12;
    lF.joint.add(fF);

    c.add([lB, aB, torso, belt, aF, lF, head]);
    // Retain the graphics needed to recolour costumes between levels.
    c.addedParts = { torso, belt };
    c.parts = { head, armBack: aB, armFront: aF, legBack: lB, legFront: lF };
    return c;
  }

  applyCostume(costume = {}) {
    // Recolour the existing hood, face, torso and belt without rebuilding the rig.
    if (!this.playerRig || !this.playerRig.parts) return;
    const p = this.playerRig.parts;
    const head = p.head;
    if (head.hoodOuter) {
      head.hoodOuter.clear();
      head.hoodOuter.fillStyle(costume.hood ?? 0x1a1a22, 1);
      head.hoodOuter.fillCircle(0, 0, 20);
    }
    if (head.hoodShadow) {
      head.hoodShadow.clear();
      head.hoodShadow.fillStyle(costume.hoodShadow ?? 0x0d0d12, 0.85);
      head.hoodShadow.fillCircle(-6, -6, 14);
    }
    if (head.faceOpen) {
      head.faceOpen.clear();
      head.faceOpen.fillStyle(costume.face ?? 0xf2d6c9, 1);
      head.faceOpen.fillEllipse(6, 4, 22, 18);
    }
    if (head.eye) {
      head.eye.clear();
      head.eye.fillStyle(0x0b0b10, 1);
      head.eye.fillCircle(11, 2, 3.6);
      head.eye.fillStyle(0xffffff, 1);
      head.eye.fillCircle(10, 1, 1.2);
    }
    if (head.faceMask) {
      head.faceMask.clear();
      head.faceMask.fillStyle(costume.mask ?? 0x12121a, 1);
      head.faceMask.fillRoundedRect(-13, -5, 26, 10, 5);
      head.faceMask.x = 6;
      head.faceMask.y = 14;
    }

    // torso and limbs
    const torso = this.playerRig.addedParts?.torso ?? null;
    const belt = this.playerRig.addedParts?.belt ?? null;
    if (torso) {
      torso.clear();
      torso.fillStyle(costume.torso ?? 0x14141c, 1);
      torso.fillRoundedRect(-9, -9, 18, 18, 7);
    }
    if (belt) {
      belt.clear();
      belt.fillStyle(costume.belt ?? 0x2c2c38, 1);
      belt.fillRoundedRect(-10, -2, 20, 4, 2);
    }
  }

  animateRun(deltaMs) {
    this.runT += deltaMs / 1000;
    const p = this.playerRig.parts,
      t = this.runT * 13.5,
      s = Math.sin(t);
    const bob = Math.sin(t * 2) * 3.5;

    this.playerRig.x = this.playerBody.x;
    this.playerRig.y = this.playerBody.y + bob;
    this.playerRig.rotation = Phaser.Math.Clamp(
      this.playerBody.body.velocity.y / 1600,
      -0.14,
      0.14,
    );

    const stretch = 1 + 0.06 * Math.sin(t * 2);
    this.playerRig.scaleY = stretch;
    this.playerRig.scaleX = 2 - stretch;

    p.legFront.rotation = 0.85 * s;
    p.legBack.rotation = -0.85 * s;
    p.legFront.joint.rotation = 1.05 + 0.85 * Math.max(0, s);
    p.legBack.joint.rotation = 1.05 + 0.85 * Math.max(0, -s);
    p.armFront.rotation = -0.8 * s;
    p.armBack.rotation = 0.8 * s;
    p.armFront.joint.rotation = 0.85 + 0.65 * Math.max(0, -s);
    p.armBack.joint.rotation = 0.85 + 0.65 * Math.max(0, s);
    p.head.y = -26 + Math.sin(t * 2) * 1.4;

    // Sword draw when hasSword
    if (this.hasSword) this.drawSword();
  }

  drawSword() {
    this.swordSprite.clear();
    this.swordSprite.setVisible(true);
    const x = this.playerBody.x + 18;
    const y = this.playerBody.y - 10;

    const slashing = this.deflectWindow;
    const angle = slashing ? -0.8 : 0.3;

    this.swordSprite.lineStyle(3, slashing ? 0x00ffff : 0xdddddd, 1);
    const bx = x + Math.cos(angle) * 6,
      by = y + Math.sin(angle) * 6;
    const tx = x + Math.cos(angle) * 26,
      ty = y + Math.sin(angle) * 26;
    this.swordSprite.beginPath();
    this.swordSprite.moveTo(bx, by);
    this.swordSprite.lineTo(tx, ty);
    this.swordSprite.strokePath();

    // Guard
    this.swordSprite.lineStyle(4, 0xaa8800, 1);
    this.swordSprite.beginPath();
    this.swordSprite.moveTo(bx - Math.sin(angle) * 5, by + Math.cos(angle) * 5);
    this.swordSprite.lineTo(bx + Math.sin(angle) * 5, by - Math.cos(angle) * 5);
    this.swordSprite.strokePath();
  }

  // ----------------------------------------------------------
  //  INPUT
  // ----------------------------------------------------------
  handleJump() {
    if (this.inputLocked) return;
    if (this.isLeaderboardOpen || this.isNameEntry) return;
    if (this.isGameOver || this.isVictoryDance || this.isGameComplete) return;

    if (!this.audioStarted) {
      this.audioStarted = true;
      if (this.sound.context?.state === "suspended")
        this.sound.context.resume();
      if (this.bgm && !this.bgm.isPlaying) this.bgm.play();
    }

    if (this.jumpSfx) {
      this.jumpSfx.stop();
      this.jumpSfx.play();
    }
    this.playerBody.setVelocityY(-320);
  }

  handleEnterAction() {
    if (this.isLeaderboardOpen) {
      if (this.isNameEntry) {
        this.submitHighScoreIfPending();
        return;
      }
      this.closeLeaderboard();
      return;
    }
    if (this.inputLocked) return;
    if (this.isGameOver && this.restartArmed) {
      this.scene.restart();
      return;
    }
    if (this.isGameComplete) {
      this.scene.restart();
      return;
    }
    if (this.isVictoryDance) {
      this.finishVictoryDanceAndAdvance();
    }
  }

  // ----------------------------------------------------------
  //  OBSTACLES
  // ----------------------------------------------------------
  spawnBambooPair() {
    if (this.isGameOver || this.isVictoryDance || this.isGameComplete) return;
    if (this.obstaclesSpawned >= this.levelTarget) return;

    const gap = this.gapSize;
    const margin = Math.min(140, this.H * 0.28);
    const minY = this.isScreensaver ? this.H * 0.38 : margin;
    const maxY = this.isScreensaver
      ? this.H * 0.62
      : Math.max(minY, this.H - margin);
    const gapY = Phaser.Math.Between(Math.floor(minY), Math.floor(maxY));
    const w = 56;
    const x = this.playX + this.playW + w / 2;

    const topH = Math.max(28, gapY - gap / 2);
    const botH = Math.max(28, this.H - (gapY + gap / 2));
    const botY = gapY + gap / 2 + botH / 2;

    const mkBeam = (x, y, h) => {
      const im = this.add.image(x, y, "bamboo");
      im.setDisplaySize(w, h);
      im.setDepth(10);
      this.physics.add.existing(im);
      im.body.setAllowGravity(false);
      im.body.setImmovable(true);
      return im;
    };

    const top = mkBeam(x, topH / 2, topH);
    const bot = mkBeam(x, botY, botH);

    top.paired = bot;
    bot.paired = top;
    top.isGate = true;
    top.scored = false;

    // Moving bamboo in levels 3, 5, and 6.
    if (this.cfg.hasMoving) {
      top.moveDir = Phaser.Math.Between(0, 1) === 0 ? 1 : -1;
      top.moveAmp = Phaser.Math.Between(18, 40);
      top.moveSpeed = 1.8 + Math.random() * 1.2;
      top.moveOriginY = top.y;
      bot.moveDir = -top.moveDir;
      bot.moveAmp = top.moveAmp;
      bot.moveSpeed = top.moveSpeed;
      bot.moveOriginY = bot.y;
    }

    // Enemies fire from bamboo when the current level enables shurikens.
    if (this.cfg.hasShurikens && Math.random() < 0.55) {
      const side = Math.random() < 0.5 ? top : bot;
      const en = this.add.image(
        side.x,
        side.y + (side === top ? topH * 0.4 : -botH * 0.4),
        "enemy_ninja",
      );
      en.setDepth(12);
      en.setScale(0.85);
      en.parentBeam = side;
      en.hasFired = false;
      this.obstacles.push(en);
    }

    this.obstacles.push(top, bot);
    this.obstaclesSpawned += 1;
  }

  syncBody(go) {
    if (!go.body) return;
    go.body.x = go.x - go.displayWidth / 2;
    go.body.y = go.y - go.displayHeight / 2;
    go.body.width = go.displayWidth;
    go.body.height = go.displayHeight;
  }

  // ----------------------------------------------------------
  //  SHURIKENS
  // ----------------------------------------------------------
  spawnShuriken(fromX, fromY) {
    const s = this.add.image(fromX, fromY, "shuriken");
    s.setDepth(30);
    s.setScale(0.9);
    s.vx = -(280 + Math.random() * 80);
    s.vy = (Math.random() - 0.5) * 120;
    s.isShuriken = true;
    s.hasTrail = true;
    this.physics.add.existing(s);
    s.body.setAllowGravity(false);
    this.shurikens.push(s);
    this.tweens.add({
      targets: this.playerRig.parts.armFront,
      rotation: -1.6,
      duration: 120,
      yoyo: true,
      ease: "Cubic.easeOut",
    });
  }

  updateShurikens(deltaMs) {
    const dt = deltaMs / 1000;

    // Update deflect window timer & bar
    if (this.deflectWindow) {
      this.deflectWindowTimer -= deltaMs;
      this.drawDeflectBar(this.deflectWindowTimer / this.deflectWindowDuration);
      if (this.deflectWindowTimer <= 0) {
        // Window expired without deflect — shuriken still flying, just close prompt
        this.deflectWindow = false;
        this.deflectPrompt.setVisible(false);
        this.clearDeflectBar();
      }
    }

    this.shurikens = this.shurikens.filter((s) => {
      s.rotation += 0.22;
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      if (s.hasTrail) this.trailEmitter.emitParticleAt(s.x, s.y, 1);

      // Cull outgoing reflected shots and missed shots on all four outer edges.
      if (
        s.x < this.playX - 60 ||
        s.x > this.W + 100 ||
        s.y < -100 ||
        s.y > this.H + 100
      ) {
        s.destroy();
        return false;
      }

      // Open deflect window when shuriken enters danger range
      if (
        s.vx < 0 &&
        !this.deflectWindow &&
        !s.windowOpened &&
        s.x - this.playerBody.x < 180 &&
        s.x > this.playerBody.x - 30
      ) {
        s.windowOpened = true;
        this.openDeflectWindow();
      }

      // Kill zone: if shuriken reaches the ninja without being deflected
      const dx = s.x - this.playerBody.x;
      const dy = s.y - this.playerBody.y;
      if (s.vx < 0 && Math.sqrt(dx * dx + dy * dy) < 22) {
        s.destroy();
        this.gameOver();
        return false;
      }
      for (const obstacle of this.obstacles) {
        if (obstacle === s.lastImpact || obstacle.parentBeam) continue;
        const radius = (obstacle.displayWidth || 40) * 0.45 + 6;
        if (Math.hypot(s.x - obstacle.x, s.y - obstacle.y) < radius)
          return this.handleShurikenImpact(s, obstacle.x, obstacle.y, obstacle);
      }
      if (s.y > this.H - 12 || s.y < 8)
        return this.handleShurikenImpact(
          s,
          s.x,
          Math.max(8, Math.min(this.H - 12, s.y)),
          null,
        );
      return true;
    });
  }

  // Keep a ricochet in the update list; embedded shots have a bounded lifetime.
  handleShurikenImpact(shot, hitX, hitY, target) {
    this.sparkEmitter.explode(10, hitX, hitY);
    this.dustEmitter.explode(6, hitX, hitY + 6);
    if (!this.isScreensaver) this.cameras.main.shake(90, 0.004);
    const chance = target ? 0.28 : 0.12;
    if (!shot.hasRicocheted && Math.random() < chance) {
      shot.hasRicocheted = true;
      shot.lastImpact = target;
      shot.vx *= -0.45;
      shot.vy = -shot.vy * 0.3 + (Math.random() - 0.5) * 40;
      return true;
    }
    shot.vx = shot.vy = 0;
    shot.setTint(0x888888);
    if (shot.body) shot.body.enable = false;
    this.time.delayedCall(1200, () => shot.destroy());
    return false;
  }

  drawDeflectBar(frac) {
    const bW = 160,
      bH = 14;
    const bX = this.W / 2 - bW / 2;
    const bY = this.H * 0.38 + 32;
    const filled = Math.max(0, frac);

    // Green fades through yellow to red as the timing window closes.
    const r = Math.round(255 * (1 - filled));
    const g = Math.round(255 * filled);
    const col = Phaser.Display.Color.GetColor(r, g, 0);

    this.deflectBarBg.clear();
    this.deflectBarBg.fillStyle(0x000000, 0.55);
    this.deflectBarBg.fillRoundedRect(bX - 2, bY - 2, bW + 4, bH + 4, 5);

    this.deflectBar.clear();
    this.deflectBar.fillStyle(col, 1);
    this.deflectBar.fillRoundedRect(bX, bY, bW * filled, bH, 4);
  }

  clearDeflectBar() {
    this.deflectBar.clear();
    this.deflectBarBg.clear();
  }

  attemptDeflect() {
    if (!this.deflectWindow) return;

    this.deflectWindow = false;
    this.deflectPrompt.setVisible(false);
    this.clearDeflectBar();

    // Find the shuriken that opened this window
    let target = null;
    for (const s of this.shurikens) {
      if (s.windowOpened) {
        target = s;
        break;
      }
    }

    if (target) {
      // Deflect! Reverse horizontal velocity and send it back
      target.vx = Math.abs(target.vx) * 1.2;
      target.vy *= -0.6;
      target.windowOpened = false; // prevent re-triggering

      this.combo += 1;
      const bonus = this.combo;
      this.score += bonus;
      this.scoreText.setText(`Score: ${this.score}`);
      this.comboText.setText(
        this.combo > 1 ? `⚔ COMBO x${this.combo}! +${bonus}` : "⚔ DEFLECT! +1",
      );
      this.time.delayedCall(900, () => {
        if (this.comboText) this.comboText.setText("");
      });

      if (!this.isScreensaver) this.cameras.main.flash(120, 0, 180, 255);
      this.deflectCooldown = 800;

      // Sword flash
      this.drawSword();

      // Small upward nudge as reward
      this.playerBody.setVelocityY(-180);
    }
  }

  openDeflectWindow() {
    // Window duration shortens at level 6
    this.deflectWindowDuration = this.level >= 6 ? 320 : 480;
    this.deflectWindow = true;
    this.deflectWindowTimer = this.deflectWindowDuration;
    this.deflectPrompt.setText("⚔  DEFLECT!  [ENTER]");
    this.deflectPrompt.setVisible(!this.isScreensaver);
    if (!this.isScreensaver) this.cameras.main.flash(60, 255, 80, 0);
  }

  // ----------------------------------------------------------
  //  WIND (levels 3, 5, and 6)
  // ----------------------------------------------------------
  updateWind(deltaMs) {
    if (!this.cfg.hasWind) {
      this.windForce = 0;
      this.windCurrent = 0;
      if (this.windText) this.windText.setText("");
      // Remove any residual horizontal wind velocity
      if (this.playerBody?.body) this.playerBody.body.setAccelerationX(0);
      return;
    }

    // Periodically pick a new wind force
    this.windTimer += deltaMs;
    if (this.windTimer >= this.windInterval) {
      this.windTimer = 0;
      // Level 6 gets stronger gusts
      const maxForce = this.level >= 6 ? 520 : 360;
      const dir = Phaser.Math.Between(0, 1) === 0 ? 1 : -1;
      this.windForce = dir * Phaser.Math.Between(180, maxForce);
      this.windInterval = Phaser.Math.Between(2200, 4500);

      // Wind indicator text
      if (this.windText) {
        const arrow = this.windForce > 0 ? "→→" : "←←";
        const label = this.windForce > 0 ? "TAILWIND" : "HEADWIND";
        this.windText.setText(`${arrow} ${label} ${arrow}`);
        this.windText.setAlpha(1);
        this.tweens.add({
          targets: this.windText,
          alpha: 0.3,
          delay: 1800,
          duration: 800,
          ease: "Sine.easeIn",
        });
      }
    }

    // Smooth wind current towards target (feels natural, not jarring)
    const lerpRate = 3.5 * (deltaMs / 1000);
    this.windCurrent += (this.windForce - this.windCurrent) * lerpRate;

    // Apply as acceleration so Phaser physics handles the actual movement
    // This interacts properly with gravity, jumps and world bounds
    if (this.playerBody?.body) {
      this.playerBody.body.setAccelerationX(this.windCurrent);
    }

    // Clamp player to play area so wind can't push them off-screen
    const minX = this.playX + 14;
    const maxX = this.playX + this.playW * 0.55;
    if (this.playerBody.x < minX) {
      this.playerBody.x = minX;
      if (this.playerBody.body.velocity.x < 0)
        this.playerBody.body.setVelocityX(0);
    }
    if (this.playerBody.x > maxX) {
      this.playerBody.x = maxX;
      if (this.playerBody.body.velocity.x > 0)
        this.playerBody.body.setVelocityX(0);
    }
  }

  // ----------------------------------------------------------
  //  LEVEL FLOW
  // ----------------------------------------------------------
  completeLevel() {
    this.isVictoryDance = true;
    this.deflectWindow = false;
    this.clearDeflectBar();
    this.deflectPrompt.setVisible(false);
    this.physics.world.pause();
    this.playerBody.setVelocity(0, 0);
    for (const o of this.obstacles) o.destroy();
    for (const s of this.shurikens) s.destroy();
    this.obstacles = [];
    this.shurikens = [];

    this.bannerText.setText(`LEVEL ${this.level} COMPLETE`);
    this.bannerText.setVisible(!this.isScreensaver);

    const next = this.level + 1;
    const hints = [
      "",
      "",
      "Speed up!",
      "Moving bamboo and wind!",
      "Ninjas attack — equip sword!",
      "Moving bamboo, wind and shurikens!",
      "Full gauntlet. Good luck.",
    ];
    this.hintText.setText(
      next <= 6 ? `Level ${next}: ${hints[next] || ""}` : "ALL LEVELS CLEARED!",
    );
    this.hintText.setVisible(!this.isScreensaver);

    this.startVictoryDance();
    this.time.delayedCall(1800, () => this.finishVictoryDanceAndAdvance());
  }

  clearVictoryEffects() {
    if (!this.victoryFx) return;
    this.victoryFx.clear(true, true);
    this.victoryFx.destroy();
    this.victoryFx = null;
  }

  startVictoryDance() {
    this.clearVictoryEffects();
    this.victoryFx = this.add.group();

    // Create subtle star particles around the player
    const cx = this.playerBody.x,
      cy = this.playerBody.y - 32;
    for (let i = 0; i < 8; i++) {
      const s = this.add.image(cx, cy, "star");
      s.setScale(0.34 + Math.random() * 0.2);
      s.setAlpha(0.9);
      s.setDepth(905);
      s.orbitAngle = (Math.PI * 2 * i) / 8;
      s.orbitRadius = 18 + (i % 2) * 6;
      s.orbitSpeed = 6 + Math.random() * 4;
      this.victoryFx.add(s);
    }

    // Pick a victory pose with weighted randomness
    const poses = [
      { name: "bow", weight: 4 },
      { name: "arms_fold", weight: 3 },
      { name: "flourish", weight: 3 },
      { name: "small_jump", weight: 6 },
      { name: "dab", weight: 1 },
    ];
    const total = poses.reduce((s, p) => s + p.weight, 0);
    let r = Math.random() * total;
    let pick = poses[0].name;
    for (const p of poses) {
      if (r < p.weight) {
        pick = p.name;
        break;
      }
      r -= p.weight;
    }

    // Common helpers
    const p = this.playerRig.parts;
    const doBow = () => {
      this.tweens.add({
        targets: this.playerRig,
        y: this.playerRig.y + 6,
        duration: 220,
        ease: "Sine.easeInOut",
      });
      this.tweens.add({ targets: p.head, rotation: 0.18, duration: 220 });
    };
    const doArmsFold = () => {
      this.tweens.add({ targets: p.armBack, rotation: 0.25, duration: 240 });
      this.tweens.add({ targets: p.armFront, rotation: -0.25, duration: 240 });
      this.tweens.add({ targets: this.playerRig, scaleX: 1.02, duration: 240 });
    };
    const doFlourish = () => {
      this.tweens.add({ targets: p.armFront, rotation: -2.2, duration: 220 });
      this.tweens.add({
        targets: p.armFront.joint,
        rotation: 0.8,
        duration: 220,
      });
      this.tweens.add({
        targets: this.playerRig,
        rotation: 0.18,
        duration: 220,
        yoyo: true,
        repeat: 2,
      });
    };
    const doSmallJump = () => {
      this.tweens.add({
        targets: this.playerRig,
        y: this.playerRig.y - 26,
        duration: 160,
        yoyo: true,
        ease: "Sine.easeOut",
      });
    };
    const doDab = () => {
      // playful and brief: rotate torso and swing arms
      this.tweens.add({ targets: p.armFront, rotation: -2.6, duration: 200 });
      this.tweens.add({ targets: p.armBack, rotation: 0.6, duration: 200 });
      this.tweens.add({
        targets: this.playerRig,
        rotation: 0.08,
        duration: 200,
      });
    };

    // Execute picked pose
    if (pick === "bow") doBow();
    else if (pick === "arms_fold") doArmsFold();
    else if (pick === "flourish") doFlourish();
    else if (pick === "small_jump") doSmallJump();
    else if (pick === "dab") doDab();

    // gentle orbit of particles
    this.tweens.add({
      targets: this.playerRig,
      duration: 900,
      rotation: "+=0.12",
      ease: "Sine.easeInOut",
    });
  }

  finishVictoryDanceAndAdvance() {
    if (!this.isVictoryDance) return;

    if (this.level >= LEVEL_CONFIGS.length) {
      if (this.isScreensaver) {
        this.restartScreensaver();
        return;
      }
      this.isVictoryDance = false;
      this.isGameComplete = true;
      this.clearVictoryEffects();
      this.bannerText.setText("ALL 6 LEVELS COMPLETE! 🎉");
      this.bannerText.setVisible(!this.isScreensaver);
      this.hintText.setText("ENTER to restart • L for leaderboard");
      this.hintText.setVisible(!this.isScreensaver);
      this.physics.world.pause();
      if (this.isHighScore(this.score)) this.beginHighScoreEntry(this.score);
      return;
    }

    this.level += 1;
    this.applyLevelConfig(this.level);
    this.applyCostume(COSTUMES[this.level] || COSTUMES[1]);
    this.obstaclesSpawned = 0;
    this.obstaclesCleared = 0;
    this.spawnTimer = 0;
    this.windForce = 0;
    this.windCurrent = 0;
    this.windTimer = 0;
    if (this.playerBody?.body) this.playerBody.body.setAccelerationX(0);
    this.combo = 0;

    this.clearVictoryEffects();

    this.playerBody.setPosition(this.playX + this.playW * 0.22, this.H * 0.5);
    this.playerBody.setVelocity(0, 0);

    // Sword visibility
    if (!this.hasSword) {
      this.swordSprite.clear();
      this.swordSprite.setVisible(false);
    }

    this.bannerText.setVisible(false);
    this.hintText.setVisible(false);
    this.windText.setText("");

    // Refresh background palette + scenery
    this.drawBackground();
    this.refreshScenery();
    this.drawAdPanels();

    this.physics.world.resume();
    this.isVictoryDance = false;

    this.levelBadge.setText(`LVL ${this.level}`);
    this.progressText.setText(`Level ${this.level}: 0/${this.levelTarget}`);

    // Level-up flash
    if (!this.isScreensaver) this.cameras.main.flash(300, 255, 255, 255);
  }

  // ----------------------------------------------------------
  //  MAIN LOOP
  // ----------------------------------------------------------
  update(_, deltaMs) {
    if (this.isLeaderboardOpen) return;
    if (this.isScreensaver) {
      // Slowly shift the whole composition so background details do not stay fixed.
      this.cameras.main
        .setZoom(1.04)
        .setScroll(
          Math.sin(this.time.now / 30000) * 12,
          Math.cos(this.time.now / 35000) * 8,
        );
    }

    if (this.isVictoryDance) {
      this.playerRig.x = this.playerBody.x;
      this.playerRig.y = this.playerBody.y;
      if (this.victoryFx) {
        const dt = deltaMs / 1000,
          cx = this.playerBody.x,
          cy = this.playerBody.y - 32;
        this.victoryFx.getChildren().forEach((s) => {
          s.orbitAngle += s.orbitSpeed * dt;
          s.x = cx + Math.cos(s.orbitAngle) * s.orbitRadius;
          s.y = cy + Math.sin(s.orbitAngle) * s.orbitRadius * 0.55;
          s.rotation += 0.12;
        });
      }
      return;
    }

    if (this.isGameOver) {
      if (this.isScreensaver) return;
      this.updateDizzy(deltaMs);
      this.sitSprite.x = this.playerBody.x;
      this.sitSprite.y = this.playerBody.y;
      return;
    }

    if (this.isGameComplete) {
      this.playerRig.x = this.playerBody.x;
      this.playerRig.y = this.playerBody.y;
      return;
    }

    if (this.isScreensaver) {
      const action = getAutoplayAction({
        x: this.playerBody.x,
        y: this.playerBody.y,
        velocityY: this.playerBody.body.velocity.y,
        height: this.H,
        obstacles: this.obstacles,
      });
      if (action.jump) this.handleJump();
      if (this.deflectWindow) this.attemptDeflect();
    }
    this.animateRun(deltaMs);
    this.updateWind(deltaMs);

    if (this.deflectCooldown > 0) this.deflectCooldown -= deltaMs;

    // Spawn obstacles
    this.spawnTimer += deltaMs;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnBambooPair();
    }

    // Move + score obstacles
    const dx = (this.obstacleSpeed * deltaMs) / 1000;

    for (const o of this.obstacles) {
      if (o.isShuriken) continue; // handled separately

      o.x -= dx;

      // Vertical oscillation (moving bamboo)
      if (o.moveAmp !== undefined) {
        o.y =
          o.moveOriginY +
          Math.sin(this.runT * o.moveSpeed) * o.moveAmp * o.moveDir;
      }

      this.syncBody(o);

      // Enemy ninja: follow beam, fire when near player
      if (o.parentBeam !== undefined) {
        const b = o.parentBeam;
        o.x = b.x;
        o.y =
          b.y + (b.isGate ? b.displayHeight * 0.35 : -b.displayHeight * 0.35);

        // Fire shuriken when close enough
        if (
          !o.hasFired &&
          o.x < this.playerBody.x + 280 &&
          o.x > this.playerBody.x - 20 &&
          this.deflectCooldown <= 0
        ) {
          o.hasFired = true;
          this.spawnShuriken(o.x - 16, o.y);
        }
      }

      // Score gate
      if (o.isGate && !o.scored && o.x < this.playerBody.x) {
        o.scored = true;
        this.obstaclesCleared += 1;
        this.score += 1;
        this.combo = 0; // reset combo on clean pass
        this.scoreText.setText(`Score: ${this.score}`);
        this.progressText.setText(
          `Level ${this.level}: ${this.obstaclesCleared}/${this.levelTarget}`,
        );
        if (this.obstaclesCleared >= this.levelTarget) {
          this.completeLevel();
          break;
        }
      }
    }

    // Update shurikens
    if (this.cfg.hasShurikens) this.updateShurikens(deltaMs);

    // Cleanup off-screen
    this.obstacles = this.obstacles.filter((o) => {
      if (o.x < this.playX - 220) {
        o.destroy();
        return false;
      }
      return true;
    });

    // Collision with bamboo
    for (const o of this.obstacles) {
      if (o.parentBeam !== undefined) continue; // enemy ninjas don't collide
      if (o.isShuriken) continue;
      if (
        o.body &&
        this.playerBody.body &&
        this.physics.overlap(this.playerBody, o)
      ) {
        this.gameOver();
        break;
      }
    }

    if (!this.isScreensaver) {
      const offset = Phaser.Math.Clamp(
        this.playerBody.body.velocity.x * 0.06,
        -20,
        20,
      );
      this.cameras.main.setScroll(offset, 0);
    }
    const onGround = !!this.playerBody.body.blocked.down;
    if (!this.wasOnGround && onGround) {
      this.dustEmitter.explode(8, this.playerBody.x, this.playerBody.y + 18);
      if (!this.isScreensaver) this.cameras.main.shake(80, 0.003);
    }
    this.wasOnGround = onGround;

    // Floor
    if (this.playerBody.y > this.H - 10) this.gameOver();

    // Wall bounds (play area)
    if (this.playerBody.x < this.playX + 10)
      this.playerBody.x = this.playX + 10;
  }

  // ----------------------------------------------------------
  //  GAME OVER
  // ----------------------------------------------------------
  gameOver() {
    if (this.isGameOver) return;
    if (this.isScreensaver) {
      this.isGameOver = true;
      this.physics.world.pause();
      this.time.delayedCall(1000, () => this.restartScreensaver());
      return;
    }
    this.isGameOver = true;
    this.inputLocked = true;
    this.restartArmed = false;
    this.combo = 0;

    this.physics.world.pause();
    this.playerBody.setVelocity(0, 0);
    if (this.playerBody?.body) this.playerBody.body.setAccelerationX(0);
    this.playerRig.setVisible(false);
    if (this.swordSprite) this.swordSprite.setVisible(false);

    this.sitSprite.setVisible(true);
    this.sitSprite.x = this.playerBody.x;
    this.sitSprite.y = this.playerBody.y;

    if (this.bgm?.isPlaying) this.bgm.setVolume(0.12);
    if (this.bakaSfx) {
      this.bakaSfx.stop();
      this.bakaSfx.play();
      this.bakaSfx.once("complete", () => {
        if (this.bgm?.isPlaying) this.bgm.stop();
      });
    } else {
      if (this.bgm?.isPlaying) this.bgm.stop();
    }

    this.add
      .image(this.W / 2, this.H / 2, "burst")
      .setScale(1.05)
      .setDepth(900);
    this.add
      .text(this.W / 2, this.H / 2 - 6, "BAKA", {
        fontFamily: "system-ui",
        fontSize: "64px",
        fontStyle: "900",
        color: "#ff1b1b",
        stroke: "#000000",
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setDepth(901);

    this.cameras.main.shake(180, 0.01);
    this.startDizzyStars();

    this.hintText.setText("💥 Oof. Restart in 5s…  (L = leaderboard)");
    this.hintText.setVisible(!this.isScreensaver);

    this.time.delayedCall(this.restartDelayMs, () => {
      if (this.isHighScore(this.score)) {
        this.beginHighScoreEntry(this.score);
        return;
      }
      this.restartArmed = true;
      this.inputLocked = false;
      this.hintText.setText("ENTER to restart • L for leaderboard");
    });
  }

  startDizzyStars() {
    this.dizzyGroup = this.add.group();
    const cx = this.playerBody.x,
      cy = this.playerBody.y - 30;
    for (let i = 0; i < 6; i++) {
      const s = this.add.image(cx, cy, "star");
      s.setScale(0.55);
      s.setAlpha(0.95);
      s.setDepth(905);
      s.orbitAngle = (Math.PI * 2 * i) / 6;
      s.orbitRadius = 22 + (i % 2) * 6;
      s.orbitSpeed = 2.2 + (i % 3) * 0.4;
      this.dizzyGroup.add(s);
    }
    this.birdText = this.add
      .text(cx, cy - 10, "≈  ≈", {
        fontFamily: "system-ui",
        fontSize: "18px",
        color: "#000000",
      })
      .setOrigin(0.5)
      .setAlpha(0.35)
      .setDepth(905);
    this.dizzyTimer = 0;
  }

  updateDizzy(deltaMs) {
    if (!this.dizzyGroup) return;
    this.dizzyTimer += deltaMs;
    const cx = this.playerBody.x,
      cy = this.playerBody.y - 30,
      dt = deltaMs / 1000;
    this.dizzyGroup.getChildren().forEach((s) => {
      s.orbitAngle += s.orbitSpeed * dt;
      s.x = cx + Math.cos(s.orbitAngle) * s.orbitRadius;
      s.y = cy + Math.sin(s.orbitAngle) * s.orbitRadius * 0.55;
      s.rotation += 0.08;
    });
    if (this.birdText) {
      this.birdText.x = cx;
      this.birdText.y = cy - 14 + Math.sin(this.dizzyTimer / 180) * 2.5;
    }
  }

  // ----------------------------------------------------------
  //  LEADERBOARD (localStorage)
  // ----------------------------------------------------------
  loadLeaderboard() {
    return loadLeaderboard(this.storage, LEADERBOARD_KEY, LEADERBOARD_MAX);
  }

  sanitiseName(n) {
    return sanitiseName(n, 12);
  }

  isHighScore(score) {
    return isHighScore(this.storage, LEADERBOARD_KEY, score, LEADERBOARD_MAX);
  }

  addHighScore(name, score) {
    return addHighScore(this.storage, LEADERBOARD_KEY, name, score, {
      max: LEADERBOARD_MAX,
      fallbackName: "SHINOBI",
    });
  }

  // ----------------------------------------------------------
  //  LEADERBOARD OVERLAY
  // ----------------------------------------------------------
  buildLeaderboardOverlay() {
    this.lbPanel = this.add.container(0, 0).setDepth(2000).setVisible(false);
    this.lbScrim = this.add.graphics();
    this.lbBox = this.add.graphics();

    const ts = (size, bold = false) => ({
      fontFamily: "system-ui",
      fontSize: size,
      fontStyle: bold ? "900" : "400",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: bold ? 8 : 5,
    });
    const mono = (size) => ({
      fontFamily: "ui-monospace, Menlo, Monaco, Consolas, monospace",
      fontSize: size,
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 5,
      lineSpacing: 6,
    });

    this.lbTitle = this.add
      .text(0, 0, "LEADERBOARD", ts("28px", true))
      .setOrigin(0.5);
    this.lbBody = this.add.text(0, 0, "", mono("15px")).setOrigin(0.5, 0);
    this.lbHint = this.add
      .text(0, 0, "ESC / ENTER to close • L to toggle", ts("13px"))
      .setOrigin(0.5);

    this.lbNameTitle = this.add
      .text(0, 0, "NEW HIGH SCORE!", { ...ts("22px", true), color: "#ffe66d" })
      .setOrigin(0.5)
      .setVisible(false);
    this.lbNamePrompt = this.add
      .text(0, 0, "Name (A–Z / 0–9):", ts("16px", true))
      .setOrigin(0.5)
      .setVisible(false);
    this.lbNameValue = this.add
      .text(0, 0, "__________", { ...mono("22px"), fontStyle: "900" })
      .setOrigin(0.5)
      .setVisible(false);
    this.lbNameHint = this.add
      .text(0, 0, "Type • ENTER to save • BACKSPACE to delete", ts("13px"))
      .setOrigin(0.5)
      .setVisible(false);

    this.lbPanel.add([
      this.lbScrim,
      this.lbBox,
      this.lbTitle,
      this.lbBody,
      this.lbHint,
      this.lbNameTitle,
      this.lbNamePrompt,
      this.lbNameValue,
      this.lbNameHint,
    ]);
    this.layoutLeaderboardOverlay();
  }

  layoutLeaderboardOverlay() {
    if (!this.lbScrim) return;
    this.lbScrim.clear();
    this.lbScrim.fillStyle(0x000000, 0.55);
    this.lbScrim.fillRect(0, 0, this.W, this.H);
    const bW = Math.min(520, this.W * 0.9),
      bH = Math.min(520, this.H * 0.86);
    const bX = (this.W - bW) / 2,
      bY = (this.H - bH) / 2;
    this.lbBox.clear();
    this.lbBox.fillStyle(0x111827, 0.92);
    this.lbBox.fillRoundedRect(bX, bY, bW, bH, 18);
    this.lbBox.lineStyle(6, 0x000000, 0.55);
    this.lbBox.strokeRoundedRect(bX, bY, bW, bH, 18);
    const cx = this.W / 2;
    this.lbTitle.setPosition(cx, bY + 46);
    this.lbBody.setPosition(cx, bY + 86);
    this.lbHint.setPosition(cx, bY + bH - 26);
    this.lbNameTitle.setPosition(cx, bY + 86);
    this.lbNamePrompt.setPosition(cx, bY + 128);
    this.lbNameValue.setPosition(cx, bY + 164);
    this.lbNameHint.setPosition(cx, bY + 200);
  }

  formatLeaderboardText(board) {
    return formatLeaderboardText(board);
  }

  openLeaderboard({ showNameEntry = false } = {}) {
    if (!this.isLeaderboardOpen) {
      const playing =
        !this.isGameOver && !this.isVictoryDance && !this.isGameComplete;
      this.wasPlayingWhenLeaderboardOpened = playing;
      if (playing) {
        this.physics.world.pause();
        this.playerBody.setVelocity(0, 0);
      }
      this.isLeaderboardOpen = true;
      this.lbPanel.setVisible(true);
      this.inputLocked = true;
    }
    const board = this.loadLeaderboard();
    this.lbBody.setText(this.formatLeaderboardText(board));
    this.setNameEntryUiVisible(!!showNameEntry);
  }

  closeLeaderboard() {
    if (!this.isLeaderboardOpen || this.isNameEntry) return;
    this.lbPanel.setVisible(false);
    this.isLeaderboardOpen = false;
    if (this.wasPlayingWhenLeaderboardOpened) {
      this.physics.world.resume();
      this.inputLocked = false;
    } else if (this.isGameOver && !this.restartArmed) this.inputLocked = true;
    else this.inputLocked = false;
  }

  toggleLeaderboard() {
    if (this.isLeaderboardOpen) {
      if (!this.isNameEntry) this.closeLeaderboard();
      return;
    }
    if (this.isVictoryDance) return;
    this.openLeaderboard({ showNameEntry: false });
  }

  setNameEntryUiVisible(v) {
    this.lbTitle.setVisible(!v);
    this.lbBody.setVisible(!v);
    this.lbHint.setVisible(!v);
    this.lbNameTitle.setVisible(v);
    this.lbNamePrompt.setVisible(v);
    this.lbNameValue.setVisible(v);
    this.lbNameHint.setVisible(v);
  }

  beginHighScoreEntry(score) {
    this.pendingScoreToSave = +score || 0;
    this.nameBuffer = "";
    this.isNameEntry = true;
    this.openLeaderboard({ showNameEntry: true });
    this.lbNameTitle.setText(`NEW HIGH SCORE!  (${this.pendingScoreToSave})`);
    this.updateNameEntryDisplay();
    this.inputLocked = true;
  }

  updateNameEntryDisplay() {
    this.lbNameValue.setText(
      (this.nameBuffer || "").padEnd(12, "_").slice(0, 12),
    );
  }

  flashNameHint(msg) {
    this.lbNameHint.setText(msg);
    if (this.nameEntryFlashTween) {
      this.nameEntryFlashTween.stop();
      this.nameEntryFlashTween = null;
    }
    this.lbNameHint.setAlpha(1);
    this.nameEntryFlashTween = this.tweens.add({
      targets: this.lbNameHint,
      duration: 90,
      alpha: 0.35,
      yoyo: true,
      repeat: 3,
      ease: "Sine.easeInOut",
      onComplete: () => {
        if (this.isNameEntry)
          this.lbNameHint.setText("Type • ENTER to save • BACKSPACE to delete");
        this.lbNameHint.setAlpha(1);
        this.nameEntryFlashTween = null;
      },
    });
  }

  handleBackspace(ev) {
    if (!this.isNameEntry || !this.isLeaderboardOpen) return;
    ev?.preventDefault?.();
    if (this.nameBuffer.length > 0) {
      this.nameBuffer = this.nameBuffer.slice(0, -1);
      this.updateNameEntryDisplay();
    }
  }

  handleNameTyping(ev) {
    if (
      !this.isNameEntry ||
      !this.isLeaderboardOpen ||
      !ev ||
      typeof ev.key !== "string"
    )
      return;
    const k = ev.key;
    if (k === "Enter" || k === "Backspace" || k === "Escape") return;
    if (this.nameBuffer.length >= 12) return;
    const upper = k.length === 1 ? k.toUpperCase() : "";
    if (!/^[A-Z0-9 _-]$/.test(upper)) return;
    this.nameBuffer = this.sanitiseName(this.nameBuffer + upper);
    this.updateNameEntryDisplay();
  }

  submitHighScoreIfPending() {
    if (!this.isNameEntry) return false;
    const clean = this.sanitiseName(this.nameBuffer);
    if (!clean || clean.length < 1) {
      this.flashNameHint("Please enter a name (at least 1 character).");
      return false;
    }
    this.addHighScore(clean, this.pendingScoreToSave ?? 0);
    const board = this.loadLeaderboard();
    this.lbBody.setText(this.formatLeaderboardText(board));
    this.isNameEntry = false;
    this.pendingScoreToSave = null;
    this.nameBuffer = "";
    this.setNameEntryUiVisible(false);
    this.inputLocked = false;
    if (this.isGameOver) {
      this.restartArmed = true;
      this.hintText.setText("ENTER to restart • L for leaderboard");
      this.hintText.setVisible(true);
    }
    return true;
  }
}
