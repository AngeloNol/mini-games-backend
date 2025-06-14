// connect4.js - Connect 4 backend logic with room and multiplayer support

const { Server } = require("socket.io");
const http = require("http");
const express = require("express");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Room structure: { roomId: { players: [socketId], board: [...], turn: 0, maxPlayers: 2 } }
const rooms = {};

// Create empty board
function createBoard(rows = 6, cols = 7) {
  return Array.from({ length: rows }, () => Array(cols).fill(null));
}

function checkWin(board, player) {
  const directions = [
    [0, 1], [1, 0], [1, 1], [1, -1]
  ];

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[0].length; col++) {
      if (board[row][col] === player) {
        for (let [dr, dc] of directions) {
          let count = 1;
          let r = row + dr, c = col + dc;
          while (r >= 0 && r < board.length && c >= 0 && c < board[0].length && board[r][c] === player) {
            count++;
            if (count === 4) return true;
            r += dr;
            c += dc;
          }
        }
      }
    }
  }
  return false;
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("createRoom", ({ maxPlayers }) => {
    const roomId = Math.random().toString(36).substring(2, 8);
    rooms[roomId] = {
      players: [socket.id],
      board: createBoard(),
      turn: 0,
      maxPlayers: maxPlayers || 2
    };
    socket.join(roomId);
    socket.emit("roomCreated", { roomId });
  });

  socket.on("joinRoom", ({ roomId }) => {
    const room = rooms[roomId];
    if (room && room.players.length < room.maxPlayers) {
      room.players.push(socket.id);
      socket.join(roomId);
      io.to(roomId).emit("startGame", {
        board: room.board,
        currentPlayer: room.players[room.turn]
      });
    } else {
      socket.emit("errorMessage", "Room full or not found.");
    }
  });

  socket.on("makeMove", ({ roomId, col }) => {
    const room = rooms[roomId];
    if (!room || !room.players.includes(socket.id)) return;
    if (room.players[room.turn] !== socket.id) return;

    const board = room.board;
    for (let row = board.length - 1; row >= 0; row--) {
      if (!board[row][col]) {
        const playerSymbol = room.players.indexOf(socket.id) === 0 ? "X" : "O";
        board[row][col] = playerSymbol;

        const winner = checkWin(board, playerSymbol);
        if (winner) {
          io.to(roomId).emit("gameOver", { winner: socket.id, board });
        } else {
          room.turn = (room.turn + 1) % room.players.length;
          io.to(roomId).emit("updateBoard", {
            board,
            currentPlayer: room.players[room.turn]
          });
        }
        return;
      }
    }
  });

  socket.on("disconnect", () => {
    for (let roomId in rooms) {
      const room = rooms[roomId];
      const index = room.players.indexOf(socket.id);
      if (index !== -1) {
        room.players.splice(index, 1);
        io.to(roomId).emit("playerLeft", socket.id);
        if (room.players.length === 0) {
          delete rooms[roomId];
        }
        break;
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Connect 4 server running on port ${PORT}`);
});
