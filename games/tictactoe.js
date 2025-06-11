const rooms = {};

function generateRoomId() {
  return Math.random().toString(36).substr(2, 6);
}

function tictactoe(io, socket) {
  socket.on('tictactoe-create-room', () => {
    const roomId = generateRoomId();
    rooms[roomId] = {
      board: Array(9).fill(null),
      players: [socket.id],
      currentPlayerIndex: 0,
      symbols: { [socket.id]: 'X' },
      gameOver: false,
    };
    socket.join(roomId);
    socket.emit('tictactoe-room-created', { roomId });
  });

  socket.on('tictactoe-join-room', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) {
      socket.emit('tictactoe-error', 'Room does not exist.');
      return;
    }
    if (room.players.length >= 2) {
      socket.emit('tictactoe-error', 'Room is full.');
      return;
    }
    room.players.push(socket.id);
    room.symbols[socket.id] = 'O';
    socket.join(roomId);

    io.to(roomId).emit('tictactoe-room-joined', { roomId });
    io.to(roomId).emit('tictactoe-update', {
      board: room.board,
      currentPlayer: room.players[room.currentPlayerIndex]
    });
  });

  socket.on('tictactoe-make-move', ({ roomId, index }) => {
    const room = rooms[roomId];
    if (!room || room.gameOver) return;

    if (socket.id !== room.players[room.currentPlayerIndex]) {
      socket.emit('tictactoe-error', 'Not your turn.');
      return;
    }

    if (room.board[index]) {
      socket.emit('tictactoe-error', 'Cell already occupied.');
      return;
    }

    room.board[index] = room.symbols[socket.id];

    // Check winner
    const winner = checkWinner(room.board);

    if (winner) {
      room.gameOver = true;
      io.to(roomId).emit('tictactoe-game-over', {
        board: room.board,
        winner
      });
      return;
    }

    // Check draw
    if (room.board.every(cell => cell !== null)) {
      room.gameOver = true;
      io.to(roomId).emit('tictactoe-game-over', {
        board: room.board,
        winner: null
      });
      return;
    }

    // Switch turn
    room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;

    io.to(roomId).emit('tictactoe-update', {
      board: room.board,
      currentPlayer: room.players[room.currentPlayerIndex]
    });
  });

  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (rooms[roomId]) {
        const room = rooms[roomId];
        const idx = room.players.indexOf(socket.id);
        if (idx !== -1) {
          room.players.splice(idx, 1);
          room.gameOver = true;
          io.to(roomId).emit('tictactoe-game-over', { board: room.board, winner: null, message: "A player disconnected. Game ended." });
          delete rooms[roomId];
        }
      }
    }
  });
}

// Helper to check winner
function checkWinner(board) {
  const lines = [
    [0,1,2], [3,4,5], [6,7,8], // rows
    [0,3,6], [1,4,7], [2,5,8], // columns
    [0,4,8], [2,4,6]           // diagonals
  ];
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]; // 'X' or 'O'
    }
  }
  return null;
}

module.exports = tictactoe;
