module.exports = function setupTicTacToe(io, socket) {
  // Store rooms data: { roomId: { board, players, turn } }
  const rooms = setupTicTacToe.rooms || {};
  setupTicTacToe.rooms = rooms;

  socket.on('joinRoom', ({ roomId, game }) => {
    if (game !== 'tictactoe') return;
    socket.join(roomId);

    if (!rooms[roomId]) {
      // Initialize room state
      rooms[roomId] = {
        board: Array(9).fill(null),
        players: [],
        turn: 0, // index of player whose turn it is
        winner: null,
      };
    }

    const room = rooms[roomId];
    if (room.players.length < 2 && !room.players.includes(socket.id)) {
      room.players.push(socket.id);
    }

    // Notify players of current state
    io.to(roomId).emit('gameState', {
      board: room.board,
      turn: room.turn,
      playersCount: room.players.length,
      winner: room.winner,
    });
  });

  socket.on('gameMove', ({ roomId, move }) => {
    const room = rooms[roomId];
    if (!room) return;

    const playerIndex = room.players.indexOf(socket.id);
    if (playerIndex === -1) return; // player not in room
    if (room.winner) return; // game over
    if (room.turn !== playerIndex) return; // not player's turn

    // Validate move
    if (room.board[move] !== null || move < 0 || move >= 9) return;

    // Update board: player 0 is 'X', player 1 is 'O'
    room.board[move] = playerIndex === 0 ? 'X' : 'O';

    // Check winner
    room.winner = checkWinner(room.board);

    if (!room.winner) {
      room.turn = 1 - room.turn; // switch turn
    }

    io.to(roomId).emit('gameState', {
      board: room.board,
      turn: room.turn,
      winner: room.winner,
    });
  });

  socket.on('disconnect', () => {
    // Remove player from any rooms
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const idx = room.players.indexOf(socket.id);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        // Reset game if a player leaves
        delete rooms[roomId];
        io.to(roomId).emit('gameEnd', { message: 'Player disconnected, game ended.' });
      }
    }
  });

  // Helper: Check winner combinations
  function checkWinner(board) {
    const lines = [
      [0,1,2],[3,4,5],[6,7,8],  // rows
      [0,3,6],[1,4,7],[2,5,8],  // cols
      [0,4,8],[2,4,6]           // diagonals
    ];
    for (const [a,b,c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a]; // 'X' or 'O'
      }
    }
    if (board.every(cell => cell !== null)) return 'draw';
    return null;
  }
};
