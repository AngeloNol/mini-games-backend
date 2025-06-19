// games/tictactoe.js
module.exports = function initializeTicTacToe(io) {
  const games = new Map();

  io.on("connection", (socket) => {
    socket.on("joinRoom", ({ game, roomId }) => {
      if (game !== "tictactoe") return;

      socket.join(roomId);
      socket.roomId = roomId;

      // Create new game if it doesn't exist
      if (!games.has(roomId)) {
        games.set(roomId, {
          players: [socket],
          board: Array(9).fill(null),
          currentTurn: 0,
          finished: false,
        });
        socket.emit("waitingForOpponent");
      } else {
        const game = games.get(roomId);
        if (game.players.length >= 2) return;

        game.players.push(socket);

        // Notify both players to start the game
        game.players.forEach((playerSocket, idx) => {
          playerSocket.emit("startGame", {
            symbol: idx === 0 ? "X" : "O",
            turn: idx === game.currentTurn,
          });
        });
      }
    });

    socket.on("makeMove", ({ roomId, index }) => {
      const game = games.get(roomId);
      if (!game || game.finished) return;

      const playerIndex = game.players.indexOf(socket);
      if (playerIndex !== game.currentTurn || game.board[index]) return;

      const symbol = playerIndex === 0 ? "X" : "O";
      game.board[index] = symbol;

      const winner = checkWinner(game.board);
      const isDraw = !winner && game.board.every(cell => cell !== null);

      if (winner) {
        game.finished = true;
        game.players.forEach((playerSocket, idx) => {
          playerSocket.emit("gameOver", {
            result: winner === (idx === 0 ? "X" : "O") ? "win" : "lose",
            board: game.board,
          });
        });
      } else if (isDraw) {
        game.finished = true;
        game.players.forEach(playerSocket => {
          playerSocket.emit("gameOver", {
            result: "draw",
            board: game.board,
          });
        });
      } else {
        game.currentTurn = 1 - game.currentTurn;
        game.players.forEach(playerSocket => {
          playerSocket.emit("updateBoard", {
            board: game.board,
            turn: game.currentTurn === game.players.indexOf(playerSocket),
          });
        });
      }
    });

    socket.on("disconnect", () => {
      const roomId = socket.roomId;
      const game = games.get(roomId);
      if (!game) return;

      game.players.forEach(playerSocket => {
        if (playerSocket.id !== socket.id) {
          playerSocket.emit("opponentDisconnected");
        }
      });

      games.delete(roomId);
    });
  });
};

// Returns "X", "O", or null
function checkWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6],            // diagonals
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  return null;
}
