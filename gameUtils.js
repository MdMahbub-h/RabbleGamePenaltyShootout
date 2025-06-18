/**
 * Shared game utilities module
 * Handles code retrieval and user data operations
 */
const { 
  ref, 
  get, 
  set, 
  update, 
  push, 
  query, 
  orderByChild, 
  equalTo 
} = require('./firebase');

/**
 * Get available code for a specific point level
 * @param {string} gameId - The game identifier
 * @param {string} pointLevel - The point level to get code for
 * @returns {Promise<Object>} The code object or null if not found
 */
async function getAvailableCode(gameId, pointLevel) {
  try {
    const codesRef = ref(db, `games/${gameId}/codes/available/${pointLevel}`);
    const snapshot = await get(codesRef);

    if (snapshot.exists()) {
      const codes = snapshot.val();
      if (Array.isArray(codes)) {
        // Find first available code
        const availableCode = codes.find((code) => !code.used);
        if (availableCode) {
          // Mark code as used
          const codeIndex = codes.indexOf(availableCode);
          await update(
            ref(db, `games/${gameId}/codes/available/${pointLevel}/${codeIndex}`),
            { used: true }
          );

          // Return code with points
          return {
            ...availableCode,
            points: pointLevel,
          };
        }
      }
    }

    // Om ingen kod hittades, returnera null - inget fallback
    console.log(`Inga tillgängliga koder för nivå ${pointLevel} i spel ${gameId}`);
    return null;
  } catch (error) {
    console.error("Error getting available code:", error);
    return null;
  }
}

// Fallback-funktionen har tagits bort enligt önskemål

/**
 * Get codes based on player score and existing codes
 * @param {string} gameId - The game identifier
 * @param {number} score - The player's score
 * @param {Array} existingCodes - Array of codes player already has
 * @param {Array} pointLevels - Point levels available for the game
 * @returns {Promise<Object>} Object with updated codes and newly unlocked code
 */
async function getCodes(gameId, score, pointLevels, existingCodes = []) {
  // Returnera befintliga koder som standard, inga uppdateringar
  const newCodes = [...existingCodes];
  let unlocked = null;

  // Om det inte finns några poängnivåer att kontrollera, returnera bara befintliga koder
  if (!pointLevels || !Array.isArray(pointLevels) || pointLevels.length === 0) {
    console.log(`Inga poängnivåer definierade för spel ${gameId}`);
    return { codes: newCodes, unlocked };
  }
  
  // Debugloggning för att visa aktuella poäng och nivåer
  console.log(`Kontrollerar poäng ${score} mot nivåer [${pointLevels.join(', ')}] för spel ${gameId}`);

  // Convert existing codes to a Set for quick lookup
  // Handle both array of objects and array of strings (backwards compatibility)
  const existingPoints = new Set(
    existingCodes.map(code => typeof code === 'object' ? code.points : code)
  );
  
  // Hitta alla poängnivåer där spelarens poäng är tillräcklig
  const eligibleLevels = pointLevels.filter(level => score >= level);
  console.log(`Poäng ${score}, Berättigade nivåer: ${eligibleLevels.join(', ')}`);
  
  // Om spelaren inte har uppnått någon poängnivå, returnera bara befintliga koder
  if (eligibleLevels.length === 0) {
    console.log(`Spelaren har inte uppnått någon poängnivå för att få koder`);
    return { codes: newCodes, unlocked };
  }
  
  // Gå igenom varje berättigad poängnivå
  for (const level of eligibleLevels) {
    const levelStr = level.toString();
    
    // Ge endast kod om spelaren inte redan har en kod för denna nivå
    if (!existingPoints.has(levelStr)) {
      console.log(`Söker efter kod för nivå ${levelStr} i spel ${gameId}`);
      
      // Försök hämta en tillgänglig kod från databasen
      const code = await getAvailableCode(gameId, levelStr);
      
      // Kontrollera att vi faktiskt fick en giltig kod från databasen
      if (code && code.code) {
        console.log(`Tilldelad kod ${code.code} för nivå ${levelStr}`);
        
        // Nu sparar vi bara själva kodsträngen
        unlocked = code.code; // Koden som sträng
        newCodes.push(unlocked);
        
        console.log(`Olåst kod: ${unlocked} (nytt strängbaserat format)`);
        break; // Ge bara ut en ny kod åt gången
      } else {
        console.log(`Ingen giltig kod hittades för nivå ${levelStr} i spel ${gameId}`);
      }
    } else {
      console.log(`Spelaren har redan en kod för nivå ${levelStr}`);
    }
  }

  return { codes: newCodes, unlocked };
}

/**
 * Check if username already exists
 * @param {string} gameId - The game identifier
 * @param {string} username - Username to check
 * @returns {Promise<boolean>} True if username exists, false otherwise
 */
async function checkUsernameExists(gameId, username) {
  try {
    const usersRef = ref(db, `games/${gameId}/scores`);
    const usernameQuery = query(
      usersRef,
      orderByChild('username'),
      equalTo(username)
    );
    const snapshot = await get(usernameQuery);
    return snapshot.exists();
  } catch (error) {
    console.error("Error checking username:", error);
    return false;
  }
}

/**
 * Store or update user data
 * @param {string} gameId - The game identifier
 * @param {Object} data - User data to store
 * @param {Array} codes - Array of codes the player has
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function storeData(gameId, data, codes = []) {
  try {
    if (!data.username) {
      console.error("No username provided");
      return false;
    }

    // If it's a new user
    if (!data.playerId) {
      // Check if username already exists
      const exists = await checkUsernameExists(gameId, data.username);
      if (exists) {
        return false;
      }

      // Create new node with unique ID
      const newPlayerRef = push(ref(db, `games/${gameId}/scores`));
      data.playerId = newPlayerRef.key;
    }

    // Update or create player with unique ID
    const playerRef = ref(db, `games/${gameId}/scores/${data.playerId}`);
    
    const userData = {
      username: data.username,
      email: data.email || "",
      score: data.score || 0,
      lastUpdated: new Date().toISOString()
    };
    
    if (data.news !== undefined) {
      userData.news = data.news ? "Yes" : "No";
    }
    
    // Hantera koder - nu endast kodsträngar
    if (codes && codes.length > 0) {
      // Filter ut ogiltiga koder och konvertera till strängar
      const stringCodes = codes.map(code => {
        // Om koden är ett objekt, ta bara kodsträngen
        if (typeof code === 'object' && code !== null && code.code) {
          return code.code;
        }
        // Om det redan är en sträng eller något annat konverterbart, använd det
        return String(code);
      }).filter(code => code && code !== 'undefined' && code !== 'null');
      
      console.log(`Sparar ${stringCodes.length} giltiga koder för användare ${data.username}`);
      userData.codes = JSON.stringify(stringCodes);
    } else if (data.codes) {
      // Om data.codes redan finns, konvertera till ny format om nödvändigt
      try {
        const existingCodes = JSON.parse(data.codes);
        
        if (Array.isArray(existingCodes)) {
          // Konvertera till array av bara strängar
          const stringCodes = existingCodes.map(code => {
            if (typeof code === 'object' && code !== null && code.code) {
              return code.code;
            } else if (typeof code === 'number') {
              return `CODE-${code}`;
            } else if (typeof code === 'string') {
              return code;
            }
            return 'OKÄND-KOD';
          }).filter(code => code !== 'OKÄND-KOD');
          
          userData.codes = JSON.stringify(stringCodes);
        } else {
          // Om det inte är en array, skapa en array med en ensam kod
          userData.codes = JSON.stringify([String(existingCodes)]);
        }
      } catch (e) {
        // Om parsning misslyckas, skapa en tom array
        userData.codes = "[]";
      }
    } else {
      userData.codes = "[]";
    }

    await set(playerRef, userData);
    return true;
  } catch (error) {
    console.error("Error storing data:", error);
    return false;
  }
}

/**
 * Send user data to socket
 * @param {string} gameId - The game identifier
 * @param {Object} socket - Socket.IO socket
 * @param {string} username - Username to get data for
 */
async function sendUserData(gameId, socket, username) {
  try {
    console.log(`===== Hämtar användardata för ${username} i spel ${gameId} =====`);
    const usersRef = ref(db, `games/${gameId}/scores`);
    const usernameQuery = query(
      usersRef,
      orderByChild('username'),
      equalTo(username)
    );
    const snapshot = await get(usernameQuery);
    
    if (snapshot.exists()) {
      console.log(`Hittade användardata för ${username}`);
      const userDataRaw = snapshot.val();
      console.log('Rådata från databasen:', userDataRaw);
      
      const data = Object.entries(userDataRaw).map(([key, value]) => ({
        ...value,
        playerId: key
      }))[0];
      
      console.log(`Användarens playerId: ${data.playerId}`);
      console.log(`Råformatet på codes i databasen: ${typeof data.codes}`);
      console.log(`Värde på codes i databasen: ${data.codes}`);
      
      // Parsa koderna från databasen - nu enbart strängar!
      let codes = [];
      try {
        if (data.codes) {
          // Försök parsa koder från JSON
          const parsedCodes = JSON.parse(data.codes);
          
          // Kontrollera om det är en array
          if (Array.isArray(parsedCodes)) {
            // Konvertera gamla format till bara kodsträngar
            codes = parsedCodes.map(code => {
              // Om det är ett objekt, ta bara kodsträngen
              if (typeof code === 'object' && code !== null && code.code) {
                return code.code;
              }
              // Om det är ett nummer, skapa en kodstring
              else if (typeof code === 'number') {
                return `CODE-${code}`;
              }
              // Om det redan är en sträng, använd den direkt
              else if (typeof code === 'string') {
                return code;
              }
              // För odefinierade fall
              return 'OKÄND-KOD';
            });
          } 
          // Om det redan är en sträng
          else if (typeof parsedCodes === 'string') {
            codes = [parsedCodes];
          }
          
          console.log(`Koderna efter parsning och konvertering:`, codes);
        } else {
          console.log('Användaren har inga koder i databasen');
        }
      } catch (err) {
        console.error(`Fel vid parsning av koder för ${username}:`, err);
      }
      
      const userDataToSend = {
        playerId: data.playerId,
        username: data.username,
        email: data.email || "",
        score: data.score || 0,
        news: data.news === "Yes",
        // Konvertera tillbaka till JSON-sträng så att klienten kan parsa den
        // Nu innehåller codes bara strängarna direkt
        codes: JSON.stringify(codes)
      };
      
      console.log(`Skickar användardata till klient:`, userDataToSend);
      console.log(`Kodsträng som skickas: ${userDataToSend.codes}`);
      
      socket.emit("userData", userDataToSend);
      
      return { success: true };
    }
    
    return { success: false, error: "User not found" };
  } catch (error) {
    console.error("Error sending user data:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete user data
 * @param {string} gameId - The game identifier
 * @param {string} playerId - Player ID to delete
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function deleteData(gameId, playerId) {
  try {
    const playerRef = ref(db, `games/${gameId}/scores/${playerId}`);
    await remove(playerRef);
    return true;
  } catch (error) {
    console.error("Error deleting data:", error);
    return false;
  }
}

// Export the database reference as it will be needed by these functions
let db;

/**
 * Initialize the game utils with the database reference
 * @param {Object} database - Firebase database reference
 */
function initializeGameUtils(database) {
  db = database;
}

module.exports = {
  initializeGameUtils,
  getAvailableCode,
  // getFallbackCode borttagen
  getCodes,
  checkUsernameExists,
  storeData,
  sendUserData,
  deleteData
};
