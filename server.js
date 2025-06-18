/**
 * WC-Duck game server
 * Using shared server infrastructure
 */
const path = require("node:path");
const dotenv = require("dotenv");
const { initializeServer } = require("server2");

// Load environment variables
dotenv.config();

// Define game-specific configuration
const gameConfig = {
  gameId: "duck", // Specific ID for WC-Duck game
  pointLevels: [20, 1000, 5000], // Specific point levels for WC-Duck game
  staticPath: path.join(__dirname, "public"),
};

// Initialize server with game configuration
const server = initializeServer(gameConfig);

// Start the server
server.start();
