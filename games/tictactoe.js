// backend/tictactoe.js
module.exports = function initializeTicTacToe(io) {
  const games = new Map();

  io.on("connection", (socket) => {
    socket.on("joinRoom", ({ game, roomId }) => {
      if (game !== "tictactoe") return;

      socket.join(roomId);
      socket.roomId = roomId;

      if (!games.has(roomId)) {
        games.set(roomId, {
          players: [socket],
          board: Array(9).fill(null),
          currentTurn: 0,
        });
        socket.emit("waitingForOpponent");
      } else {
        const gameData = games.get(roomId);
        if (gameData.players.length >= 2) return;

        gameData.players.push(socket);

        // Notify both players
        gameData.players.forEach((playerSocket, index) => {
          playerSocket.emit("startGame", {
            symbol: index === 0 ? "X" : "O",
            turn: gameData.currentTurn === index,
          });
        });
      }
    });

    socket.on("makeMove", ({ roomId, index }) => {
      const gameData = games.get(roomId);
      if (!gameData) return;

      const playerIndex = gameData.players.indexOf(socket);
      if (playerIndex !== gameData.currentTurn || gameData.board[index]) return;

      gameData.board[index] = playerIndex === 0 ? "X" : "O";
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
        gameData.players.forEach((skt) => {
          if (skt.id !== socket.id) {
            skt.emit("opponentDisconnected");
          }
        });
        games.delete(roomId);
      }
    });
  });
};
