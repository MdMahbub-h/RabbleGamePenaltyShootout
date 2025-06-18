import { GameScene } from "./scenes/GameScene.js";
import { LoadScene } from "./scenes/LoadScene.js";

const game = new Phaser.Game({
  parent: "game",
  type: Phaser.AUTO,
  width: 800,
  height: 1200,
  border: 2,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  dom: {
    createContainer: true,
  },
  input: {
    activePointers: 3,
  },

  scene: [LoadScene, GameScene],
});

function resizeCanvas(width, height, game) {
  let canvas = game.canvas;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  canvas.width = width;
  canvas.height = height;
  game.scale.resize(width, height);
}

window.oncontextmenu = (event) => {
  event.preventDefault();
};

console.warn = () => {
  return false;
};
