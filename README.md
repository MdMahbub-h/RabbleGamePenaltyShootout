# Duck Game

## Project Overview
This is a web-based game built with Node.js, Express, Socket.IO, and Firebase. The game implements a point-based reward system where players can earn codes at different score thresholds.

## Technical Stack
- **Backend**: Node.js with Express
- **Real-time Communication**: Socket.IO
- **Database**: Firebase Realtime Database
- **Frontend**: HTML5 Game (located in public directory)

## Project Structure
```
duck/
├── public/           # Static game files
│   ├── assets/      # Game assets (images, sounds, etc.)
│   ├── lib/         # External libraries
│   ├── scenes/      # Game scenes
│   ├── index.html   # Main game page
│   └── main.js      # Main game script
├── server.js        # Express server and game logic
└── package.json     # Project dependencies
```

## Game Features
- Real-time gameplay using Socket.IO
- Score tracking and persistence
- Code reward system at specific score thresholds:
  - 500 points: Unlocks first code
  - 1000 points: Unlocks second code
  - 5000 points: Unlocks third code
- User data storage in Firebase
- Newsletter subscription option

## Score System
The game implements a scoring system where players can earn special codes at different score thresholds. These codes are randomly generated 6-digit numbers and are unique to each achievement level.

## Database Structure
The game uses Firebase Realtime Database to store:
- Player scores
- Player information (username, email)
- Newsletter preferences
- Unlocked reward codes

## Setup and Installation
1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   Create a `.env` file with required configuration

3. Start the development server:
   ```bash
   npm run test
   ```

4. For production:
   ```bash
   npm start
   ```

## Development
- Development server runs on port 3000 by default
- Uses nodemon for auto-reloading during development
- Firebase configuration is included in server.js

## Dependencies
- express: Web server framework
- socket.io: Real-time bidirectional communication
- firebase: Database and backend services
- dotenv: Environment variable management
- nodemon: Development auto-reloading
- axagame: Custom game framework

## Notes
- The server maintains a maximum of 100 scores in the database
- All codes are randomly generated 6-digit numbers
- The game implements real-time updates for scores and achievements
