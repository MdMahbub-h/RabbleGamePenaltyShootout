class LoadScene extends Phaser.Scene {
  constructor() {
    super("LoadScene");
  }
  preload() {
    this.load.setBaseURL("./assets");
    this.load.plugin(
      "rexroundrectangleplugin",
      "plugins/rexroundrectangleplugin.min.js",
      true
    );
    this.load.image("UIBackground", "backgrounds/UIBackground.png");
    this.load.image("background", "backgrounds/background.png");
    this.load.image("logo", "UI/background-logo.png");
    this.load.image("play", "UI/play-button.png");
    this.load.image("heart", "player/heart.png");
    this.load.image("heart-filled", "player/heart-filled.png");
    this.load.image("star", "collectibles/star.png");
    this.load.image("home", "UI/home-icon.png");
    this.load.image("info", "UI/info.png");
    this.load.image("close", "UI/close.png");
    this.load.image("infoIcon", "UI/info-icon.png");
    this.load.image("userIcon", "UI/user-icon.png");
    this.load.image("soundOn", "UI/soundon-button.png");
    this.load.image("soundOff", "UI/soundoff-button.png");
    this.load.image("unlockedIcon", "UI/unlocked-icon.png");
    this.load.image("leaderboardIcon", "UI/leaderboard-icon.png");
    this.load.image("leaderboardGold", "UI/gold.png");
    this.load.image("leaderboardSilver", "UI/silver.png");
    this.load.image("leaderboardBronze", "UI/bronze.png");
    this.load.image("copyIcon", "UI/copy.png");
    this.load.image("product1", "penalty/ball.png");

    this.load.image("ball", "penalty/ball.png");
    this.load.image("ballShadow", "penalty/duckShadow.png");
    this.load.image("toilet", "penalty/toilet.png");
    this.load.image("goalie", "penalty/goalie.png");
    this.load.image("ground", "penalty/ground.png");
    this.load.image("goal", "penalty/goal.png");

    this.load.audio("jump", "sounds/jump.mp3");

    this.load.audio("product", "sounds/product.mp3");

    this.load.audio("enemy", "sounds/enemy.mp3");

    this.load.audio("lost", "sounds/lost.mp3");

    this.load.audio("woosh", "sounds/Woosh.mp3");
  }
  create() {
    this.scene.start("GameScene");
  }
}
export { LoadScene };
