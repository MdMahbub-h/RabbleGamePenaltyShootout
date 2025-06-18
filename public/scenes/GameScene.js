class GameScene extends Phaser.Scene {
  constructor() {
    super({
      key: "GameScene",
      physics: {
        default: "arcade",
        arcade: {
          debug: false,
        },
      },
    });

    this.configure();

    this.instructionGiven = false;
  }
  configure() {
    this.screen = "home";
    this.score = localStorage.getItem("axa-bird-game-score");
    if (this.score === null) {
      this.score = 0;
    }
    this.highScore = localStorage.getItem("axa-bird-game-highScore");
    if (this.highScore === null) {
      this.highScore = 0;
    }
    this.remember = localStorage.getItem("axa-bird-game-remember");
    if (this.remember === null) {
      this.remember = false;

      this.username = null;

      this.email = null;

      this.news = null;

      this.playerId = null;
    } else if (this.remember) {
      this.username = localStorage.getItem("axa-bird-game-username");
      this.email = localStorage.getItem("axa-bird-game-email");
      this.news = localStorage.getItem("axa-bird-game-news");
      this.playerId = localStorage.getItem("axa-bird-game-playerId");
    }
    // Läs cachade koder från localStorage om de finns
    try {
      const cachedCodes = localStorage.getItem("wc-duck-codes");
      if (cachedCodes) {
        const parsedCodes = JSON.parse(cachedCodes);
        this.codes = Array.isArray(parsedCodes) ? parsedCodes : [];
        console.log("Läste in sparade koder från localStorage:", this.codes);
      } else {
        this.codes = [];
      }
    } catch (error) {
      console.error("Kunde inte läsa koder från localStorage:", error);
      this.codes = [];
    }

    this.unlocked = null;
    this.soundOn = true;
    this.socket = new io();

    this.socket.on("userData", (data) => {
      // Kontrollera att data inte är null innan vi försöker använda dess egenskaper
      if (data) {
        if (data.codes) {
          try {
            const codes = JSON.parse(data.codes);
            if (Array.isArray(codes)) {
              this.codes = codes.sort((a, b) => a.points - b.points);
            }
          } catch (err) {
            // Error parsing codes
          }
        }
        if (data.playerId) {
          this.playerId = data.playerId;
          if (this.remember) {
            localStorage.setItem("axa-bird-game-playerId", data.playerId);
          }
        }
        if (data.score > this.score) {
          this.score = data.score;
          localStorage.setItem("axa-bird-game-score", this.score);
        }
      } else {
        // Received null user data
      }
    });

    if (this.username) {
      this.socket.emit("userData", {
        username: this.username,
        playerId: this.playerId,
      });
    }
    this.socket.on("usernameTaken", () => {
      this.notify(3);
    });
    this.socket.on("newUser", (data) => {
      if (data.remember) {
        this.username = data.username;
        this.email = data.email;
        this.playerId = data.playerId;

        localStorage.setItem("axa-bird-game-username", this.username);
        localStorage.setItem("axa-bird-game-email", this.email);
        localStorage.setItem("axa-bird-game-news", this.news);
        localStorage.setItem("axa-bird-game-remember", this.remember);
        localStorage.setItem("axa-bird-game-playerId", this.playerId);

        // Kontrollera om detta är en ny användare som just registrerat sig
        // eller om det är en befintlig användare som loggar in automatiskt
        if (data.newUser === true) {
          // Om det är en ny användare, visa leaderboard
          this.screen = "leaderboard";
          this.scene.restart();
        }
        // Om det är en befintlig användare som loggar in automatiskt,
        // gör ingenting så att startskärmen visas som vanligt
      } else if (data.newUser === true) {
        // Om det är en ny användare men remember är false,
        // visa ändå leaderboard
        this.screen = "leaderboard";
        this.scene.restart();
      }
    });
    this.socket.on("leaderboard", (data) => {
      this.loader.style.display = "none";

      this.addLeaderboardUI(data);
    });
  }
  create() {
    // Clear any existing DOM elements first
    this.destroyDOMElements();
    this.checkSocket();
  }

  // Destroy all DOM elements
  destroyDOMElements() {
    const elements = [
      "usernameInput",
      "emailInput",
      "agreeCheckBox",
      "agreeCheckBoxMark",
      "signCheckBox",
      "signCheckBoxMark",
      "rememberCheckBox",
      "rememberCheckBoxMark",
    ];

    elements.forEach((elementName) => {
      if (
        this[elementName] &&
        this[elementName].node &&
        this[elementName].node.parentNode
      ) {
        this[elementName].node.parentNode.removeChild(this[elementName].node);
        this[elementName].destroy();
        this[elementName] = null;
      }
    });
  }

  // Override the default shutdown method
  shutdown() {
    // First, stop the game if it's running
    this.playing = false;

    // Clear all physics bodies
    if (this.toiletElements1) {
      this.toiletElements1.destroy();
      this.toiletElements2.destroy();
      this.toiletElements3.destroy();
      this.toiletElements4.destroy();
      this.toiletElements5.destroy();
      this.toiletElements6.destroy();
      this.toiletElements7.destroy();
    }

    if (this.ball) {
      this.ball.destroy();
    }

    // Stop all sounds
    if (this.sound) {
      this.sound.stopAll();
    }

    // Clear all game objects and physics
    this.physics.world.shutdown();

    // Destroy DOM elements
    this.destroyDOMElements();

    // Stop all tweens
    this.tweens.killAll();

    // Stop all timers
    this.time.removeAllEvents();

    // Clear all game objects
    this.children.removeAll();

    // Remove all colliders
    this.physics.world.colliders.destroy();

    // Disconnect socket if it exists
    if (this.socket) {
      this.socket.removeAllListeners();
    }

    // Clear camera effects
    this.cameras.main.resetFX();

    super.shutdown();
  }

  checkSocket() {
    this.loader = document.querySelector("#loader");

    this.socketInterval = setInterval(() => {
      if (this.socket.connected) {
        clearInterval(this.socketInterval);

        loader.style.display = "none";

        this.addUI();
      }
    }, 50);
  }
  addUI() {
    if (this.screen === "home") {
      this.addHomeUI();
      // this.startGame();
    } else if (this.screen === "restart") {
      this.addRestartUI();
    } else if (this.screen === "replay") {
      this.addReplayUI();
    } else if (this.screen === "info") {
      this.addInfoUI();
    } else if (this.screen === "codes") {
      this.addCodesUI();
    } else if (this.screen === "unlocked") {
      this.addUnlockedUI();
    } else if (this.screen === "leaderboard") {
      this.loader.style.display = "block";
      this.socket.emit("leaderboard");
    }
  }
  addHomeUI() {
    this.UIBackground = this.add.image(400, 600, "UIBackground").setScale(1);

    this.infoIcon = this.add
      .image(740, 55, "infoIcon")
      .setScale(0.4)
      .setInteractive();

    this.infoIcon.on("pointerdown", () => {
      this.tweens.add({
        targets: this.infoIcon,
        scale: 0.5,
        duration: 100,

        onComplete: () => {
          this.tweens.add({
            targets: this.infoIcon,
            scale: 0.4,
            duration: 100,

            onComplete: () => {
              this.screen = "info";

              this.scene.restart();
            },
          });
        },
      });
    });

    this.logo = this.add.image(400, 100, "logo").setScale(1);

    this.titleText = this.add
      .text(
        400,
        400,
        "Hopp rundt med WC Duck og få\n poeng når du treffer toalettsetet.\n Bruk musen eller trykk på skjermen\n for å hoppe i forskjellige retninger.\n Få over 1000 poeng for å kunne vinne\n premier. Lykke til!.",
        {
          fontFamily: "RakeslyRG",
          fontSize: "40px",
          color: "#000",
          align: "center",
        }
      )
      .setOrigin(0.5);

    this.optionsContainer = this.add
      .rexRoundRectangle(400, 900, 620, 480, 50, 0xffffff)
      .setDepth(5)
      .setScrollFactor(0);

    this.birdImage = this.add
      .image(670, 655, "ball")
      .setScale(0.5)
      .setDepth(Infinity);

    this.termsText = this.add
      .text(
        400,
        1170,
        "Drevet av Rabble. Ved å spille dette spillet godtar du disse vilkårene og retningslinjene.",
        {
          fontFamily: "RakeslyRG",
          fontSize: "20px",
          color: "#ffffff",
          align: "center",
        }
      )
      .setOrigin(0.5)
      .setInteractive({ cursor: "pointer" });
    this.termsText.on("pointerup", () => {
      const url =
        "https://rabble-res.cloudinary.com/image/upload/v1744101161/offer-content/Konkurranseregler_og_betingelser_1.pdf";
      window.open(url, "_blank");
    });

    this.option1 = this.add
      .rexRoundRectangle(400, 830, 520, 100, 50, 0xf3e3a3)
      .setDepth(5)
      .setScrollFactor(0)
      .setInteractive()
      .setVisible(false);

    this.option1Text = this.add
      .text(400, 830, "Opplåste tilbud", {
        fontFamily: "RakeslyRG",
        fontSize: "32px",
        color: "#000000",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(6)
      .setVisible(false);

    this.option2 = this.add
      .rexRoundRectangle(400, 875, 520, 100, 50, 0xfaa7ab)
      .setDepth(5)
      .setScrollFactor(0)
      .setInteractive();

    this.option2Text = this.add
      .text(400, 875, "Poengtavle", {
        fontFamily: "RakeslyRG",
        fontSize: "32px",
        color: "#000000",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(6);

    this.option3 = this.add
      .rexRoundRectangle(400, 990, 520, 100, 50, 0x4e316e)
      .setDepth(5)
      .setScrollFactor(0)
      .setInteractive();

    this.option3Text = this.add
      .text(400, 990, "Spill", {
        fontFamily: "RakeslyRG",
        fontSize: "32px",
        color: "#fff",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(6);

    this.bestScoreText = this.add
      .text(305, 730, `BESTE: ${this.highScore}`, {
        fontFamily: "RakeslyRG",
        fontSize: "36px",
        stroke: "#000",
        strokeThickness: 1,
        color: "#000",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(6);

    this.lastScoreText = this.add
      .text(480, 730, `SISTE: ${this.score}`, {
        fontFamily: "RakeslyRG",
        fontSize: "36px",
        stroke: "#000",
        strokeThickness: 1,
        color: "#000",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(6);

    this.divider = this.add
      .rectangle(400, 730, 5, 70, 0xeeeeee)
      .setDepth(6)
      .setScrollFactor(0);

    this.option1.on("pointerdown", () => {
      this.tweens.add({
        targets: [this.option1, this.option1Text],
        scale: 0.85,
        duration: 100,

        onComplete: () => {
          this.tweens.add({
            targets: [this.option1, this.option1Text],
            scale: 1,
            duration: 100,

            onComplete: () => {
              this.screen = "codes";
              this.scene.restart();
            },
          });
        },
      });
    });

    this.option2.on("pointerdown", () => {
      this.tweens.add({
        targets: [this.option2, this.option2Text],
        scale: 0.85,
        duration: 100,

        onComplete: () => {
          this.tweens.add({
            targets: [this.option2, this.option2Text],
            scale: 1,
            duration: 100,

            onComplete: () => {
              this.screen = "leaderboard";
              this.scene.restart();
            },
          });
        },
      });
    });

    this.option3.on("pointerdown", () => {
      this.tweens.add({
        targets: [this.option3, this.option3Text],
        scale: 0.85,
        duration: 100,

        onComplete: () => {
          this.tweens.add({
            targets: [this.option3, this.option3Text],
            scale: 1,
            duration: 100,

            onComplete: () => {
              this.elements = [
                this.UIBackground,
                this.logo,
                this.titleText,
                this.optionsContainer,
                this.birdImage,
                this.termsText,
                this.option1,
                this.option1Text,
                this.option2,
                this.option2Text,
                this.option3,
                this.option3Text,
                this.bestScoreText,
                this.lastScoreText,
                this.divider,
                this.infoIcon,
              ];

              this.elements.forEach((element) => {
                element.destroy();
              });

              this.startGame();
            },
          });
        },
      });
    });
  }
  addRestartUI() {
    this.UIBackground = this.add.rectangle(400, 600, 800, 1200, 0xffffff);

    this.homeIcon = this.add
      .image(740, 55, "home")
      .setScale(0.5)
      .setInteractive();

    this.homeIcon.on("pointerdown", () => {
      this.tweens.add({
        targets: this.homeIcon,
        scale: 0.4,
        duration: 100,

        onComplete: () => {
          this.tweens.add({
            targets: this.homeIcon,
            scale: 0.5,
            duration: 100,

            onComplete: () => {
              this.screen = "home";

              this.scene.restart();
            },
          });
        },
      });
    });

    this.scoreBox = this.add
      .rexRoundRectangle(400, 200, 300, 70, 20, 0x4e316e)
      .setDepth(10)
      .setScrollFactor(0);

    this.scoreImage = this.add
      .image(265, 200, "star")
      .setDepth(Infinity)
      .setScrollFactor(0)
      .setScale(0.9);

    this.scoreText = this.add
      .text(400, 200, this.score, {
        fontFamily: "RakeslyRG",
        fontSize: "40px",
        color: "#fff",
        align: "center",
        stroke: "#fff",
        strokeThickness: 1,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(Infinity);

    this.ballImage = this.add
      .image(400, 100, "logo")
      .setScale(0.7)
      .setDepth(Infinity);

    this.titleText = this.add
      .text(
        400,
        330,
        "Ønsker du å sende inn din poengsum? Og være\nmulig å vinne noen fine premier? Brukernavnet\nvil bli vist på poengtavlen.",
        {
          fontFamily: "RakeslyRG",
          fontSize: "36px",
          color: "#000",
          align: "center",
        }
      )
      .setOrigin(0.5);

    this.usernameInput = this.add.dom(400, 470).createElement(
      "input",
      `
            outline: none;
            border: none;
            padding: 0px 30px;
            width: 450px;
            height: 90px;
            font-size: 30px;
            font-weight: bold;
            background: #ebf4f5;
            border-radius: 20px;
        `
    );

    this.usernameInput.node.setAttribute("placeholder", "Brukernavn");
    this.usernameInput.node.setAttribute("maxLength", "15");
    this.usernameInput.node.setAttribute("id", "submit-username-input");
    this.usernameInput.node.setAttribute("name", "submit-username");
    this.usernameInput.node.setAttribute("autocomplete", "username");

    this.emailInput = this.add.dom(400, 580).createElement(
      "input",
      `
            outline: none;
            border: none;
            padding: 0px 30px;
            width: 450px;
            height: 90px;
            font-size: 30px;
            font-weight: bold;
            background: #ebf4f5;
            border-radius: 20px;
        `
    );

    this.emailInput.node.setAttribute("placeholder", "E-post");
    this.emailInput.node.setAttribute("type", "email");
    this.emailInput.node.setAttribute("id", "submit-email-input");
    this.emailInput.node.setAttribute("name", "submit-email");
    this.emailInput.node.setAttribute("autocomplete", "email");

    this.agreeCheckBox = this.add
      .dom(145, 650)
      .createElement(
        "div",
        `
            width: 70px;
            height: 70px;
            background: #ebf4f5;
            border-radius: 20px;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            user-select: none;
            touch-action: manipulation;
        `
      )
      .setInteractive()
      .setOrigin(0);

    this.agreeCheckBoxMark = this.add
      .dom(165, 670)
      .createElement(
        "div",
        `
            width: 30px;
            height: 30px;
            background: #000;
            border-radius: 10px;
            cursor: pointer;
            pointer-events: none;
        `
      )
      .setAlpha(0.6)
      .setVisible(false)
      .setOrigin(0);

    this.agreeText = this.add
      .text(235, 663, "Godta vilkår og retningslinjer?", {
        fontFamily: "RakeslyRG",
        fontSize: "36px",
        color: "#511a73",
        align: "center",
      })
      .setInteractive({ cursor: "pointer" });
    this.agreeText.on("pointerup", () => {
      const url =
        "https://rabble-res.cloudinary.com/image/upload/v1744101161/offer-content/Konkurranseregler_og_betingelser_1.pdf";
      window.open(url, "_blank");
    });

    this.signCheckBox = this.add
      .dom(145, 735)
      .createElement(
        "div",
        `
            width: 70px;
            height: 70px;
            background: #ebf4f5;
            border-radius: 20px;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            user-select: none;
            touch-action: manipulation;
        `
      )
      .setInteractive()
      .setOrigin(0);

    this.signCheckBoxMark = this.add
      .dom(165, 755)
      .createElement(
        "div",
        `
            width: 30px;
            height: 30px;
            background: #000;
            border-radius: 10px;
            cursor: pointer;
            pointer-events: none;
        `
      )
      .setAlpha(0.6)
      .setVisible(false)
      .setOrigin(0);

    this.signText = this.add.text(235, 748, "Meld deg på nyhetsbrev", {
      fontFamily: "RakeslyRG",
      fontSize: "36px",
      color: "#511a73",
      align: "center",
    });

    this.rememberCheckBox = this.add
      .dom(145, 820)
      .createElement(
        "div",
        `
            width: 70px;
            height: 70px;
            background: #ebf4f5;
            border-radius: 20px;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            user-select: none;
            touch-action: manipulation;
        `
      )
      .setInteractive()
      .setOrigin(0);

    this.rememberCheckBoxMark = this.add
      .dom(165, 840)
      .createElement(
        "div",
        `
            width: 30px;
            height: 30px;
            background: #000;
            border-radius: 10px;
            cursor: pointer;
            pointer-events: none;
        `
      )
      .setAlpha(0.6)
      .setVisible(false)
      .setOrigin(0);

    this.agreeText = this.add.text(235, 833, "Husk meg", {
      fontFamily: "RakeslyRG",
      fontSize: "36px",
      color: "#511a73",
      align: "center",
    });

    // Add touch handling flags
    const processingFlags = {
      agree: false,
      sign: false,
      remember: false,
    };

    const handleCheckboxInteraction = (
      checkbox,
      checkboxMark,
      flagKey,
      callback
    ) => {
      if (processingFlags[flagKey]) return;
      processingFlags[flagKey] = true;

      checkboxMark.setVisible(!checkboxMark.visible);
      callback();

      setTimeout(() => {
        processingFlags[flagKey] = false;
      }, 150);
    };

    // Handle both touch and click events
    [
      {
        box: this.agreeCheckBox,
        mark: this.agreeCheckBoxMark,
        flag: "agree",
        callback: () => {
          if (this.agreeCheckBoxMark.visible) {
            this.option1.setAlpha(1);
            this.option1.setInteractive();
          } else {
            this.option1.setAlpha(0.4);
            this.option1.removeInteractive();
          }
        },
      },
      {
        box: this.signCheckBox,
        mark: this.signCheckBoxMark,
        flag: "sign",
        callback: () => {
          this.news = !this.news;
        },
      },
      {
        box: this.rememberCheckBox,
        mark: this.rememberCheckBoxMark,
        flag: "remember",
        callback: () => {
          this.remember = !this.remember;
        },
      },
    ].forEach(({ box, mark, flag, callback }) => {
      // Handle touch events
      box.node.addEventListener(
        "touchstart",
        (e) => {
          if (!processingFlags[flag]) {
            handleCheckboxInteraction(box, mark, flag, callback);
          }
        },
        { passive: true }
      );

      // Handle mouse events through Phaser's system
      box.on("pointerdown", () => {
        if (!processingFlags[flag]) {
          handleCheckboxInteraction(box, mark, flag, callback);
        }
      });
    });

    this.option1 = this.add
      .rexRoundRectangle(400, 980, 520, 100, 50, 0x3e9e79)
      .setDepth(5)
      .setScrollFactor(0)
      .setAlpha(0.4);

    this.option1Text = this.add
      .text(400, 980, "Send inn resultat", {
        fontFamily: "RakeslyRG",
        fontSize: "32px",
        color: "#fff",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(6);

    this.option2 = this.add
      .rexRoundRectangle(400, 1095, 520, 100, 50, 0x4e316e)
      .setDepth(5)
      .setScrollFactor(0)
      .setInteractive();

    this.option2Text = this.add
      .text(400, 1095, "Nei, la oss starte på nytt", {
        fontFamily: "RakeslyRG",
        fontSize: "32px",
        color: "#fff",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(6);

    this.option1.on("pointerdown", () => {
      this.tweens.add({
        targets: [this.option1, this.option1Text],
        scale: 0.85,
        duration: 100,

        onComplete: () => {
          this.tweens.add({
            targets: [this.option1, this.option1Text],
            scale: 1,
            duration: 100,

            onComplete: () => {
              if (this.validateUsername(this.usernameInput.node.value)) {
                if (this.validateEmail(this.emailInput.node.value)) {
                  this.socket.emit(
                    "scoreUpdate",
                    {
                      username: this.usernameInput.node.value,
                      email: this.emailInput.node.value,
                      score: this.score,
                      remember: this.remember,
                      news: this.news,
                      playerId: this.playerId,
                      newUser: true,
                    },
                    (data) => {
                      if (this.remember) {
                        this.username = data.username;
                        this.email = data.email;
                        localStorage.setItem(
                          "axa-bird-game-username",
                          this.username
                        );
                        localStorage.setItem("axa-bird-game-email", this.email);
                        localStorage.setItem("axa-bird-game-news", this.news);
                        localStorage.setItem(
                          "axa-bird-game-remember",
                          this.remember
                        );
                        localStorage.setItem(
                          "axa-bird-game-playerId",
                          this.playerId
                        );
                      }

                      if (data.unlocked) {
                        this.unlocked = data.unlocked;
                        this.screen = "unlocked";
                        this.scene.restart();
                      } else {
                        this.screen = "replay";
                        this.scene.restart();
                      }
                    }
                  );
                } else {
                  this.notify(2);
                }
              } else {
                this.notify(1);
              }
            },
          });
        },
      });
    });

    this.option2.on("pointerdown", () => {
      this.tweens.add({
        targets: [this.option2, this.option2Text],
        scale: 0.85,
        duration: 100,

        onComplete: () => {
          this.tweens.add({
            targets: [this.option2, this.option2Text],
            scale: 1,
            duration: 100,

            onComplete: () => {
              this.elements = [
                this.UIBackground,
                this.homeIcon,
                this.scoreBox,
                this.scoreImage,
                this.scoreText,
                this.ballImage,
                this.titleText,
                this.usernameInput,
                this.emailInput,
                this.agreeCheckBox,
                this.agreeCheckBoxMark,
                this.agreeText,
                this.signCheckBox,
                this.signCheckBoxMark,
                this.signText,
                this.rememberCheckBox,
                this.rememberCheckBoxMark,
                this.agreeText,
                this.option1,
                this.option1Text,
                this.option2,
                this.option2Text,
                this.option2,
                this.termsText,
              ];

              this.elements.forEach((element) => {
                element.destroy();
              });

              this.startGame();
            },
          });
        },
      });
    });

    this.termsText = this.add
      .text(
        400,
        1170,
        "Drevet av Rabble. Ved å spille dette spillet godtar du disse vilkårene og retningslinjene.",
        {
          fontFamily: "RakeslyRG",
          fontSize: "20px",
          color: "#000",
          align: "center",
        }
      )
      .setOrigin(0.5)
      .setInteractive({ cursor: "pointer" });
    this.termsText.on("pointerup", () => {
      const url =
        "https://rabble-res.cloudinary.com/image/upload/v1744101161/offer-content/Konkurranseregler_og_betingelser_1.pdf";
      window.open(url, "_blank");
    });
  }
  addReplayUI() {
    this.background = this.add
      .image(400, 600, "background")
      .setScale(1.4)
      .setScrollFactor(0)
      .setDepth(0);

    this.homeIcon = this.add
      .image(740, 55, "home")
      .setScale(0.4)
      .setInteractive();

    this.homeIcon.on("pointerdown", () => {
      this.tweens.add({
        targets: this.homeIcon,
        scale: 0.5,
        duration: 100,

        onComplete: () => {
          this.tweens.add({
            targets: this.homeIcon,
            scale: 0.4,
            duration: 100,

            onComplete: () => {
              this.screen = "home";

              this.scene.restart();
            },
          });
        },
      });
    });

    this.scoreTitle = this.add
      .text(
        400,
        170,
        this.score > this.tempHighScore
          ? "Ny høyeste poengsum"
          : "Din poengsum",
        {
          fontFamily: "RakeslyRG",
          fontSize: "40px",
          color: "#000",
          align: "center",
          stroke: "#000",
          strokeThickness: 1,
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(Infinity);

    this.scoreBox = this.add
      .rexRoundRectangle(400, 250, 300, 70, 20, 0x4e316e)
      .setDepth(10)
      .setScrollFactor(0);

    this.scoreImage = this.add
      .image(265, 250, "star")
      .setDepth(Infinity)
      .setScrollFactor(0)
      .setScale(0.9);

    this.scoreText = this.add
      .text(400, 250, this.score, {
        fontFamily: "RakeslyRG",
        fontSize: "40px",
        color: "#fff",
        align: "center",
        stroke: "#fff",
        strokeThickness: 1,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(Infinity);

    this.playButton = this.add
      .image(400, 600, "play")
      .setScale(1.3)
      .setInteractive();

    this.playTitle = this.add
      .text(400, 850, "Spill igjen", {
        fontFamily: "RakeslyRG",
        fontSize: "40px",
        color: "#000",
        align: "center",
        stroke: "#000",
        strokeThickness: 1,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(Infinity);

    this.playButton.on("pointerdown", () => {
      this.tweens.add({
        targets: this.playButton,
        scale: 1.1,
        duration: 100,

        onComplete: () => {
          this.tweens.add({
            targets: this.playButton,
            scale: 1.3,
            duration: 100,

            onComplete: () => {
              this.elements = [
                this.background,
                this.homeIcon,
                this.scoreTitle,
                this.scoreBox,
                this.scoreImage,
                this.scoreText,
                this.playButton,
                this.playTitle,
              ];

              this.elements.forEach((element) => {
                element.destroy();
              });

              this.startGame();
            },
          });
        },
      });
    });
  }
  addLeaderboardUI(data) {
    this.background = this.add
      .image(400, 600, "background")
      .setScale(1.4)
      .setScrollFactor(0)
      .setDepth(0);

    if (this.remember) {
      this.userIcon = this.add
        .image(650, 55, "userIcon")
        .setScale(0.5)
        .setInteractive()
        .setScrollFactor(0)
        .setDepth(Infinity);

      this.userIcon.on("pointerdown", () => {
        this.tweens.add({
          targets: this.userIcon,
          scale: 0.4,
          duration: 100,

          onComplete: () => {
            this.tweens.add({
              targets: this.userIcon,
              scale: 0.5,
              duration: 100,

              onComplete: () => {
                this.userIcon.destroy();

                this.notify(4);

                this.username = null;

                this.email = null;

                this.remember = false;

                localStorage.removeItem("axa-bird-game-remember");

                localStorage.removeItem("axa-bird-game-username");

                localStorage.removeItem("axa-bird-game-email");

                localStorage.removeItem("axa-bird-game-playerId");
              },
            });
          },
        });
      });
    }

    this.homeIcon = this.add
      .image(740, 55, "home")
      .setScale(0.4)
      .setInteractive();

    this.homeIcon.on("pointerdown", () => {
      this.tweens.add({
        targets: this.homeIcon,
        scale: 0.5,
        duration: 100,

        onComplete: () => {
          this.tweens.add({
            targets: this.homeIcon,
            scale: 0.4,
            duration: 100,

            onComplete: () => {
              this.screen = "home";

              this.scene.restart();
            },
          });
        },
      });
    });

    this.leaderboardImage = this.add.image(400, 170, "leaderboardIcon");

    this.leaderboardTitle = this.add
      .text(400, 310, "Poengtavle", {
        fontFamily: "RakeslyRG",
        fontSize: "45px",
        color: "#000",
        align: "center",
        stroke: "#000",
        strokeThickness: 1,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(Infinity);

    this.scores = Object.entries(data)
      .map((score) => {
        return score[1];
      })
      .sort((a, b) => b.score - a.score);

    this.players = this.add.dom(400, 375, "div");

    this.players.node.style = `
            margin: 0px 0px 0px -300px;
            padding: 0px 20px 0px 0px;
            width: 600px;
            height: 770px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            overflow-y: auto;
        `;

    this.players.node.innerHTML = ``;

    this.scores.forEach((user, index) => {
      this.players.node.innerHTML += `
                <div class="scoreBox">
                    <div class="scoreImageBox">
                        ${
                          index < 3
                            ? `<img class="scoreImage" src="assets/positions/${
                                index + 1
                              }.png"/>`
                            : `<div class="scoreText"> ${index + 1}. </div>`
                        }
                    </div>
  
                    <div class="${
                      user.username === this.username
                        ? "scoreTitlePlus"
                        : "scoreTitle"
                    }">
                        ${user.username}
                    </div>
  
                    <div class="${
                      user.username === this.username
                        ? "scoreValuePlus"
                        : "scoreValue"
                    }">
                        ${user.score}
                    </div>
                </div>
            `;
    });
  }
  addCodesUI() {
    console.log("===== Bygger UI för upplåsta koder i WC-Duck =====");

    // Kolla om det finns en nyligen upplåst kod som ska visas
    if (this.unlocked) {
      console.log(
        "Det finns en nyligen upplåst kod som inte är sparad:",
        this.unlocked
      );

      // Se till att this.codes är en array
      if (!Array.isArray(this.codes)) {
        this.codes = [];
      }

      // Lägg till den upplåsta koden i this.codes om den inte redan finns där
      const isExisting = this.codes.some((c) => {
        // Jämför både strängar och objekt
        if (typeof c === "object" && c !== null && c.code) {
          return (
            c.code ===
            (typeof this.unlocked === "object"
              ? this.unlocked.code
              : this.unlocked)
          );
        } else if (typeof c === "string") {
          return (
            c ===
            (typeof this.unlocked === "object"
              ? this.unlocked.code
              : this.unlocked)
          );
        }
        return false;
      });

      if (!isExisting) {
        this.codes.push(this.unlocked);
        console.log("Lade till ny kod i this.codes:", this.unlocked);

        // Spara i localStorage för persistens
        try {
          localStorage.setItem("wc-duck-codes", JSON.stringify(this.codes));
          console.log("Sparade uppdaterade koder i localStorage:", this.codes);
        } catch (error) {
          console.error("Kunde inte spara koder i localStorage:", error);
        }
      }

      // Nollställ unlocked så att vi inte lägger till den igen
      this.unlocked = null;
    }

    console.log("Koder som ska visas:", this.codes);

    // Uppdatera UI
    this.background = this.add
      .image(400, 600, "background")
      .setScale(1.4)
      .setScrollFactor(0)
      .setDepth(0);

    this.homeIcon = this.add
      .image(740, 55, "home")
      .setScale(0.4)
      .setInteractive();

    this.homeIcon.on("pointerdown", () => {
      this.tweens.add({
        targets: this.homeIcon,
        scale: 0.5,
        duration: 100,

        onComplete: () => {
          this.tweens.add({
            targets: this.homeIcon,
            scale: 0.4,
            duration: 100,

            onComplete: () => {
              this.screen = "home";
              this.scene.restart();
            },
          });
        },
      });
    });

    this.unlockedImage = this.add.image(400, 170, "unlockedIcon");

    this.unlockedTitle = this.add
      .text(400, 310, "Opplåste koder", {
        fontFamily: "RakeslyRG",
        fontSize: "45px",
        color: "#000",
        align: "center",
        stroke: "#000",
        strokeThickness: 1,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(Infinity);

    // Visa ett meddelande om inga koder finns
    if (!Array.isArray(this.codes) || this.codes.length === 0) {
      this.add
        .text(400, 450, "Inga opplåste koder ännu", {
          fontFamily: "RakeslyRG",
          fontSize: "28px",
          color: "#000",
          align: "center",
          stroke: "#000",
          strokeThickness: 1,
        })
        .setOrigin(0.5);
      return;
    }

    // Visa alla tillgängliga koder
    this.codes.forEach((code, index) => {
      const y = 450 + index * 110;

      // Hantera både strängar och objekt med kod
      const codeObj =
        typeof code === "string" ? { code: code, points: "Rabble" } : code;

      const codeBox = this.add
        .rexRoundRectangle(400, y, 520, 100, 20, 0xffffff)
        .setDepth(5)
        .setScrollFactor(0);

      const scoreImage = this.add
        .image(192, y, "star")
        .setDepth(Infinity)
        .setScrollFactor(0)
        .setScale(0.7);

      const scoreText = this.add
        .text(300, y, `${codeObj.points} poeng`, {
          fontFamily: "RakeslyRG",
          fontSize: "32px",
          color: "#000",
          align: "center",
        })
        .setOrigin(0.5)
        .setDepth(6);

      const codeText = this.add
        .text(515, y, codeObj.code, {
          fontFamily: "RakeslyRG",
          fontSize: "32px",
          color: "#000",
          align: "center",
        })
        .setOrigin(0.5)
        .setDepth(6);

      const codeCopy = this.add
        .image(610, y - 3, "copyIcon")
        .setDepth(Infinity)
        .setScrollFactor(0)
        .setScale(0.1)
        .setInteractive();

      codeCopy.on("pointerdown", () => {
        this.tweens.add({
          targets: codeCopy,
          scale: 0.08,
          duration: 100,

          onComplete: () => {
            this.tweens.add({
              targets: codeCopy,
              scale: 0.1,
              duration: 100,

              onComplete: () => {
                try {
                  navigator.clipboard.writeText(codeObj.code);
                  this.notify(5);
                } catch (err) {
                  console.error("Kunde inte kopiera till urklipp:", err);
                  this.notify(4);
                }
              },
            });
          },
        });
      });
    });

    this.rabbleButton = this.add
      .rexRoundRectangle(400, 1060, 420, 100, 50, 0x4e316e)
      .setDepth(5)
      .setScrollFactor(0)
      .setInteractive()
      .on("pointerdown", () => window.open("https://www.rabble.no/", "_blank"));

    this.rabbleButtonText = this.add
      .text(400, 1060, "Gå til Rabble", {
        fontFamily: "RakeslyRG",
        fontSize: "32px",
        color: "#fff",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(6);

    this.rabbleButton.on("pointerdown", () => {
      this.tweens.add({
        targets: [this.rabbleButton, this.rabbleButtonText],
        scale: 0.85,
        duration: 100,

        onComplete: () => {
          this.tweens.add({
            targets: [this.rabbleButton, this.rabbleButtonText],
            scale: 1,
            duration: 100,

            onComplete: () => {},
          });
        },
      });
    });
  }
  addUnlockedUI() {
    this.UIBackground = this.add.rectangle(400, 600, 800, 1200, 0xffffff);

    this.homeIcon = this.add
      .image(740, 55, "home")
      .setScale(0.5)
      .setInteractive();

    this.homeIcon.on("pointerdown", () => {
      this.tweens.add({
        targets: this.homeIcon,
        scale: 0.4,
        duration: 100,

        onComplete: () => {
          this.tweens.add({
            targets: this.homeIcon,
            scale: 0.5,
            duration: 100,

            onComplete: () => {
              this.screen = "home";

              this.scene.restart();
            },
          });
        },
      });
    });

    this.scoreBox = this.add
      .rexRoundRectangle(400, 200, 300, 70, 20, 0x4e316e)
      .setDepth(10)
      .setScrollFactor(0);

    this.scoreImage = this.add
      .image(265, 200, "star")
      .setDepth(Infinity)
      .setScrollFactor(0)
      .setScale(0.9);

    this.scoreText = this.add
      .text(400, 200, this.score, {
        fontFamily: "RakeslyRG",
        fontSize: "40px",
        color: "#fff",
        align: "center",
        stroke: "#fff",
        strokeThickness: 1,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(Infinity);

    this.ballImage = this.add
      .image(400, 100, "logo")
      .setScale(0.7)
      .setDepth(Infinity);

    console.log("===== Bygger gratulationsskärm för WC-Duck =====");
    console.log("Upplåst kod:", this.unlocked);

    if (!this.unlocked) {
      console.error("Ingen upplåst kod hittades!");
      this.scene.restart();
      return;
    }

    // Hantera olika format på upplåsta koder (både objekt och strängar)
    const unlockedCode =
      typeof this.unlocked === "object" && this.unlocked !== null
        ? this.unlocked.code || "Kod saknas"
        : typeof this.unlocked === "string"
        ? this.unlocked
        : "Kod hittades";

    const unlockedPoints =
      typeof this.unlocked === "object" &&
      this.unlocked !== null &&
      this.unlocked.points
        ? this.unlocked.points
        : "50";

    console.log("Använder kod:", unlockedCode);
    console.log("Använder poäng:", unlockedPoints);

    this.titleText = this.add
      .text(
        400,
        340,
        `Gratulerer! Du fikk over ${unlockedPoints}\npoeng og låste opp et spesielt\ntilbud i Rabble.`,
        {
          fontFamily: "RakeslyRG",
          fontSize: "40px",
          color: "#000",
          align: "center",
        }
      )
      .setOrigin(0.5);

    this.productImage = this.add.image(400, 595, "product1").setScale(1.1);

    this.productBox = this.add
      .rexRoundRectangle(400, 850, 520, 100, 20, 0xebf4f5)
      .setDepth(Infinity)
      .setScrollFactor(0);

    this.codeText = this.add
      .text(235, 850, unlockedCode, {
        fontFamily: "RakeslyRG",
        fontSize: "35px",
        color: "#000",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(Infinity);

    this.codeCopy = this.add
      .image(485, 850, "copyIcon")
      .setDepth(Infinity)
      .setScrollFactor(0)
      .setScale(0.1)
      .setInteractive();

    this.copyCodeText = this.add
      .text(575, 850, "Kopier kode", {
        fontFamily: "RakeslyRG",
        fontSize: "32px",
        color: "#bababa",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(Infinity)
      .setInteractive();

    // Vi använder samma unlockedCode som tidigare definierats
    this.codeCopy.on("pointerdown", () => {
      this.tweens.add({
        targets: this.codeCopy,
        scale: 0.08,
        duration: 100,

        onComplete: () => {
          this.tweens.add({
            targets: this.codeCopy,
            scale: 0.1,
            duration: 100,

            onComplete: () => {
              try {
                navigator.clipboard.writeText(unlockedCode);
                this.notify(6);
                console.log("Kopierade kod till urklipp:", unlockedCode);
              } catch (err) {
                console.error("Kunde inte kopiera till urklipp:", err);
                this.notify(4);
              }
            },
          });
        },
      });
    });

    this.copyCodeText.on("pointerdown", () => {
      this.tweens.add({
        targets: this.codeCopy,
        scale: 0.08,
        duration: 100,

        onComplete: () => {
          this.tweens.add({
            targets: this.codeCopy,
            scale: 0.1,
            duration: 100,

            onComplete: () => {
              try {
                navigator.clipboard.writeText(unlockedCode);
                this.notify(6);
                console.log("Kopierade kod till urklipp:", unlockedCode);
              } catch (err) {
                console.error("Kunde inte kopiera till urklipp:", err);
                this.notify(4);
              }
            },
          });
        },
      });
    });

    this.option1 = this.add
      .rexRoundRectangle(400, 975, 520, 100, 50, 0x335519)
      .setDepth(5)
      .setScrollFactor(0)
      .setInteractive();

    this.option1Text = this.add
      .text(400, 975, "Innløs kode på Rabble", {
        fontFamily: "RakeslyRG",
        fontSize: "32px",
        color: "#fff",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(6);

    this.option2 = this.add
      .rexRoundRectangle(400, 1090, 520, 100, 50, 0x4e316e)
      .setDepth(5)
      .setScrollFactor(0)
      .setInteractive();

    this.option2Text = this.add
      .text(400, 1090, "Spill igjen", {
        fontFamily: "RakeslyRG",
        fontSize: "32px",
        color: "#fff",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(6);

    this.option1.on("pointerdown", () => {
      this.tweens.add({
        targets: [this.option1, this.option1Text],
        scale: 0.85,
        duration: 100,

        onComplete: () => {
          this.tweens.add({
            targets: [this.option1, this.option1Text],
            scale: 1,
            duration: 100,

            onComplete: () => {},
          });
        },
      });
    });

    this.option2.on("pointerdown", () => {
      this.tweens.add({
        targets: [this.option2, this.option2Text],
        scale: 0.85,
        duration: 100,

        onComplete: () => {
          this.tweens.add({
            targets: [this.option2, this.option2Text],
            scale: 1,
            duration: 100,

            onComplete: () => {
              let elements = [
                this.UIackground,
                this.homeIcon,
                this.scoreBox,
                this.scoreImage,
                this.scoreText,
                this.ballImage,
                this.titleText,
                this.productImage,
                this.productBox,
                this.codeText,
                this.codeCopy,
                this.copyCodeText,
                this.option1,
                this.option1Text,
                this.option2,
                this.option2Text,
                this.termsText,
              ];

              elements.forEach((element) => {
                if (element) {
                  element.destroy();
                }
              });

              this.startGame();
            },
          });
        },
      });
    });

    this.termsText = this.add
      .text(
        400,
        1170,
        "Drevet av Rabble. Ved å spille dette spillet godtar du disse vilkårene og retningslinjene.",
        {
          fontFamily: "RakeslyRG",
          fontSize: "20px",
          color: "#000",
          align: "center",
        }
      )
      .setOrigin(0.5)
      .setInteractive({ cursor: "pointer" });
    this.termsText.on("pointerup", () => {
      const url =
        "https://rabble-res.cloudinary.com/image/upload/v1744101161/offer-content/Konkurranseregler_og_betingelser_1.pdf";
      window.open(url, "_blank");
    });
  }
  addInfoUI() {
    this.UIBackground = this.add.rectangle(400, 600, 800, 1200, 0xffffff);

    this.homeIcon = this.add
      .image(740, 55, "home")
      .setScale(0.4)
      .setInteractive();

    this.homeIcon.on("pointerdown", () => {
      this.tweens.add({
        targets: this.homeIcon,
        scale: 0.4,
        duration: 100,

        onComplete: () => {
          this.tweens.add({
            targets: this.homeIcon,
            scale: 0.5,
            duration: 100,

            onComplete: () => {
              this.screen = "home";

              this.scene.restart();
            },
          });
        },
      });
    });

    this.infoImage = this.add.image(400, 170, "info").setScale();

    this.infoTitle = this.add
      .text(400, 310, "Informasjon", {
        fontFamily: "RakeslyRG",
        fontSize: "40px",
        color: "#000",
        align: "center",
        stroke: "#000",
        strokeThickness: 1,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(Infinity);

    this.infoText = this.add
      .text(
        400,
        710,
        "Hopp rundt med WC Duck og få\n poeng når du treffer toalettsetet.\n\n Bruk musen eller trykk på skjermen\n for å hoppe i forskjellige retninger.\n\n Få over 1000 poeng for \nå kunne vinne premier.\n\n Lykke til!.",
        {
          fontFamily: "RakeslyRG",
          fontSize: "35px",
          color: "#000",
          align: "center",
          stroke: "#000",
          strokeThickness: 0,
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(Infinity);
  }
  validateEmail(value) {
    const validRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

    if (value.match(validRegex)) {
      return true;
    } else {
      return false;
    }
  }
  validateUsername(value) {
    // Define the regex pattern to disallow certain characters
    const pattern = /[ .$#[\]\/\x00-\x1F\x7F]/;
    // Test the input string against the pattern
    if (pattern.test(value)) {
      return false; // Invalid string (contains disallowed characters)
    }
    return true; // Valid string
  }

  startGame() {
    // resizeCanvas(800, 600, this.game);
    this.lost = false;
    this.speed = 1000;

    this.veriables();

    this.addBackground();
    this.addGameUI();
    this.addSounds();
    this.addScores();
    this.addLife();

    this.playerAndElements();
    this.addProgress();

    if (!this.instructionGiven) {
      this.instructionBox = this.add
        .rexRoundRectangle(400, 600, 700, 600, 30, 0xffffff)
        .setDepth(10)
        .setScrollFactor(0)
        .setOrigin(0.5);
      this.instructionText1 = this.add
        .text(400, 370, "Hvordan spille", {
          fontFamily: "RakeslyRG",
          fontSize: "50px",
          color: "#000",
          align: "center",
          stroke: "#000",
        })
        .setDepth(11)
        .setOrigin(0.5, 0);
      this.instructionText2 = this.add
        .text(
          400,
          480,
          "Klikk eller trykk på venstre eller høyre \nside avskjermen for å hoppe til venstre \neller høyre retning. Du må vaske toalettet\n med WC Duck. La oss vaske.",
          {
            fontFamily: "RakeslyRG",
            fontSize: "40px",
            color: "#000",
            align: "center",
            stroke: "#000",
            lineSpacing: 20,
          }
        )
        .setDepth(11)
        .setOrigin(0.5, 0);

      this.closeIcon = this.add
        .image(680, 370, "close")
        .setDepth(11)
        .setInteractive({ cursor: "pointer" });
      this.closeIcon.on("pointerdown", () => {
        this.tweens.add({
          targets: this.closeIcon,
          scale: 0.9,
          duration: 100,

          onComplete: () => {
            this.tweens.add({
              targets: this.closeIcon,
              scale: 1,
              duration: 100,

              onComplete: () => {
                this.tweens.add({
                  targets: [
                    this.closeIcon,
                    this.instructionBox,
                    this.instructionText1,
                    this.instructionText2,
                  ],
                  alpha: { from: 1, to: 0.3 },
                  duration: 200,
                  onComplete: () => {
                    this.instructionGiven = true;
                    this.closeIcon.destroy();
                    this.instructionBox.destroy();
                    this.instructionText1.destroy();
                    this.instructionText2.destroy();

                    this.start();
                  },
                });
              },
            });
          },
        });
      });
    } else {
      this.start();
    }
  }
  veriables() {
    this.ball = null;
    this.hoop = null;
    this.left_rim = null;
    this.right_rim = null;
    this.front_rim = null;

    this.score = 0;
    this.high_score = 0;
    this.score_text = null;
    this.high_text = null;
    this.high_score_text = null;

    this.gameWon = false;
    this.emoji = null;
    this.emojiName = null;
    this.isDown = false;
    this.start_location = null;
    this.end_location = null;
    this.fall = false;
    this.pressedAt = null;
    this.releasedAt = null;
    this.getResult = true;
    this.saved = false;
    this.goalScored = false;
    this.goalieMoveAble = false;
    this.goalieSpeed = 1;
  }

  addBackground() {
    this.background = this.add
      .image(400, 600, "background")
      .setScale(1.01)
      .setScrollFactor(0)
      .setDepth(0);

    this.goalie = this.physics.add
      .image(400, 520, "goalie")
      .setScale(0.5)
      .setSize(300, 500)
      .setScrollFactor(0)
      .setDepth(3);
  }
  addGameUI() {
    this.homeIcon = this.add
      .image(660, 55, "home")
      .setScale(0.4)
      .setInteractive()
      .setScrollFactor(0)
      .setDepth(Infinity);
    this.homeIcon.on("pointerdown", () => {
      this.tweens.add({
        targets: this.homeIcon,
        scale: 0.3,
        duration: 100,
        onComplete: () => {
          this.tweens.add({
            targets: this.homeIcon,
            scale: 0.4,
            duration: 100,
            onComplete: () => {
              this.playing = false;
              this.screen = "home";
              this.scene.restart();
            },
          });
        },
      });
    });

    this.soundIcon = this.add
      .image(740, 55, this.soundOn ? "soundOn" : "soundOff")
      .setScale(0.4)
      .setInteractive()
      .setScrollFactor(0)
      .setDepth(Infinity);

    this.soundIcon.on("pointerdown", () => {
      this.tweens.add({
        targets: this.soundIcon,
        scale: 0.3,
        duration: 100,

        onComplete: () => {
          this.tweens.add({
            targets: this.soundIcon,
            scale: 0.4,
            duration: 100,

            onComplete: () => {
              if (this.soundOn) {
                this.sound.stopAll();

                this.soundOn = false;

                this.soundIcon.setTexture("soundOff");
              } else {
                this.soundOn = true;

                this.soundIcon.setTexture("soundOn");
              }
            },
          });
        },
      });
    });

    this.cursors = this.input.keyboard.createCursorKeys();
  }
  addSounds() {
    this.jumpSound = this.sound.add("jump");
    this.productSound = this.sound.add("product");
    this.lostSound = this.sound.add("lost");
    this.hoopSound = this.sound.add("woosh");
  }
  addScores() {
    this.score = 0;

    this.scoreBox = this.add
      .rexRoundRectangle(60, 32, 140, 45, 15, 0x4e316e)
      .setDepth(10)
      .setScrollFactor(0)
      .setOrigin(0);

    this.scoreImage = this.add
      .image(65, 55, "star")
      .setDepth(Infinity)
      .setScrollFactor(0)
      .setScale(0.6);

    this.scoreText = this.add
      .text(140, 55, this.score, {
        fontFamily: "RakeslyRG",
        fontSize: "28px",
        color: "#fff",
        align: "center",
        stroke: "#fff",
        strokeThickness: 1,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(Infinity);
  }

  addLife() {
    this.life = 3;
    this.lifes = [];
    // this.lifeBox = this.add
    //   .rexRoundRectangle(340, 33, 140, 45, 15, 0x4e316e)
    //   .setDepth(10)
    //   .setScrollFactor(0)
    //   .setOrigin(0);

    for (let i = 0; i < 3; i++) {
      this.lifeImage = this.add
        .image(300 + 70 + i * 40, 55, "heart")
        .setDepth(Infinity)
        .setScrollFactor(0)
        .setScale(0.8);
    }
    for (let i = 0; i < this.life; i++) {
      this.lifeImage = this.add
        .image(300 + 70 + i * 40, 55, "heart-filled")
        .setDepth(Infinity)
        .setScrollFactor(0)
        .setScale(0.8);
      this.lifes.push(this.lifeImage);
    }
  }

  playerAndElements() {
    this.ball = this.physics.add
      .sprite(400, 1090, "ball")
      .setDepth(5)
      .setScale(0.45)
      .setCircle(110)
      .setBounce(0.6);
    this.ball.launched = false;
    this.ballShadow = this.add
      .image(400, 1140, "ballShadow")
      .setDepth(1)
      .setAlpha(0.1)
      .setScale(0.15, 0.1);

    this.goal = this.physics.add
      .image(400, 460, "goal")
      .setDepth(-1)
      .setSize(580, 260);

    // this.leftBar = this.physics.add
    //   .image(400, 460, "ballShadow")
    //   .setDepth(-1)
    //   .setSize(600, 280);

    this.physics.add.overlap(
      this.ball,
      this.goalie,
      this.handleGoalieOverlap,
      null,
      this
    );
    this.physics.add.overlap(
      this.ball,
      this.goal,
      this.handleGoalOverlap,
      null,
      this
    );
  }

  handleGoalieOverlap() {
    if (
      this.ball.body.velocity.x == 0 &&
      this.ball.body.velocity.y == 0 &&
      this.getResult
    ) {
      this.ball.body.velocity.x = this.oldVelocityX;
      this.ball.body.velocity.y = -this.oldVelocityY / 2;
      let goalText = this.add
        .text(400, 280, "MISSED!", {
          fontFamily: "RakeslyRG",
          fontSize: "50px",
          color: "#f23",
          align: "center",
          stroke: "#f23",
          strokeThickness: 1,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(Infinity);
      this.time.delayedCall(500, () => {
        goalText.destroy();
      });

      this.getResult = false;
      this.saved = true;
      this.life -= 1;
      this.lifes[this.life].destroy();
      if (this.life == 0) {
        this.lost = true;
        this.checkPlayerLost();
      }
    }
  }

  handleGoalOverlap() {
    if (
      this.ball.body.velocity.x == 0 &&
      this.ball.body.velocity.y == 0 &&
      this.getResult
    ) {
      if (this.saved == false) {
        this.goalScored = true;
        this.getResult = false;
        this.score += 5;
        this.productSound.play();
        this.updateScore();

        let goalText = this.add
          .text(400, 280, "GOAL!!!", {
            fontFamily: "RakeslyRG",
            fontSize: "50px",
            color: "#2d3",
            align: "center",
            stroke: "#2d3",
            strokeThickness: 1,
          })
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(Infinity);
        this.time.delayedCall(500, () => {
          goalText.destroy();
        });
      }
    }
  }

  launchBall(angle, delay) {
    if (this.ball.launched === false) {
      this.goalieMove();
      this.ballShadow.setVisible(false);
      // this.updateProgress();
      this.progressDecreasing = false;
      let vel_x =
        (Math.sin((angle * Math.PI) / 180) * this.speed) / (delay * 1.5);
      let vel_y =
        (-Math.cos(-(angle * Math.PI) / 180) * this.speed) / (delay * 1.5);

      this.ball.body.setGravity(0, 500);
      this.ball.body.setVelocity(vel_x, vel_y);
      this.ball.launched = true;
      this.hoopSound.play();

      let velocity = Math.sqrt(vel_x ** 2 + vel_y ** 2);
      let delayGoal = (1000 * 800) / velocity;

      // delayGoal();
      setTimeout(() => {
        this.ball.setGravity(0, 0);
        this.oldVelocityX = this.ball.body.velocity.x;
        this.oldVelocityY = this.ball.body.velocity.y;
        this.ball.setVelocity(0, 0);
        setTimeout(() => {
          if (!this.goalScored && !this.saved) {
            this.life -= 1;
            this.lifes[this.life].destroy();
            console.log(this.ball.x, this.ball.body.x);
            if (this.ball.x > 40 && this.ball.x < 760) {
              this.ball.body.velocity.x = this.oldVelocityX;
              this.ball.body.velocity.y = -this.oldVelocityY / 2;
            }
            let goalText = this.add
              .text(400, 280, "MISSED!", {
                fontFamily: "RakeslyRG",
                fontSize: "50px",
                color: "#f23",
                align: "center",
                stroke: "#f23",
                strokeThickness: 1,
              })
              .setOrigin(0.5)
              .setScrollFactor(0)
              .setDepth(Infinity);
            this.time.delayedCall(500, () => {
              goalText.destroy();
            });
            if (this.life == 0) {
              this.lost = true;
              this.checkPlayerLost();
            }
          }
        }, 15);

        setTimeout(() => {
          this.resetBall();
          this.progressDecreasing = true;
        }, 500);
      }, delayGoal);
    }
  }

  resetBall() {
    this.goalChecked = false;
    this.goalieChecked = false;
    this.saved = false;
    this.goalScored = false;
    this.ball.isBelowHoop = false;
    this.ball.launched = false;
    this.getResult = true;
    this.ballShadow.setVisible(true);
    let xpos;
    if (this.score <= 10) {
      xpos = this.scale.width / 2;
    } else if (this.score <= 10) {
      xpos = Math.random() * (this.scale.width - 300) + 150;
    } else if (this.score <= 20) {
      xpos = Math.random() * (this.scale.width - 300) + 150;
      this.goalieMoveAble = true;
      this.goalieSpeed = 1.1;
    } else if (this.score <= 30) {
      xpos = Math.random() * (this.scale.width - 300) + 150;
      this.goalieMoveAble = true;
      this.goalieSpeed = 1.2;
    } else {
      xpos = Math.random() * (this.scale.width - 300) + 150;
      this.goalieMoveAble = true;
      this.goalieSpeed = 1.3;
    }
    this.ball.setScale(0.45);
    this.goalie.setPosition(this.scale.width / 2, 520);
    this.ball.setGravity(0, 0);
    this.ball.setVelocity(0, 0);
    this.ball.setPosition(xpos, this.scale.height - 110);
  }

  goalieMove() {
    if (this.goalieMoveAble) {
      let direction = Math.random() * 10;
      this.tweens.add({
        targets: this.goalie,
        x: () => {
          if (direction < 4) {
            return 200;
          } else if (direction < 8) {
            return 600;
          } else {
            return 400;
          }
        },
        duration: 1000 / this.goalieSpeed,
        ease: "Linear",
        onComplete: () => {
          setTimeout(() => {
            this.goalie.setPosition(this.scale.width / 2, 520);
          }, 300);
        },
      });
    }
  }

  scaleBall() {
    const minValue = 0.25;
    const maxValue = 0.45;
    const minDist = 0;
    const maxDist = 1000;
    if (this.ball.body.velocity.y < 0) {
      const dist = Phaser.Math.Distance.Between(
        this.scale.width / 2,
        this.scale.height - 100,
        this.ball.x,
        this.ball.y
      );
      const scale = this.mapDistanceToScale(
        dist,
        minDist,
        maxDist,
        minValue,
        maxValue
      );
      this.ball.setScale(scale * 0.8);
    }
  }

  press(pointer) {
    // console.log(this.start_location);
    this.start_location = { x: pointer.x, y: pointer.y };
    this.isDown = true;
    this.pressedAt = new Date();
  }

  release(pointer) {
    // console.log(this.end_location);
    if (this.isDown) {
      this.isDown = false;
      this.releasedAt = new Date();
      this.end_location = { x: pointer.x, y: pointer.y };
      let delay = this.releasedAt.getTime() - this.pressedAt.getTime();
      if (delay < 300 && this.end_location.y < this.start_location.y) {
        let angle =
          -Math.atan2(
            this.end_location.x - this.start_location.x,
            this.end_location.y - this.start_location.y
          ) *
            (180 / Math.PI) -
          180;
        this.fall = false;
        if (delay < 100) {
          delay = 100;
        } else if (delay > 200) {
          delay = 200;
        }
        delay = delay / 300;

        this.launchBall(angle, delay);
      }
    }
  }

  mapDistanceToScale = (distance, minDist, maxDist, minValue, maxValue) => {
    if (distance < minDist) distance = minDist;
    if (distance > maxDist) distance = maxDist;
    const mappedValue =
      maxValue -
      ((distance - minDist) / (maxDist - minDist)) * (maxValue - minValue);
    // console.log(this.ball.body.velocity);
    return mappedValue;
  };

  addProgress() {
    this.progressBox = this.add
      .rectangle(340, 33, 140, 45, 0xee9922)
      .setDepth(11)
      .setScrollFactor(0)
      .setOrigin(0);
    this.progressMask = this.add
      .rexRoundRectangle(
        340,
        33,
        140,
        45,
        { tl: 15, tr: 15, bl: 15, br: 15 },
        0xffffff
      )
      .setDepth(9)
      .setScrollFactor(0)
      .setOrigin(0);
    this.progressBox.setMask(this.progressMask.createGeometryMask());
  }
  updateProgressBox = () => {
    if (!this.lost) {
      if (this.progressDecreasing) {
        if (this.progressWidth > 0) {
          this.progressWidth -= 1;
          this.progressBox.setSize(this.progressWidth, 45);
        } else {
          this.life -= 1;
          this.progressWidth = 140;
          this.lifes[this.life].destroy();
          if (this.life == 0) {
            this.lost = true;
            this.checkPlayerLost();
          }
        }
      } else {
        this.progressWidth = 140;
      }
    }
  };
  updateProgress() {
    this.progressWidth = 140;
    this.progressDecreasing = true;

    this.time.addEvent({
      delay: (this.speed * 90) / 1000,
      callback: this.updateProgressBox,
      callbackScope: this,
      loop: true,
    });
  }

  start() {
    // this.createTouchControls();
    this.updateProgress();
    this.playing = true;
    // Debug point
    this.ball.setInteractive();
    this.ball.on(Phaser.Input.Events.POINTER_DOWN, this.press, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.release, this);
  }

  notify(code) {
    let message, x, y;

    if (code === 1) {
      message = "Skriv inn brukernavn!";

      x = 400;
      y = 100;
    } else if (code === 2) {
      message = "Ugyldig e-post!";

      x = 400;
      y = 100;
    } else if (code === 3) {
      message = "Brukernavnet er allerede tatt!";

      x = 400;
      y = 100;
    } else if (code === 4) {
      message = "Bruker fjernet suksessfullt";

      x = 400;
      y = 40;
    } else if (code === 5) {
      message = "Kode kopiert til utklippstavlen";

      x = 400;
      y = 365;
    } else if (code === 6) {
      message = "Kode kopiert til utklippstavlen";

      x = 400;
      y = 890;
    }

    const notificationText = this.add
      .text(x, y, message, {
        fontFamily: "RakeslyRG",
        fontSize: "35px",
        color: "#f20071",
        align: "center",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setAlpha(0)
      .setDepth(Infinity);

    this.tweens.add({
      targets: notificationText,
      alpha: 1,
      duration: 200,

      onComplete: () => {
        this.time.addEvent({
          delay: 1000,

          callback: () => {
            this.tweens.add({
              targets: notificationText,
              alpha: 0,
              duration: 200,

              onComplete: () => {
                notificationText.destroy();
              },
            });
          },
        });
      },
    });
  }
  randomBetween(min, max) {
    return Phaser.Math.Between(min, max);
  }
  update() {
    if (this.playing && !this.lost) {
      this.handleVelocities();

      this.updateCameraBounds();

      this.scaleBall();
    }
  }
  handleVelocities() {
    this.ballShadow.x = this.ball.x;

    if (this.ball.body.angularVelocity > 0) {
      this.ball.setAngularVelocity(
        Math.max(0, this.ball.body.angularVelocity - 0.5)
      );
    }
    if (this.ball.body.angularVelocity < 0) {
      this.ball.setAngularVelocity(
        Math.min(0, this.ball.body.angularVelocity + 0.5)
      );
    }
    if (this.ball.body.velocity.y == 0) {
      if (this.ball.body.angularVelocity > 0) {
        this.ball.setAngularVelocity(
          Math.max(0, this.ball.body.angularVelocity - 1.8)
        );
      } else if (this.ball.body.angularVelocity < 0) {
        this.ball.setAngularVelocity(
          Math.min(0, this.ball.body.angularVelocity + 1.8)
        );
      }

      if (this.ball.body.velocity.x > 0) {
        this.ball.body.velocity.x -= 1;
      } else if (this.ball.body.velocity.x < 0) {
        this.ball.body.velocity.x += 1;
      }
    }
  }
  updateCameraBounds() {
    if (this.player) {
      if (!this.player.lost) {
        this.cameraBound = this.player.x - 200;
        // this.cameraBound = 100;
        this.cameras.main.setBounds(this.cameraBound, 0, 1200, 0, true);
      }
    }
  }
  checkPlayerLost() {
    if (this.lost && this.playing) {
      this.sound.stopAll();
      if (this.soundOn) {
        this.lostSound.play();
      }

      this.time.addEvent({
        delay: 800,
        callback: () => {
          this.cameras.main.fadeOut(500);
          const fadeRect = this.add
            .rectangle(
              this.cameras.main.centerX,
              this.cameras.main.centerY,
              this.cameras.main.width,
              this.cameras.main.height,
              0x000000
            )
            .setDepth(Infinity);
          fadeRect.setAlpha(0);
          this.tweens.add({
            targets: fadeRect,
            alpha: 0.3,
            duration: 1000,
            ease: "Linear",
          });

          this.time.addEvent({
            delay: 1000,
            callback: () => {
              this.tempHighScore = this.highScore;

              if (this.score > this.highScore) {
                this.highScore = this.score;
              }

              localStorage.setItem("axa-bird-game-highScore", this.highScore);
              localStorage.setItem("axa-bird-game-score", this.score);

              this.playing = false;

              if (this.score > 0) {
                if (this.remember) {
                  this.socket.emit(
                    "scoreUpdate",
                    {
                      username: this.username,
                      email: this.email,
                      score: this.score,
                      remember: this.remember,
                      news: this.news,
                      playerId: this.playerId,
                      newUser: true,
                    },
                    (data) => {
                      if (this.remember) {
                        this.username = data.username;
                        this.email = data.email;
                        localStorage.setItem(
                          "axa-bird-game-username",
                          this.username
                        );
                        localStorage.setItem("axa-bird-game-email", this.email);
                        localStorage.setItem("axa-bird-game-news", this.news);
                        localStorage.setItem(
                          "axa-bird-game-remember",
                          this.remember
                        );
                        localStorage.setItem(
                          "axa-bird-game-playerId",
                          this.playerId
                        );
                      }

                      if (data.unlocked) {
                        this.unlocked = data.unlocked;
                        this.screen = "unlocked";
                        this.scene.restart();
                      } else {
                        this.screen = "replay";
                        this.scene.restart();
                      }
                    }
                  );
                } else {
                  this.screen = "restart";
                  this.scene.restart();
                }
              } else {
                this.screen = "replay";
                this.scene.restart();
              }
            },
          });
        },
      });
    }
  }
  updateScore() {
    if (this.scoreText) {
      this.scoreText.setText(this.score);
    }
  }
}
export { GameScene };
