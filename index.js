/**
 * Main export file for shared Rabble Games functionality
 */
const firebase = require('./firebase');
const gameUtils = require('./gameUtils');
const serverModule = require('./server');

module.exports = {
  // Firebase exports
  firebase,
  
  // Game utilities exports
  getAvailableCode: gameUtils.getAvailableCode,
  getFallbackCode: gameUtils.getFallbackCode,
  getCodes: gameUtils.getCodes,
  checkUsernameExists: gameUtils.checkUsernameExists,
  storeData: gameUtils.storeData,
  sendUserData: gameUtils.sendUserData,
  deleteData: gameUtils.deleteData,
  initializeGameUtils: gameUtils.initializeGameUtils,
  
  // Server exports
  initializeServer: serverModule.initializeServer
};
