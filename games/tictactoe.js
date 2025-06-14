const { Server } = require("socket.io");

const rooms = new Map();

function initializeTicTacToe(io) {
  io.on("connection", (socket) => {
    socket.on("joinRoom", ({ game, roomId }) => {
      if (game !== "tictactoe") return;

      let room = rooms.get(roomId);

      if (!room) {
        room = {
          players: [],
          board: Array(9).fill(null),
          currentTurn: "X",
        };
        rooms.set(roomId, room);
      }

      if (room.players.length >= 2) {
        socket.emit("errorMsg", { message: "Room is full" });
        return;
      }

      const symbol = room.players.length === 0 ? "X" : "O";
      room.players.push({ id: socket.id, symbol });
      socket.join(roomId);

      if (room.players.length === 2) {
        const [playerX, playerO] = room.players;
        io.to(playerX.id).emit("tictactoeStart", {
          symbol: "X",
          firstTurn: room.currentTurn,
        });
        io.to(playerO.id).emit("tictactoeStart", {
          symbol: "O",
          firstTurn: room.currentTurn,
        });
      }
    });

    socket.on("tictactoeMove", ({ roomId, index }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const player = room.players.find((p) => p.id === socket.id);
      if (!player || room.board[index] !== null) return;
      if (player.symbol !== room.currentTurn) return;

      // Make the move
      room.board[index] = player.symbol;

      // Broadcast move
      io.to(roomId).emit("tictactoeMove", {
        index,
        symbol: player.symbol,
      });

      // Check for win/draw
      const winner = checkWin(room.board);
      if (winner) {
        io.to(roomId).emit("gameOver", {
          winner,
          board: room.board,
        });
        rooms.delete(roomId);
        return;
      }

      if (room.board.every((cell) => cell)) {
        io.to(roomId).emit("gameOver", {
          winner: null,
          board: room.board,
        });
        rooms.delete(roomId);
        return;
      }

      // Switch turn
      room.currentTurn = room.currentTurn === "X" ? "O" : "X";
    });

    socket.on("disconnect", () => {
      for (const [roomId, room] of rooms.entries()) {
        const index = room.players.findIndex((p) => p.id === socket.id);
        if (index !== -1) {
          room.players.splice(index, 1);
          io.to(roomId).emit("errorMsg", {
            message: "Opponent disconnected.",
          });
          rooms.delete(roomId);
          break;
        }
      }
    });
  });
}

// Helper to check winning conditions
function checkWin(board) {
  const winPatterns = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // rows
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // cols
    [0, 4, 8],
    [2, 4, 6], // diagonals
  ];

  for (const [a, b, c] of winPatterns) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return board[a];
    }
  }

  return null;
}

module.exports = initializeTicTacToe;
