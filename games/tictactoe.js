module.exports = function initializeTicTacToe(io) {
  const rooms = new Map();

  io.on("connection", (socket) => {
    socket.on("joinRoom", ({ game, roomId }) => {
      if (game !== "tictactoe") return;

      let room = rooms.get(roomId);
      if (!room) {
        room = {
          players: [socket.id],
          currentTurn: "X",
          board: Array(9).fill(null),
        };
        rooms.set(roomId, room);
      } else if (room.players.length === 1) {
        room.players.push(socket.id);

        io.to(room.players[0]).emit("startGame", { symbol: "X" });
        io.to(room.players[1]).emit("startGame", { symbol: "O" });
      } else {
        socket.emit("errorMsg", { message: "Room full" });
        return;
      }

      socket.join(roomId);
      socket.data.roomId = roomId;

      socket.on("makeMove", ({ index }) => {
        const room = rooms.get(roomId);
        if (!room) return;

        const playerIndex = room.players.indexOf(socket.id);
        if (playerIndex === -1) return;

        const symbol = playerIndex === 0 ? "X" : "O";
        if (symbol !== room.currentTurn || room.board[index]) return;

        room.board[index] = symbol;
        room.currentTurn = symbol === "X" ? "O" : "X";

        io.to(roomId).emit("moveMade", {
          index,
          symbol,
          board: room.board,
        });

        const winner = checkWinner(room.board);
        if (winner || room.board.every(cell => cell)) {
          io.to(roomId).emit("gameOver", { winner });
          rooms.delete(roomId);
        }
      });

      socket.on("disconnect", () => {
        const roomId = socket.data.roomId;
        const room = rooms.get(roomId);
        if (!room) return;

        const opponentId = room.players.find((id) => id !== socket.id);
        if (opponentId) {
          io.to(opponentId).emit("opponentDisconnected");
        }

        rooms.delete(roomId);
      });
    });
  });

  function checkWinner(board) {
    const lines = [
      [0,1,2], [3,4,5], [6,7,8], // Rows
      [0,3,6], [1,4,7], [2,5,8], // Columns
      [0,4,8], [2,4,6],          // Diagonals
    ];

    for (let [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a]; // 'X' or 'O'
      }
    }

    return null;
  }
};
