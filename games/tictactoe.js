// backend/tictactoe.js

const { Server } = require("socket.io");

// Holds game state per room
const tictactoeRooms = {};

function createEmptyBoard() {
  return Array(9).fill(null);
}

function checkWinner(board) {
  const winPatterns = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6],
  ];

  for (let pattern of winPatterns) {
    const [a,b,c] = pattern;
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return board[a];
    }
  }

  return board.every(cell => cell !== null) ? 'draw' : null;
}

function handleTicTacToe(io, socket) {
  socket.on("joinRoom", ({ roomId, game }) => {
    if (game !== "tictactoe") return;

    if (!tictactoeRooms[roomId]) {
      tictactoeRooms[roomId] = {
        players: [],
        board: createEmptyBoard(),
        currentTurn: 0, // index of current player's turn
      };
    }

    const room = tictactoeRooms[roomId];

    if (room.players.length >= 2) {
      socket.emit("roomFull");
      return;
    }

    const playerId = room.players.length;
    room.players.push(socket.id);
    socket.join(roomId);
    socket.emit("roomJoined", { game: "tictactoe", roomId, playerId });

    if (room.players.length === 2) {
      io.to(roomId).emit("gameStart", {
        board: room.board,
        currentTurn: room.currentTurn
      });
    }
  });

  socket.on("makeMove", ({ roomId, index }) => {
    const room = tictactoeRooms[roomId];
    if (!room) return;

    const playerIndex = room.players.indexOf(socket.id);
    if (playerIndex !== room.currentTurn || room.board[index] !== null) return;

    room.board[index] = playerIndex;
    const winner = checkWinner(room.board);

    if (winner !== null) {
      io.to(roomId).emit("gameOver", { board: room.board, winner });
      delete tictactoeRooms[roomId];
    } else {
      room.currentTurn = 1 - room.currentTurn;
      io.to(roomId).emit("gameUpdate", {
        board: room.board,
        currentTurn: room.currentTurn
      });
    }
  });

  socket.on("disconnect", () => {
    for (const roomId in tictactoeRooms) {
      const room = tictactoeRooms[roomId];
      room.players = room.players.filter(p => p !== socket.id);

      if (room.players.length === 0) {
        delete tictactoeRooms[roomId];
      }
    }
  });
}

module.exports = handleTicTacToe;
