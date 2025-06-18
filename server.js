// server.js
const http = require("http");
const express = require("express");
const path = require("path");
const initializeTicTacToe = require("./games/tictactoe");

const app = express();
const server = http.createServer(app);

// Serve static files from a "public" folder (for your frontend)
app.use(express.static(path.join(__dirname, "public")));

// Initialize Tic-Tac-Toe Socket.io server
initializeTicTacToe(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
