// server.js (updated with createRoom support)

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid'); // for unique room IDs

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*" // Allow all origins (change for production)
  }
});

const rooms = {}; // Structure: { roomId: { game, players: [socketId], state } }

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Create room event
  socket.on('createRoom', ({ game }) => {
    const roomId = uuidv4().slice(0, 6); // Short unique room ID (6 chars)
    rooms[roomId] = {
      game,
      players: [socket.id],
      state: {} // Game-specific state can go here
    };

    socket.join(roomId);
    console.log(`Room ${roomId} created for game ${game} by ${socket.id}`);

    // Notify creator
    socket.emit('roomCreated', { game, roomId });
    socket.emit('roomJoined', { game, roomId });
  });

  // Join existing room
  socket.on('joinRoom', ({ roomId, game }) => {
    if (!rooms[roomId]) {
      socket.emit('errorMsg', { message: 'Room does not exist.' });
      return;
    }

    if (rooms[roomId].game !== game) {
      socket.emit('errorMsg', { message: 'Room is for a different game.' });
      return;
    }

    if (rooms[roomId].players.length >= 4) {
      socket.emit('errorMsg', { message: 'Room is full.' });
      return;
    }

    rooms[roomId].players.push(socket.id);
    socket.join(roomId);
    console.log(`${socket.id} joined room ${roomId}`);

    socket.emit('roomJoined', { game, roomId });
    io.to(roomId).emit('playerList', rooms[roomId].players);
  });

  // Game move forwarding
  socket.on('gameMove', ({ roomId, move }) => {
    if (!rooms[roomId]) return;
    // Optional: rooms[roomId].state = updateState(rooms[roomId].state, move);
    socket.to(roomId).emit('gameMove', move);
  });

  // Player disconnect cleanup
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);

    for (const roomId in rooms) {
      const index = rooms[roomId].players.indexOf(socket.id);
      if (index !== -1) {
        rooms[roomId].players.splice(index, 1);
        io.to(roomId).emit('playerLeft', socket.id);

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
