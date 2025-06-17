const initializeTicTacToe = (io) => {
  const games = new Map();

  io.on("connection", (socket) => {
    socket.on("joinRoom", ({ game, roomId }) => {
      if (game !== "tictactoe") return;

      socket.join(roomId);
      if (!games.has(roomId)) {
        games.set(roomId, { players: [socket], board: Array(9).fill(null), turn: "X" });
      } else {
        const gameData = games.get(roomId);
        if (gameData.players.length >= 2) return;

        gameData.players.push(socket);

        // Assign roles
        const [playerX, playerO] = gameData.players;
        playerX.emit("startGame", { symbol: "X" });
        playerO.emit("startGame", { symbol: "O" });
      }

      socket.on("makeMove", ({ index }) => {
        const gameData = games.get(roomId);
        if (!gameData || gameData.board[index]) return;

        const currentSymbol = gameData.turn;
        gameData.board[index] = currentSymbol;
        gameData.turn = currentSymbol === "X" ? "O" : "X";

        io.to(roomId).emit("moveMade", {
          index,
          symbol: currentSymbol,
          board: gameData.board
        });

        if (checkWinner(gameData.board)) {
          io.to(roomId).emit("gameOver", { winner: currentSymbol });
          games.delete(roomId);
        } else if (gameData.board.every(cell => cell)) {
          io.to(roomId).emit("gameOver", { winner: null }); // draw
          games.delete(roomId);
        }
      });

      socket.on("disconnect", () => {
        const gameData = games.get(roomId);
        if (gameData) {
          io.to(roomId).emit("opponentDisconnected");
          games.delete(roomId);
        }
      });
    });
  });

  function checkWinner(board) {
    const wins = [
      [0,1,2], [3,4,5], [6,7,8],
      [0,3,6], [1,4,7], [2,5,8],
      [0,4,8], [2,4,6]
    ];
    return wins.some(([a,b,c]) =>
      board[a] && board[a] === board[b] && board[a] === board[c]
    );
  }
};

module.exports = initializeTicTacToe;
