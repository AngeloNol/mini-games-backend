// server.js
const http = require("http");
const express = require("express");
const path = require("path");
const { Server } = require("socket.io"); // ✅ Import Socket.IO
const initializeTicTacToe = require("./games/tictactoe");

const app = express();
const server = http.createServer(app);

// Serve static files (optional if hosting separately like GitHub Pages)
app.use(express.static(path.join(__dirname, "public")));

// ✅ Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust for production
    methods: ["GET", "POST"],
  },
});

// ✅ Pass Socket.IO to your game logic
initializeTicTacToe(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
