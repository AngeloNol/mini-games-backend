const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const rooms = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('createRoom', ({ game }) => {
    const roomId = uuidv4();
    rooms[roomId] = {
      game,
      players: [socket.id],
      state: {}
    };
    socket.join(roomId);
    socket.emit('roomCreated', { game, roomId });
    console.log(`Room created: ${roomId} for game ${game}`);
  });

  socket.on('joinRoom', ({ game, roomId }) => {
    if (!rooms[roomId]) {
      socket.emit('errorMsg', { message: 'Room does not exist.' });
      return;
    }
    if (rooms[roomId].game !== game) {
      socket.emit('errorMsg', { message: 'This room is for a different game.' });
      return;
    }
    if (rooms[roomId].players.length >= 4) {
      socket.emit('errorMsg', { message: 'Room is full.' });
      return;
    }
    rooms[roomId].players.push(socket.id);
    socket.join(roomId);
    socket.emit('roomJoined', { game, roomId });
    io.to(roomId).emit('playerList', rooms[roomId].players);
    console.log(`${socket.id} joined room ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    for (const roomId in rooms) {
      const idx = rooms[roomId].players.indexOf(socket.id);
      if (idx !== -1) {
        rooms[roomId].players.splice(idx, 1);
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
