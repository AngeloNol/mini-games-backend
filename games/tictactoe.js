// backend/tictactoe.js
const { Server } = require("socket.io");

function initializeTicTacToe(server) {
  const io = new Server(server);

  // Store game states by roomId
  const games = new Map();

  io.on("connection", (socket) => {
    console.log("New client connected: " + socket.id);

    socket.on("joinRoom", ({ roomId }) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);

      // Initialize game if first player
      if (!games.has(roomId)) {
        games.set(roomId, {
          board: Array(9).fill(null), // 3x3 board flat array
          players: [socket.id], // player X is first to join
          turn: socket.id,      // X starts
          symbols: { [socket.id]: "X" }, 
          gameOver: false
        });
        socket.emit("waitingForOpponent");
        console.log(`Created new game in room ${roomId}`);
      } else {
        // Second player joins
        const game = games.get(roomId);

        if (game.players.length < 2) {
          game.players.push(socket.id);
          game.symbols[socket.id] = "O"; // second player is O
          game.turn = game.players[0];   // X always starts

          // Notify both players game starts
          io.to(roomId).emit("startGame", { 
            board: game.board,
            turn: game.turn,
            symbols: game.symbols
          });
          console.log(`Game started in room ${roomId} with players:`, game.players);
        } else {
          // Room full
          socket.emit("roomFull");
          console.log(`Socket ${socket.id} tried to join full room ${roomId}`);
        }
      }
    });

    socket.on("makeMove", ({ roomId, index }) => {
      const game = games.get(roomId);
      if (!game || game.gameOver) return;

      // Check if it's this player's turn and the spot is empty
      if (socket.id === game.turn && game.board[index] === null) {
        const symbol = game.symbols[socket.id];
        game.board[index] = symbol;

        // Check for win or draw
        if (checkWin(game.board, symbol)) {
          game.gameOver = true;
          io.to(roomId).emit("gameOver", { winner: socket.id, board: game.board });
          console.log(`Game over! Winner: ${socket.id} in room ${roomId}`);
        } else if (game.board.every(cell => cell !== null)) {
          game.gameOver = true;
          io.to(roomId).emit("gameOver", { winner: null, board: game.board }); // draw
          console.log(`Game over! Draw in room ${roomId}`);
        } else {
          // Switch turn
          game.turn = game.players.find(id => id !== socket.id);
          io.to(roomId).emit("updateBoard", { board: game.board, turn: game.turn });
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected: " + socket.id);
      // Optional: Handle player leaving mid-game and cleanup
    });
  });

  // Helper: Win conditions
  function checkWin(board, symbol) {
    const winPatterns = [
      [0,1,2], [3,4,5], [6,7,8], // rows
      [0,3,6], [1,4,7], [2,5,8], // cols
      [0,4,8], [2,4,6]           // diagonals
    ];

    return winPatterns.some(pattern =>
      pattern.every(idx => board[idx] === symbol)
    );
  }
}

module.exports = initializeTicTacToe;
