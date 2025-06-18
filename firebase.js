/**
 * Shared Firebase configuration module
 * Handles Firebase initialization and database setup
 */
const { initializeApp } = require("firebase/app");
const {
  getDatabase,
  ref,
  get,
  set,
  update,
  remove,
  push,
  query,
  orderByChild,
  equalTo,
} = require("firebase/database");
const dotenv = require("dotenv");

// Load environment variables from root directory
const path = require('node:path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Logger för att bekräfta att miljövariabler laddas korrekt
console.log(`Läser in Firebase-konfiguration från rotmappen`);


// Verify that all required environment variables are present
const requiredEnvVars = [
  "FIREBASE_API_KEY",
  "FIREBASE_AUTH_DOMAIN",
  "FIREBASE_DATABASE_URL",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_STORAGE_BUCKET",
  "FIREBASE_MESSAGING_SENDER_ID",
  "FIREBASE_APP_ID",
];

function initializeFirebase() {
  const missingEnvVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );
  
  if (missingEnvVars.length > 0) {
    console.error(
      "Error: Missing required environment variables:",
      missingEnvVars.join(", ")
    );
    console.error("Please check your .env file");
    process.exit(1);
  }

  const firebase = initializeApp({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
  });

  const db = getDatabase(firebase);
  
  return { firebase, db };
}

module.exports = {
  initializeFirebase,
  // Export Firebase database functions for direct use
  ref,
  get,
  set,
  update,
  remove,
  push,
  query,
  orderByChild,
  equalTo
};
