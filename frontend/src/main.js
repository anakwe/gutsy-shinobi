import Phaser from "phaser";
import "./style.css";
import { MainScene } from "./game/MainScene";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  physics: { default: "arcade", arcade: { debug: false } },
  backgroundColor: "#87ceeb",
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [new MainScene()],
});

if (import.meta.hot) import.meta.hot.dispose(() => game.destroy(true));
