// backend/tictactoe.js
module.exports = function initializeTicTacToe(io) {
  const games = new Map();

  io.on("connection", (socket) => {
    socket.on("joinRoom", ({ game, roomId }) => {
      if (game !== "tictactoe") return;

      socket.join(roomId);
      socket.roomId = roomId;

      if (!games.has(roomId)) {
        // Create a new game
        games.set(roomId, {
          players: [],
          board: Array(9).fill(null),
          currentTurn: 0,
        });
      }

      const gameData = games.get(roomId);

      if (gameData.players.length >= 2) {
        socket.emit("errorMsg", { message: "Room is full." });
        return;
      }

      gameData.players.push(socket);
      const playerIndex = gameData.players.indexOf(socket);
      socket.symbol = playerIndex === 0 ? "X" : "O";

      if (gameData.players.length === 1) {
        socket.emit("waitingForOpponent");
      } else if (gameData.players.length === 2) {
        // Start the game for both players
        gameData.players.forEach((playerSocket, idx) => {
          playerSocket.emit("startGame", {
            symbol: playerSocket.symbol,
            turn: gameData.currentTurn === idx,
          });
        });
      }
    });

    socket.on("makeMove", ({ roomId, index }) => {
      const gameData = games.get(roomId);
      if (!gameData) return;

      const playerIndex = gameData.players.indexOf(socket);
      if (playerIndex !== gameData.currentTurn || gameData.board[index]) return;

      gameData.board[index] = socket.symbol;
      gameData.currentTurn = 1 - gameData.currentTurn;

      gameData.players.forEach((playerSocket) => {
        playerSocket.emit("updateBoard", {
          board: gameData.board,
          nextTurn: gameData.currentTurn,
        });
      });
    });

    socket.on("disconnect", () => {
      const roomId = socket.roomId;
      if (!roomId) return;

      const gameData = games.get(roomId);
      if (gameData) {
        // Remove the disconnected player
        gameData.players = gameData.players.filter((skt) => skt.id !== socket.id);

        // Notify the remaining player
        gameData.players.forEach((skt) => {
          skt.emit("opponentDisconnected");
        });

        // Clean up if no players left
        if (gameData.players.length === 0) {
          games.delete(roomId);
        }
      }
    });
  });
};
