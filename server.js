const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

// Import game modules
const initializeTicTacToe = require('./games/tictactoe');
const initializeHangman = require("./games/hangman");
// const initializeConnect4 = require("./connect4");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());

const rooms = new Map();

io.on("connection", (socket) => {
  socket.on("createRoom", ({ game }) => {
    const roomId = uuidv4().slice(0, 6);
    rooms.set(roomId, { game });
    socket.emit("roomCreated", { game, roomId });
  });

  socket.on("joinRoom", ({ game, roomId }) => {
    const room = rooms.get(roomId);

    if (!room || room.game !== game) {
      socket.emit("errorMsg", {
        message: "Room not found or game mismatch.",
      });
      return;
    }

    // Allow the game module to handle joining
    socket.join(roomId);
    socket.emit("roomJoined", { game, roomId });

    // Let the appropriate game handler take over
    if (game === "tictactoe") {
      // Already handled in game module
    }
  });
});

// Attach game-specific logic
initializeTicTacToe(io);
initializeHangman(io);
// initializeConnect4(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
