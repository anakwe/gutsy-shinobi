import Phaser from "phaser";
import "./screensaver.css";
import { MainScene } from "./game/MainScene";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: 960,
  height: 640,
  backgroundColor: "#000000",
  fps: { target: 30, forceSetTimeOut: true },
  audio: { noAudio: true },
  input: { keyboard: false, mouse: false, touch: false, gamepad: false },
  physics: { default: "arcade", arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [new MainScene({ screensaver: true })],
});

// Both browser preview and native hosts release the game when the page unloads.
const destroy = () => game.destroy(true);
window.addEventListener("pagehide", destroy, { once: true });

if (import.meta.hot)
  import.meta.hot.dispose(() => {
    window.removeEventListener("pagehide", destroy);
    destroy();
  });
