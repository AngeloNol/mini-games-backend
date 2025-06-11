const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",  // Allow all origins for testing, restrict for production
  }
});

// Rooms data structure:
// rooms = {
//   roomId1: {
//     game: "tictactoe" | "connect4" | "hangman",
//     players: [socketId1, socketId2, ...],
//     state: {}  // you can store game state here if needed
//   }
// }
const rooms = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join a room
  socket.on('joinRoom', ({ roomId, game }) => {
    console.log(`${socket.id} joining room ${roomId} for game ${game}`);

    // Create room if doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = {
        game,
        players: [],
        state: {},  // Init empty state, update later as needed
      };
    }

    // Check if the room is for the same game
    if (rooms[roomId].game !== game) {
      socket.emit('errorMessage', 'This room is for a different game.');
      return;
    }

    // Check if room is full (max 4 players)
    if (rooms[roomId].players.length >= 4) {
      socket.emit('errorMessage', 'Room is full.');
      return;
    }

    // Add player to room
    rooms[roomId].players.push(socket.id);
    socket.join(roomId);

    // Inform all players in room about current players
    io.to(roomId).emit('playerList', rooms[roomId].players);

    // Optionally send current game state to the new player
    socket.emit('gameState', rooms[roomId].state);

    // Notify others player joined
    socket.to(roomId).emit('playerJoined', socket.id);

    console.log(`Room ${roomId} players: `, rooms[roomId].players);
  });

  // Handle game moves or updates from client
  socket.on('gameMove', ({ roomId, move }) => {
    if (!rooms[roomId]) return;

    // Update state here as needed
    // For example:
    // rooms[roomId].state = updateState(rooms[roomId].state, move);

    // Broadcast move to other players in room
    socket.to(roomId).emit('gameMove', move);
  });

  // Handle player disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);

    // Remove player from any rooms
    for (const roomId in rooms) {
      const index = rooms[roomId].players.indexOf(socket.id);
      if (index !== -1) {
        rooms[roomId].players.splice(index, 1);
        io.to(roomId).emit('playerLeft', socket.id);

        // If no players left, delete the room
        if (rooms[roomId].players.length === 0) {
          delete rooms[roomId];
          console.log(`Deleted empty room ${roomId}`);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
