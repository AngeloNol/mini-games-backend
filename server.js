const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for now — change for production
  }
});

// Room structure
// rooms = {
//   roomId: {
//     game: "tictactoe" | "connect4" | "hangman",
//     players: [socketId1, socketId2, ...],
//     state: {}, // Game-specific state (board, guesses, etc.)
//   }
// }
const rooms = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // --- JOIN ROOM ---
  socket.on('joinRoom', ({ roomId, game }) => {
    if (!roomId || !game) {
      socket.emit('errorMessage', 'Room ID and game type are required.');
      return;
    }

    // Create room if it doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = {
        game,
        players: [],
        state: {}, // Will be initialized by each game logic file
      };
    }

    // Check if game types match
    if (rooms[roomId].game !== game) {
      socket.emit('errorMessage', 'This room is already used for another game.');
      return;
    }

    // Max 4 players allowed
    if (rooms[roomId].players.length >= 4) {
      socket.emit('errorMessage', 'Room is full.');
      return;
    }

    // Add player to room
    rooms[roomId].players.push(socket.id);
    socket.join(roomId);

    console.log(`Socket ${socket.id} joined room ${roomId}`);

    // Notify others
    io.to(roomId).emit('playerList', rooms[roomId].players);
    socket.emit('gameState', rooms[roomId].state || {});
    socket.emit('joinedRoom', roomId);
  });

  // --- GAME MOVE ---
  socket.on('gameMove', ({ roomId, move }) => {
    if (!roomId || !rooms[roomId]) return;

    // Relay move to other players
    socket.to(roomId).emit('gameMove', move);

    // Optional: update game state if needed by backend
    // rooms[roomId].state = updatedStateFunction(move, rooms[roomId].state);
  });

  // --- UPDATE GAME STATE ---
  socket.on('updateGameState', ({ roomId, newState }) => {
    if (rooms[roomId]) {
      rooms[roomId].state = newState;
      io.to(roomId).emit('gameState', newState);
    }
  });

  // --- DISCONNECT ---
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);

    for (const roomId in rooms) {
      const idx = rooms[roomId].players.indexOf(socket.id);
      if (idx !== -1) {
        rooms[roomId].players.splice(idx, 1);
        io.to(roomId).emit('playerLeft', socket.id);

        // Remove room if empty
        if (rooms[roomId].players.length === 0) {
          delete rooms[roomId];
          console.log(`Deleted empty room: ${roomId}`);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
