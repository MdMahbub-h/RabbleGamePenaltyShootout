/**
 * Shared server module
 * Handles Express and Socket.IO configuration
 */
const express = require("express");
const path = require("node:path");
const http = require("node:http");
const { Server } = require("socket.io");
const { initializeFirebase, ref, get } = require("./firebase");
const gameUtils = require("./gameUtils");

/**
 * Initialize server with game configuration
 * @param {Object} config - Game configuration 
 * @param {string} config.gameId - Game ID
 * @param {Array} config.pointLevels - Point levels for code rewards
 * @param {string} config.staticPath - Path to static files directory
 * @returns {Object} Server objects and handlers
 */
function initializeServer(config) {
  const { gameId, pointLevels, staticPath, port: configPort } = config;
  
  // Initialize Firebase and get database
  const { firebase, db } = initializeFirebase();
  
  // Initialize game utilities with database
  gameUtils.initializeGameUtils(db);
  
  // Debug log för att bekräfta att Firebase och databasen är korrekt initialiserade
  console.log(`Server initialiserad för spel '${gameId}' med Firebase-databas`);
  
  // Create Express app and HTTP server
  const app = express();
  const server = http.createServer(app);
  const port = configPort || process.env.PORT || process.env.DEFAULT_PORT || 3000;
  console.log(`Startar server för spel '${gameId}' på port ${port}`);
  
  // Configure Socket.IO
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });
  
  // Set up static file serving
  app.use(express.static(staticPath || path.join(process.cwd(), "public")));
  
  // Socket.IO connection handler
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    
    // User data request handler
    socket.on("userData", async (data) => {
      try {
        if (!data.username) {
          socket.emit("error", { message: "Username is required" });
          return;
        }
        
        const result = await gameUtils.sendUserData(gameId, socket, data.username);
        
        if (!result.success) {
          socket.emit("userNotFound");
        }
      } catch (error) {
        console.error("Error handling userData request:", error);
        socket.emit("error", { message: "Internal server error" });
      }
    });
    
    // Score update handler
    socket.on("scoreUpdate", async (data, callback) => {
      try {
        // Validate user data
        if (!data.username || data.username.length > 32) {
          callback({ success: false, error: "Invalid username" });
          return;
        }
        
        if (typeof data.score !== "number" || Number.isNaN(data.score)) {
          callback({ success: false, error: "Invalid score" });
          return;
        }
        
        // Get existing user data if available
        let codes = [];
        if (data.codes && Array.isArray(data.codes)) {
          codes = data.codes;
        }
        
        // Get updated codes based on score
        // Notera att parametrarna måste skickas i ordningen: gameId, score, pointLevels, existingCodes
        const codesResult = await gameUtils.getCodes(gameId, data.score, pointLevels, codes);
        
        console.log(`Poängnivåer för ${gameId}: ${pointLevels.join(', ')}`);
        console.log(`Användare ${data.username} har poäng: ${data.score}`);
        
        // Store updated user data
        const storeResult = await gameUtils.storeData(gameId, {
          ...data,
          score: data.score,
        }, codesResult.codes);
        
        if (storeResult) {
          callback({
            success: true,
            unlocked: codesResult.unlocked,
            codes: codesResult.codes,
          });
        } else {
          callback({ success: false, error: "Failed to update data" });
        }
      } catch (error) {
        console.error("Error handling scoreUpdate:", error);
        callback({ success: false, error: "Internal server error" });
      }
    });
    
    // Delete user data handler
    socket.on("deleteData", async (data, callback) => {
      try {
        if (!data.playerId) {
          callback({ success: false, error: "Player ID is required" });
          return;
        }
        
        const result = await gameUtils.deleteData(gameId, data.playerId);
        
        if (result) {
          callback({ success: true });
        } else {
          callback({ success: false, error: "Failed to delete data" });
        }
      } catch (error) {
        console.error("Error handling deleteData:", error);
        callback({ success: false, error: "Internal server error" });
      }
    });
    
    // Leaderboard handler
    socket.on("leaderboard", async () => {
      try {
        const scoresRef = ref(db, `games/${gameId}/scores`);
        const snapshot = await get(scoresRef);
        
        if (snapshot.exists()) {
          const scores = Object.values(snapshot.val())
            // Filtrera bort känslig information innan sortering
            .map(player => ({
              username: player.username,
              score: player.score
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 100);
          
          socket.emit("leaderboard", scores);
        } else {
          socket.emit("leaderboard", []);
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        socket.emit("error", "Failed to fetch leaderboard");
      }
    });
    
    // Disconnect handler
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
  
  // Return server objects and utility handlers
  return {
    app,
    server,
    io,
    port,
    start: () => {
      server.listen(port, () => {
        console.log(`Server running on port ${port}`);
      });
    }
  };
}

module.exports = {
  initializeServer
};
