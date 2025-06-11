module.exports = function setupConnect4(io, socket) {
  // Rooms data: { roomId: { board, players, turn, winner, playerCount } }
  const rooms = setupConnect4.rooms || {};
  setupConnect4.rooms = rooms;

  socket.on('joinRoom', ({ roomId, game }) => {
    if (game !== 'connect4') return;
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        board: Array(6).fill(null).map(() => Array(7).fill(null)), // 6 rows x 7 cols
        players: [],
        turn: 0,
        winner: null,
      };
    }

    const room = rooms[roomId];
    if (room.players.length < 4 && !room.players.includes(socket.id)) {
      room.players.push(socket.id);
    }

    io.to(roomId).emit('gameState', {
      board: room.board,
      turn: room.turn,
      playersCount: room.players.length,
      winner: room.winner,
    });
  });

  socket.on('gameMove', ({ roomId, column }) => {
    const room = rooms[roomId];
    if (!room) return;

    const playerIndex = room.players.indexOf(socket.id);
    if (playerIndex === -1) return; // player not in room
    if (room.winner) return; // game ended
    if (room.turn !== playerIndex) return; // not player's turn

    // Place disc in column - find the lowest empty row
    for (let row = 5; row >= 0; row--) {
      if (room.board[row][column] === null) {
        room.board[row][column] = playerIndex; // store player index for disc color
        break;
      }
      if (row === 0) return; // column full, invalid move
    }

    // Check if this move wins
    room.winner = checkWinner(room.board);

    if (!room.winner) {
      room.turn = (room.turn + 1) % room.players.length;
    }

    io.to(roomId).emit('gameState', {
      board: room.board,
      turn: room.turn,
      winner: room.winner,
    });
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const idx = room.players.indexOf(socket.id);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        // End game if a player leaves
        delete rooms[roomId];
        io.to(roomId).emit('gameEnd', { message: 'Player disconnected, game ended.' });
      }
    }
  });

  // Check for Connect4 winner - horizontal, vertical, diagonal
  function checkWinner(board) {
    const rows = 6;
    const cols = 7;

    function checkDirection(r, c, dr, dc) {
      const player = board[r][c];
      if (player === null) return false;
      for (let i = 1; i < 4; i++) {
        const nr = r + dr * i;
        const nc = c + dc * i;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return false;
        if (board[nr][nc] !== player) return false;
      }
      return true;
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (
          checkDirection(r, c, 0, 1) ||    // horizontal
          checkDirection(r, c, 1, 0) ||    // vertical
          checkDirection(r, c, 1, 1) ||    // diagonal down-right
          checkDirection(r, c, 1, -1)      // diagonal down-left
        ) {
          return board[r][c];
        }
      }
    }

    // Check for draw
    const isDraw = board.every(row => row.every(cell => cell !== null));
    if (isDraw) return 'draw';

    return null;
  }
};
