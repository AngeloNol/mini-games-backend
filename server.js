const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

// Import game logic modules
const setupTicTacToe = require('./games/tictactoe');
const setupHangman = require('./games/hangman');
const setupConnect4 = require('./games/connect4');

const app = express();
const server = http.createServer(app);

// CORS setup to allow requests from your GitHub Pages frontend
app.use(cors({
  origin: 'https://your-username.github.io', // replace with your actual GitHub Pages URL
  methods: ['GET', 'POST']
}));

// Socket.IO server setup with same CORS policy
const io = new Server(server, {
  cors: {
    origin: 'https://your-username.github.io', // replace with your actual GitHub Pages URL
    methods: ['GET', 'POST']
  }
});

// When a client connects via WebSocket
io.on('connection', socket => {
  console.log('User connected:', socket.id);

  // Initialize each game handler for this socket connection
  setupTicTacToe(io, socket);
  setupHangman(io, socket);
  setupConnect4(io, socket);

  // Optional: log disconnections
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start the server on your preferred port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
